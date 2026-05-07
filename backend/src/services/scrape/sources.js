import { scrapeRemoteOk } from './sources/remoteok.js';
import { scrapeGenericHtml } from './sources/genericHtml.js';
import { scrapeSampleJobs } from './sources/sample.js';
import { scrapeGoogleJobsWithFallback as scrapeGoogleJobs } from './sources/google.js';
import { scrapeSerpApiGoogleJobs } from './sources/serpapi.js';
import { scrapeNaukri } from './sources/naukri.js';
import { scrapeIndeed } from './sources/indeed.js';
import { scrapeInternshala } from './sources/internshala.js';

function parseSourcesEnv() {
  const raw = (process.env.JOB_SOURCES || '').trim();
  if (!raw) {
    return [{ kind: 'sample', query: 'mern' }];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      // Supported formats:
      // - remoteok:mern
      // - html:https://example.com/jobs?q=mern
      // - sample:mern
      // - google:mern+developer+ahmedabad+site:naukri.com
      // - serpapi:mern developer ahmedabad site:naukri.com
      if (entry.startsWith('sample:')) {
        return { kind: 'sample', query: entry.slice('sample:'.length) };
      }
      if (entry.startsWith('naukri:')) {
        return { kind: 'naukri', query: entry.slice('naukri:'.length) };
      }
      if (entry.startsWith('linkedin:')) {
        return { kind: 'google', platform: 'linkedin', query: `${entry.slice('linkedin:'.length)} site:linkedin.com/jobs` };
      }
      if (entry.startsWith('indeed:')) {
        return { kind: 'indeed', query: entry.slice('indeed:'.length) };
      }
      if (entry.startsWith('wellfound:')) {
        return { kind: 'google', platform: 'wellfound', query: `${entry.slice('wellfound:'.length)} site:wellfound.com` };
      }
      if (entry.startsWith('internshala:')) {
        return { kind: 'internshala', query: entry.slice('internshala:'.length) };
      }
      if (entry.startsWith('remoteok:')) {
        return { kind: 'remoteok', query: entry.slice('remoteok:'.length) };
      }
      if (entry.startsWith('google:')) {
        return { kind: 'google', platform: 'google', query: entry.slice('google:'.length) };
      }
      if (entry.startsWith('html:')) {
        return { kind: 'html', url: entry.slice('html:'.length) };
      }
      if (entry.startsWith('http://') || entry.startsWith('https://')) {
        return { kind: 'html', url: entry };
      }
      return { kind: 'sample', query: entry };
    });
}

export async function loadSourcesAndScrape({ logger }) {
  const sources = parseSourcesEnv();
  const jobs = [];

  const concurrencyLimit = 2;
  const chunks = [];
  for (let i = 0; i < sources.length; i += concurrencyLimit) {
    chunks.push(sources.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (s) => {
        try {
          let r = { jobs: [] };
          if (s.kind === 'sample') {
            r = await scrapeSampleJobs({ query: s.query });
          } else if (s.kind === 'google') {
            r = await scrapeGoogleJobs({ query: s.query, platform: s.platform, logger });
          } else if (s.kind === 'serpapi') {
            r = await scrapeSerpApiGoogleJobs({ query: s.query, logger });
          } else if (s.kind === 'naukri') {
            r = await scrapeNaukri({ query: s.query, logger });
          } else if (s.kind === 'indeed') {
            r = await scrapeIndeed({ query: s.query, logger });
          } else if (s.kind === 'internshala') {
            r = await scrapeInternshala({ query: s.query, logger });
          } else if (s.kind === 'remoteok') {
            r = await scrapeRemoteOk({ query: s.query });
          } else if (s.kind === 'html') {
            r = await scrapeGenericHtml({ url: s.url });
          }
          jobs.push(...(r.jobs || []));
        } catch (err) {
          logger?.warn({ err, source: s }, 'source scrape failed');
        }
      })
    );
  }

  if (jobs.length === 0) {
    logger?.warn(
      'No jobs scraped from configured sources. Falling back to sample jobs.'
    );
    const r = await scrapeSampleJobs({ query: 'mern' });
    jobs.push(...r.jobs);
  }

  // Basic normalization/dedupe
  const byUrl = new Map();
  for (const j of jobs) {
    if (!j.applyUrl) continue;
    if (!byUrl.has(j.applyUrl)) byUrl.set(j.applyUrl, j);
  }

  return { sources, jobs: [...byUrl.values()] };
}

