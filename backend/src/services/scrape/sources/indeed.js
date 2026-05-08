import puppeteer from 'puppeteer';

export async function scrapeIndeed({ query, logger }) {
  const q = String(query || '').trim();
  if (!q) return { jobs: [] };

  // Indeed URL format: https://in.indeed.com/jobs?q=mern+developer&l=Ahmedabad
  const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(q)}&fromage=14`;

  logger?.info({ url, query: q }, 'Starting Indeed Puppeteer scrape');

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

    // Handle initial popups if any
    await page.click('button.icl-CloseButton').catch(() => {});

    await page.waitForSelector('.job_seen_beacon, #mosaic-provider-jobcards', { timeout: 15000 }).catch(() => {
      logger?.warn('Indeed job cards not found within timeout');
    });

    const jobs = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('.job_seen_beacon');
      
      cards.forEach(card => {
        const titleEl = card.querySelector('h2.jobTitle a');
        const companyEl = card.querySelector('[data-testid="company-name"]');
        const locEl = card.querySelector('[data-testid="text-location"]');
        const descEl = card.querySelector('.job-snippet');
        const salaryEl = card.querySelector('.salary-snippet-container, .salary-snippet, .estimated-salary');
        
        // Indeed often puts experience in .attribute_snippet
        const attributes = Array.from(card.querySelectorAll('.attribute_snippet, .metadata.items'));
        const expAttr = attributes.find(el => el.innerText.toLowerCase().includes('year'));

        if (titleEl && titleEl.href) {
          results.push({
            source: 'indeed',
            title: titleEl.innerText.trim(),
            company: companyEl ? companyEl.innerText.trim() : '',
            location: locEl ? locEl.innerText.trim() : '',
            description: descEl ? descEl.innerText.trim() : '',
            experience: expAttr ? expAttr.innerText.trim() : '',
            salary: salaryEl ? salaryEl.innerText.trim() : '',
            applyUrl: titleEl.href
          });
        }
      });
      return results;
    });

    logger?.info({ count: jobs.length }, 'Indeed scrape complete');
    return { jobs };

  } catch (err) {
    logger?.error({ err }, 'Indeed Puppeteer scrape failed');
    return { jobs: [] };
  } finally {
    if (browser) await browser.close();
  }
}
