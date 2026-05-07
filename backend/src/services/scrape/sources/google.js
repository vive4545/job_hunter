import puppeteer from 'puppeteer';

export async function scrapeGoogleJobs({ query, logger, platform = 'google' }) {
  const q = String(query || '').trim();
  if (!q) return { jobs: [] };

  const num = clampInt(process.env.GOOGLE_RESULTS || '20', 1, 40);
  const hl = (process.env.GOOGLE_HL || 'en').trim() || 'en';

  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=${num}&hl=${hl}&pws=0&gl=in`;

  logger?.info({ url, platform }, 'Starting Google Puppeteer scrape');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 1000 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for search results
    await page.waitForSelector('h3', { timeout: 15000 }).catch(async () => {
      logger?.warn('Google search results (h3) not found within timeout');
      await page.screenshot({ path: `/Users/pytherinnovations_1/.gemini/antigravity/brain/3d28ca0a-e764-40e1-9d81-e348ec01c0df/google_error_${platform}.png` });
    });

    const jobs = await page.evaluate((platformName) => {
      const results = [];
      // Common selectors for Google search result blocks
      const blocks = document.querySelectorAll('div.g, div.yuRUbf, .MjjYud');
      
      blocks.forEach(block => {
        const titleEl = block.querySelector('h3');
        const linkEl = block.querySelector('a[href]');
        
        if (!titleEl || !linkEl) return;

        const href = linkEl.href;
        // Filter out ads and google-internal links
        if (!href || href.includes('google.com') || href.includes('googleadservices.com')) return;

        const title = titleEl.innerText.trim();
        if (!title || title.length < 8) return;

        // Try to find a description/snippet
        // Varies: .VwiC3b is common for snippets
        const snippetEl = block.querySelector('.VwiC3b, .yXK7Cc, .st, span[style*="webkit-line-clamp"]');
        const description = snippetEl ? snippetEl.innerText.trim() : '';

        results.push({
          source: platformName,
          title: title.slice(0, 140),
          company: '', // Often hard to parse from SERP reliably
          location: '',
          description: description.slice(0, 700),
          applyUrl: href
        });
      });

      // Dedupe
      const unique = [];
      const urls = new Set();
      for (const j of results) {
        // Simple dedupe and cleanup
        try {
          const u = new URL(j.applyUrl);
          // Remove common tracking params
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(k => u.searchParams.delete(k));
          const clean = u.toString();
          if (!urls.has(clean)) {
            urls.add(clean);
            unique.push({ ...j, applyUrl: clean });
          }
        } catch {
          if (!urls.has(j.applyUrl)) {
            urls.add(j.applyUrl);
            unique.push(j);
          }
        }
      }
      return unique;
    }, platform);

    logger?.info({ platform, count: jobs.length }, 'Google platform scrape complete');
    return { jobs };

  } catch (err) {
    logger?.error({ err, platform }, 'Google Puppeteer scrape failed');
    return { jobs: [] };
  } finally {
    if (browser) await browser.close();
  }
}

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

async function scrapeDuckDuckGoJobs({ query, logger, platform }) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  logger?.info({ url, platform }, 'Starting DuckDuckGo fallback scrape');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const jobs = await page.evaluate((platformName) => {
      const results = [];
      const links = document.querySelectorAll('a.result__a');
      links.forEach(link => {
        const title = link.innerText.trim();
        const href = link.href;
        if (!title || !href || href.includes('duckduckgo.com')) return;

        const snippet = link.closest('.result')?.querySelector('.result__snippet')?.innerText.trim() || '';

        results.push({
          source: platformName,
          title: title.slice(0, 140),
          company: '',
          location: '',
          description: snippet.slice(0, 700),
          applyUrl: href
        });
      });
      return results;
    }, platform);

    return jobs;
  } catch (err) {
    logger?.error({ err, platform }, 'DuckDuckGo fallback failed');
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

// Update the export to use the fallback
const originalScrapeGoogleJobs = scrapeGoogleJobs;
export async function scrapeGoogleJobsWithFallback(args) {
  const res = await originalScrapeGoogleJobs(args);
  if (res.jobs.length === 0) {
    const fallbackJobs = await scrapeDuckDuckGoJobs(args);
    return { jobs: fallbackJobs.slice(0, 20) };
  }
  return res;
}
