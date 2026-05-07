import { loadEnv } from '../env.js';
import puppeteer from 'puppeteer';
import { Job } from '../models/Job.js';
import { connectToDb } from '../db.js';

/**
 * Safe assist:
 * - opens shortlisted jobs in tabs
 * - prints/copies AI message for manual paste
 * - does NOT auto-submit any forms
 */

const limit = Number(process.env.ASSIST_OPEN_LIMIT || 5);

loadEnv();
await connectToDb({ logger: console });

const jobs = await Job.find({
  status: { $in: ['shortlisted', 'new'] }
})
  .sort({ updatedAt: -1 })
  .limit(limit)
  .lean();

if (jobs.length === 0) {
  console.log('No jobs to open.');
  process.exit(0);
}

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

for (const job of jobs) {
  console.log('\n==============================');
  console.log(`${job.title} — ${job.company || ''}`.trim());
  console.log(job.applyUrl);
  if (job.ai?.message) {
    console.log('\nSuggested message:\n');
    console.log(job.ai.message);
  } else {
    console.log('\nNo AI message stored for this job yet.');
  }

  await page.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
}

console.log('\nDone opening pages. Close the browser when finished applying.');

