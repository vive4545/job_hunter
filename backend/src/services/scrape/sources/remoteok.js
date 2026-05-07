import axios from 'axios';

export async function scrapeRemoteOk({ query }) {
  const { data } = await axios.get('https://remoteok.com/api', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (JobHunterBot; +https://example.local) axios'
    },
    timeout: 20000
  });

  // RemoteOK returns an array; first item is metadata.
  const items = Array.isArray(data) ? data.slice(1) : [];
  const q = (query || '').toLowerCase();

  const jobs = items
    .filter((j) => j?.position && j?.url)
    .filter((j) => {
      if (!q) return true;
      const hay = `${j.position} ${j.description || ''} ${(j.tags || []).join(
        ' '
      )}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 50)
    .map((j) => ({
      source: 'remoteok',
      title: j.position,
      company: j.company || '',
      location: j.location || 'Remote',
      description: stripHtml(j.description || ''),
      applyUrl: j.url
    }));

  return { jobs };
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

