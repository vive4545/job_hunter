import OpenAI from 'openai';

export async function generateMessageIfEnabled({ job, resume, ats, logger }) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  // Only generate for promising jobs to control cost.
  const min = Number(process.env.ATS_MIN_SCORE || 55);
  if ((ats?.score || 0) < min) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const client = new OpenAI({ apiKey });

  const prompt = buildPrompt({ job, resume, ats });

  try {
    const resp = await client.responses.create({
      model,
      input: prompt
    });

    const message = (resp.output_text || '').trim();
    if (!message) return null;

    return {
      enabled: true,
      model,
      message,
      generatedAt: new Date()
    };
  } catch (err) {
    logger?.warn({ err }, 'openai message generation failed');
    return null;
  }
}

function buildPrompt({ job, resume, ats }) {
  const company = job.company ? `Company: ${job.company}\n` : '';
  const location = job.location ? `Location: ${job.location}\n` : '';
  const resumeSkills = (resume.skills || []).join(', ');

  return [
    {
      role: 'system',
      content:
        'You write concise, human-sounding job application outreach messages. ' +
        'Never claim experiences the candidate did not provide. ' +
        'No emojis. No hype. No placeholders.'
    },
    {
      role: 'user',
      content:
        `Write a short message (120-180 words) to apply for this role.\n\n` +
        `Job:\nTitle: ${job.title}\n${company}${location}\n` +
        `Description:\n${job.description || ''}\n\n` +
        `Candidate resume:\n` +
        `Name: ${resume.name || ''}\n` +
        `Headline: ${resume.headline || ''}\n` +
        `Location: ${resume.location || ''}\n` +
        `Years: ${resume.yearsOfExperience ?? ''}\n` +
        `Skills: ${resumeSkills}\n` +
        `Resume text:\n${(resume.text || '').slice(0, 3000)}\n\n` +
        `ATS:\nScore: ${ats?.score ?? 0}\nTop JD keywords: ${(ats?.keywords || [])
          .slice(0, 12)
          .join(', ')}\n\n` +
        `Rules:\n` +
        `- Mention company name if available.\n` +
        `- Mention 2-3 relevant skills from the candidate.\n` +
        `- Include a polite call-to-action.\n` +
        `- Output ONLY the message text.\n`
    }
  ];
}

