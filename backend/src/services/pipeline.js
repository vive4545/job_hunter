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
            description: item.description || ''
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
        const filter = evaluateFilters(job);
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

