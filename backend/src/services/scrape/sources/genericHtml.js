import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeGenericHtml({ url }) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (JobHunterBot; +https://example.local) axios'
    },
    timeout: 20000
  });

  const $ = cheerio.load(html);
  const jobs = [];

  // Heuristic: collect unique external links that look like job postings.
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href) return;

    const abs = toAbsoluteUrl(url, href);
    if (!abs) return;

    const looksJobby =
      /job|career|position|opening|apply/i.test(text) ||
      /job|career|position|opening|apply/i.test(abs);
    if (!looksJobby) return;

    jobs.push({
      source: `html:${new URL(url).hostname}`,
      title: text || 'Job link',
      company: '',
      location: '',
      description: '',
      applyUrl: abs
    });
  });

  const byUrl = new Map();
  for (const j of jobs) if (!byUrl.has(j.applyUrl)) byUrl.set(j.applyUrl, j);

  return { jobs: [...byUrl.values()].slice(0, 50) };
}

function toAbsoluteUrl(base, href) {
  try {
    if (href.startsWith('javascript:') || href.startsWith('#')) return null;
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

