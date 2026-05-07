import axios from 'axios';

export async function scrapeSerpApiGoogleJobs({ query, logger }) {
  const apiKey = (process.env.SERPAPI_API_KEY || '').trim();
  if (!apiKey) {
    logger?.warn('SERPAPI_API_KEY not set; serpapi source disabled');
    return { jobs: [] };
  }

  const q = String(query || '').trim();
  if (!q) return { jobs: [] };

  const num = clampInt(process.env.GOOGLE_RESULTS || '10', 1, 20);
  const gl = (process.env.GOOGLE_GL || 'in').trim() || 'in';
  const hl = (process.env.GOOGLE_HL || 'en').trim() || 'en';

  const url = 'https://serpapi.com/search.json';

  try {
    const resp = await axios.get(url, {
      params: {
        engine: 'google',
        q,
        num,
        gl,
        hl,
        api_key: apiKey
      },
      timeout: 20000
    });

    const results = resp.data?.organic_results || [];
    const jobs = results
      .map((r) => ({
        title: (r.title || '').trim(),
        link: (r.link || '').trim(),
        snippet: (r.snippet || '').trim()
      }))
      .filter((r) => r.title && r.link)
      .filter((r) => /naukri\.com/i.test(r.link))
      .slice(0, 20)
      .map((r) => ({
        source: 'serpapi:google:naukri',
        title: r.title.slice(0, 140),
        company: '',
        location: '',
        description: r.snippet.slice(0, 700),
        applyUrl: r.link
      }));

    return { jobs };
  } catch (err) {
    logger?.warn({ err }, 'serpapi scrape failed');
    return { jobs: [] };
  }
}

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

