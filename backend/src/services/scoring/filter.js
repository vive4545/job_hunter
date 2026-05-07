function parseCsvLower(name, fallback) {
  const raw = (process.env[name] || '').trim();
  const arr = raw
    ? raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : fallback;
  return arr;
}

const DEFAULT_LOCATIONS = ['ahmedabad', 'remote'];
const DEFAULT_ROLES = [
  'mern',
  'full stack',
  'full-stack',
  'react',
  'node',
  'express',
  'mongodb',
  'javascript',
  'typescript'
];

export function evaluateFilters(job) {
  const maxYears = Number(process.env.FILTER_MAX_YEARS || 2);
  const locationKeywords = parseCsvLower(
    'FILTER_LOCATION_KEYWORDS',
    DEFAULT_LOCATIONS
  );
  const roleKeywords = parseCsvLower('FILTER_ROLE_KEYWORDS', DEFAULT_ROLES);

  const title = (job.title || '').toLowerCase();
  const loc = (job.location || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const hay = `${title} ${loc} ${desc}`;

  const reasons = [];

  // Location filter: pass if any keyword found in location/title/desc.
  const locationPass =
    locationKeywords.length === 0 ||
    locationKeywords.some((k) => hay.includes(k));
  if (!locationPass) reasons.push('location_mismatch');

  // Role filter: pass if any keyword found in title/desc.
  const rolePass =
    roleKeywords.length === 0 ||
    roleKeywords.some((k) => `${title} ${desc}`.includes(k));
  if (!rolePass) reasons.push('role_mismatch');

  // Experience filter: very rough heuristic using "X years" patterns.
  const years = extractMinYears(desc);
  const expPass = years == null || years <= maxYears;
  if (!expPass) reasons.push(`experience_too_high:${years}`);

  return { passed: locationPass && rolePass && expPass, reasons };
}

function extractMinYears(text) {
  const m = text.match(/(\d+)\s*\+?\s*years?/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

