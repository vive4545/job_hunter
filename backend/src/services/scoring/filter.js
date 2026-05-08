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

export function evaluateFilters(job, resume = {}) {
  const prefMaxYears = resume.maxExpPref ?? Number(process.env.FILTER_MAX_YEARS || 2);
  const prefMinYears = resume.minExpPref ?? 0;
  const prefMinSalary = resume.minSalaryPref ?? 0;

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

  // Location filter
  const locationPass =
    locationKeywords.length === 0 ||
    locationKeywords.some((k) => hay.includes(k));
  if (!locationPass) reasons.push('location_mismatch');

  // Role filter
  const rolePass =
    roleKeywords.length === 0 ||
    roleKeywords.some((k) => `${title} ${desc}`.includes(k));
  if (!rolePass) reasons.push('role_mismatch');

  // Experience filter
  const jobMinExp = job.minExperience ?? extractMinYears(desc);
  const expPass = jobMinExp == null || (jobMinExp >= prefMinYears && jobMinExp <= prefMaxYears);
  if (!expPass) reasons.push(`experience_mismatch:${jobMinExp}`);

  // Salary filter
  const jobMaxSalary = job.maxSalary;
  const salaryPass = jobMaxSalary == null || jobMaxSalary >= prefMinSalary;
  if (!salaryPass) reasons.push(`salary_too_low:${jobMaxSalary}`);

  return { passed: locationPass && rolePass && expPass && salaryPass, reasons };
}

function extractMinYears(text) {
  const m = text.match(/(\d+)\s*\+?\s*years?/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

