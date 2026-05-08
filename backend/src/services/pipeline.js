import pLimit from 'p-limit';

import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { loadSourcesAndScrape } from './scrape/sources.js';
import { evaluateFilters } from './scoring/filter.js';
import { scoreAts } from './scoring/ats.js';
import { generateMessageIfEnabled } from './text/aiMessage.js';

export async function runPipeline({ logger }) {
  const startedAt = new Date();
  const resume = (await Resume.findOne().sort({ updatedAt: -1 }).lean()) || {
    skills: [],
    text: ''
  };

  const scraped = await loadSourcesAndScrape({ logger });
  const upserted = [];

  for (const item of scraped.jobs) {
    try {
      const doc = await Job.findOneAndUpdate(
        { applyUrl: item.applyUrl },
        {
          $setOnInsert: {
            source: item.source,
            applyUrl: item.applyUrl,
            scrapedAt: new Date()
          },
          $set: {
            title: item.title,
            company: item.company || '',
            location: item.location || '',
            description: item.description || '',
            salary: item.salary || '',
            experience: item.experience || '',
            ...parseExperience(item.experience),
            ...parseSalary(item.salary)
          }
        },
        { upsert: true, new: true }
      );
      upserted.push(doc);
    } catch (err) {
      logger?.warn({ err, applyUrl: item.applyUrl }, 'job upsert failed');
    }
  }

  const limit = pLimit(2);
  let evaluated = 0;
  let shortlisted = 0;
  let aiGenerated = 0;

  await Promise.all(
    upserted.map((job) =>
      limit(async () => {
        const filter = evaluateFilters(job, resume);
        const ats = scoreAts({ job, resume });
        const status =
          filter.passed && ats.score >= Number(process.env.ATS_MIN_SCORE || 55)
            ? 'shortlisted'
            : job.status === 'applied' ||
                job.status === 'interview' ||
                job.status === 'rejected'
              ? job.status
              : 'new';

        const ai = await generateMessageIfEnabled({ job, resume, ats, logger });

        const updated = await Job.findByIdAndUpdate(
          job._id,
          {
            $set: {
              filter,
              ats,
              ...(ai ? { ai } : {}),
              status
            }
          },
          { new: true }
        ).lean();

        evaluated += 1;
        if (updated?.status === 'shortlisted') shortlisted += 1;
        if (updated?.ai?.message) aiGenerated += 1;
      })
    )
  );

  return {
    ok: true,
    startedAt,
    finishedAt: new Date(),
    sources: scraped.sources,
    counts: {
      scraped: scraped.jobs.length,
      upserted: upserted.length,
      evaluated,
      shortlisted,
      aiGenerated
    }
  };
}

function parseExperience(str) {
  if (!str) return {};
  const s = str.toLowerCase();
  // Match "1-4 Yrs" or "1 to 4 years"
  const rangeMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return { minExperience: Number(rangeMatch[1]), maxExperience: Number(rangeMatch[2]) };
  }
  // Match "5+ years" or "5 years"
  const plusMatch = s.match(/(\d+(?:\.\d+)?)\s*\+?\s*years?/);
  if (plusMatch) {
    const n = Number(plusMatch[1]);
    return { minExperience: n, maxExperience: n + 2 };
  }
  return {};
}

function parseSalary(str) {
  if (!str || str.toLowerCase().includes('not disclosed')) return {};
  const s = str.replace(/,/g, '').toLowerCase();
  
  // Extract numbers
  const nums = s.match(/(\d+(?:\.\d+)?)/g);
  if (!nums) return {};

  let min = Number(nums[0]);
  let max = nums[1] ? Number(nums[1]) : min;

  // Normalization logic
  const isMonthly = s.includes('month') || s.includes('pm') || (min > 5000); // 5000+ is likely monthly INR
  const isLakhs = s.includes('lac') || s.includes('lakh') || (min < 100); // < 100 is likely Lakhs PA

  if (isMonthly) {
    // Convert monthly to annual Lakhs
    min = (min * 12) / 100000;
    max = (max * 12) / 100000;
  } else if (!isLakhs && min > 1000) {
    // Likely annual in INR (e.g. 600000)
    min = min / 100000;
    max = max / 100000;
  }

  return { minSalary: min, maxSalary: max };
}



