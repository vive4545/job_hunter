import puppeteer from 'puppeteer';

export async function scrapeInternshala({ query, logger }) {
  const q = String(query || '').trim();
  if (!q) return { jobs: [] };

  // Internshala has specific URLs for jobs, e.g., https://internshala.com/jobs/mern-stack-developer-jobs
  // We'll try to use a search URL if possible or just the mern-stack-developer-jobs one if that's the focus
  const searchPart = q.replace(/\s+/g, '-').toLowerCase();
  const url = `https://internshala.com/jobs/${searchPart}-jobs`;

  logger?.info({ url, query: q }, 'Starting Internshala Puppeteer scrape');

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

    await page.waitForSelector('.individual_internship', { timeout: 15000 }).catch(() => {
      logger?.warn('Internshala job cards not found within timeout');
    });

    const jobs = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('.individual_internship');
      
      cards.forEach(card => {
        const titleEl = card.querySelector('.job-title-container a');
        const companyEl = card.querySelector('.company-name');
        const locEl = card.querySelector('.location_link');
        
        // Internshala description is often in a specific div
        const detailsEl = card.querySelector('.job-description, .internship_other_details_container');

        if (titleEl && titleEl.href) {
          results.push({
            source: 'internshala',
            title: titleEl.innerText.trim(),
            company: companyEl ? companyEl.innerText.trim() : '',
            location: locEl ? locEl.innerText.trim() : '',
            description: detailsEl ? detailsEl.innerText.trim() : '',
            applyUrl: titleEl.href
          });
        }
      });
      return results;
    });

    logger?.info({ count: jobs.length }, 'Internshala scrape complete');
    return { jobs };

  } catch (err) {
    logger?.error({ err }, 'Internshala Puppeteer scrape failed');
    return { jobs: [] };
  } finally {
    if (browser) await browser.close();
  }
}
