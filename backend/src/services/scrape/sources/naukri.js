import puppeteer from 'puppeteer';

export async function scrapeNaukri({ query, logger }) {
  const q = String(query || '').trim();
  if (!q) return { jobs: [] };

  // Convert "mern developer ahmedabad" to "mern-developer-jobs-in-ahmedabad"
  // or just use a query param which is safer
  const url = `https://www.naukri.com/jobs-in-india?k=${encodeURIComponent(q)}`;

  logger?.info({ url, query: q }, 'Starting Naukri Puppeteer scrape');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for any likely job card container
    await page.waitForSelector('a.title, .srp-job-tuple, .cust-job-tuple', { timeout: 15000 }).catch(() => {
      logger?.warn('Naukri job cards not found within timeout');
    });

    const jobs = await page.evaluate(() => {
      const results = [];
      // Find all title links and go to their container
      const titles = document.querySelectorAll('a.title');
      
      titles.forEach(titleEl => {
        // Find the nearest container that looks like a job card
        const card = titleEl.closest('.srp-job-tuple, .cust-job-tuple, [role="listitem"], article, div[data-job-id]');
        if (!card) return;

        const companyEl = card.querySelector('a.comp-name, .companyName');
        const locEl = card.querySelector('.locWraper, .location');
        const descEl = card.querySelector('.job-desc, .description');
        const expEl = card.querySelector('span.expwdth, .exp-wrap, .experience');
        const salEl = card.querySelector('span.sal-wrap, .salary-wrap, .salary');

        if (titleEl.href) {
          results.push({
            source: 'naukri',
            title: titleEl.innerText.trim(),
            company: companyEl ? companyEl.innerText.trim() : '',
            location: locEl ? locEl.innerText.trim() : '',
            description: descEl ? descEl.innerText.trim() : '',
            experience: expEl ? expEl.innerText.trim() : '',
            salary: salEl ? salEl.innerText.trim() : '',
            applyUrl: titleEl.href
          });
        }
      });
      // Dedupe by URL in case selectors overlap
      const unique = [];
      const urls = new Set();
      for (const j of results) {
        if (!urls.has(j.applyUrl)) {
          urls.add(j.applyUrl);
          unique.push(j);
        }
      }
      return unique;
    });

    logger?.info({ count: jobs.length }, 'Naukri scrape complete');
    return { jobs };

  } catch (err) {
    logger?.error({ err }, 'Naukri Puppeteer scrape failed');
    return { jobs: [] };
  } finally {
    if (browser) await browser.close();
  }
}
