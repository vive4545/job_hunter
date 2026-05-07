export async function scrapeSampleJobs({ query }) {
  const q = (query || 'mern').toLowerCase();
  const base = [
    {
      title: 'Junior MERN Stack Developer',
      company: 'SampleCo',
      location: 'Ahmedabad / Remote',
      description:
        'Looking for a MERN developer (React, Node.js, Express, MongoDB). Build REST APIs, integrate auth (JWT), and ship features. 0-2 years experience. Nice to have: TypeScript, Docker.',
      applyUrl: 'https://example.com/jobs/junior-mern'
    },
    {
      title: 'Full Stack Developer (React + Node)',
      company: 'Demo Systems',
      location: 'Remote',
      description:
        'React + Node role building dashboards and APIs. Must know JavaScript, REST APIs, MongoDB or SQL. Experience: 1+ years.',
      applyUrl: 'https://example.com/jobs/fullstack-react-node'
    },
    {
      title: 'Frontend Engineer (React)',
      company: 'UI Labs',
      location: 'Ahmedabad',
      description:
        'React developer to build modern UI, integrate APIs, and improve performance. Bonus: Redux, TypeScript, testing.',
      applyUrl: 'https://example.com/jobs/frontend-react'
    }
  ];

  const jobs = base
    .filter((j) => {
      if (!q) return true;
      const hay = `${j.title} ${j.description}`.toLowerCase();
      return hay.includes(q);
    })
    .map((j) => ({ source: 'sample', ...j }));

  return { jobs };
}

