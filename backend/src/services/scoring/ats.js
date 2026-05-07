const STOP = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'with',
  'you',
  'your'
]);

export function scoreAts({ job, resume }) {
  const jd = `${job.title || ''}\n${job.description || ''}`;
  const keywords = extractKeywords(jd).slice(0, 40);

  const resumeTokens = new Set(
    tokenize(`${(resume.skills || []).join(' ')}\n${resume.text || ''}`).filter(
      (t) => !STOP.has(t)
    )
  );

  const matched = keywords.filter((k) => resumeTokens.has(k));
  const score =
    keywords.length === 0 ? 0 : Math.round((matched.length / keywords.length) * 100);

  return {
    score,
    keywords,
    matched
  };
}

function extractKeywords(text) {
  const tokens = tokenize(text).filter((t) => !STOP.has(t));

  // Simple TF ranking
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);

  // Boost common tech tokens
  const boosts = new Set([
    'react',
    'node',
    'express',
    'mongodb',
    'javascript',
    'typescript',
    'redux',
    'nextjs',
    'next',
    'api',
    'rest',
    'graphql',
    'mongoose',
    'postgres',
    'mysql',
    'docker',
    'aws',
    'azure',
    'gcp'
  ]);

  const scored = [...tf.entries()].map(([term, count]) => ({
    term,
    score: count * (boosts.has(term) ? 1.5 : 1)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.term);
}

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 24);
}

