const COMMON_SKILLS = [
  'react',
  'node',
  'node.js',
  'express',
  'express.js',
  'mongodb',
  'mongoose',
  'javascript',
  'typescript',
  'html',
  'css',
  'tailwind',
  'bootstrap',
  'redux',
  'next',
  'nextjs',
  'rest',
  'rest api',
  'graphql',
  'jwt',
  'git',
  'github',
  'docker',
  'aws',
  'postgres',
  'mysql'
];

const LOCATION_HINTS = [
  'ahmedabad',
  'remote',
  'india',
  'gujarat',
  'pune',
  'mumbai',
  'bangalore',
  'bengaluru',
  'hyderabad',
  'delhi',
  'noida',
  'gurgaon'
];

export function parseResumeDetails(text) {
  const cleaned = normalize(text);
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 50);

  const name = guessName(lines);
  const location = guessLocation(cleaned);
  const headline = guessHeadline(lines);
  const skills = extractSkills(cleaned);

  // Per your requirement: default to 2 years.
  const yearsOfExperience = 2;

  return { name, headline, location, skills, yearsOfExperience };
}

function normalize(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function guessName(lines) {
  // Usually the first non-empty line; ignore obvious headings.
  const bad = /resume|curriculum vitae|cv|profile|summary/i;
  for (const l of lines.slice(0, 6)) {
    if (bad.test(l)) continue;
    if (l.length < 3 || l.length > 60) continue;
    if (/[0-9@]/.test(l)) continue;
    // Looks like a name (2-4 capitalized words) OR all-caps.
    const words = l.split(/\s+/);
    if (words.length >= 2 && words.length <= 5) return l;
    if (l === l.toUpperCase() && words.length <= 6) return titleCase(l);
  }
  return '';
}

function guessLocation(text) {
  const low = text.toLowerCase();
  for (const hint of LOCATION_HINTS) {
    if (low.includes(hint)) return titleCase(hint);
  }
  // Try "Location: X"
  const m = text.match(/location\s*:\s*([^\n,]{2,40})/i);
  return m ? m[1].trim() : '';
}

function guessHeadline(lines) {
  // Find first line that contains a role keyword.
  const roleRe =
    /(mern|full[- ]stack|software engineer|web developer|frontend|backend|react|node)/i;
  for (const l of lines.slice(0, 12)) {
    if (l.length < 8 || l.length > 120) continue;
    if (roleRe.test(l)) return l;
  }
  return 'MERN Stack Developer';
}

function extractSkills(text) {
  const low = text.toLowerCase();
  const found = new Set();

  for (const s of COMMON_SKILLS) {
    const token = s.toLowerCase();
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i');
    if (re.test(low)) found.add(normalizeSkill(token));
  }

  // Also parse explicit "Skills: ..." lines
  const skillsLine = text.match(/skills?\s*:\s*([^\n]{10,500})/i);
  if (skillsLine) {
    const extra = skillsLine[1]
      .split(/[,|•·/]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 60);
    for (const e of extra) {
      const t = e.toLowerCase();
      if (t.length >= 2 && t.length <= 30) found.add(normalizeSkill(t));
    }
  }

  return [...found]
    .map((s) => skillDisplay(s))
    .sort((a, b) => a.localeCompare(b));
}

function normalizeSkill(s) {
  return s
    .replace(/\.+/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

function skillDisplay(s) {
  const map = new Map([
    ['node.js', 'Node.js'],
    ['express.js', 'Express.js'],
    ['mongodb', 'MongoDB'],
    ['mongoose', 'Mongoose'],
    ['javascript', 'JavaScript'],
    ['typescript', 'TypeScript'],
    ['rest api', 'REST APIs'],
    ['rest', 'REST'],
    ['jwt', 'JWT'],
    ['nextjs', 'Next.js'],
    ['next', 'Next.js'],
    ['github', 'GitHub'],
    ['css', 'CSS'],
    ['html', 'HTML'],
    ['aws', 'AWS']
  ]);
  return map.get(s) || titleCase(s);
}

function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

