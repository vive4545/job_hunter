import express from 'express';
import { z } from 'zod';
import multer from 'multer';

import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { runPipeline } from '../services/pipeline.js';
import { extractResumeText } from '../services/resume/extractText.js';
import { parseResumeDetails } from '../services/resume/parseDetails.js';

export function apiRouter({ logger }) {
  const r = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 }
  });

  r.get('/jobs', async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const status = req.query.status?.toString();
    const date = req.query.date?.toString();

    const q = {};
    if (status) q.status = status;

    if (date) {
      const now = new Date();
      if (date === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        q.createdAt = { $gte: start };
      } else if (date === 'yesterday') {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        q.createdAt = { $gte: start, $lt: end };
      } else if (date === 'week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        q.createdAt = { $gte: start };
      }
    }

    const jobs = await Job.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ jobs });
  });

  r.delete('/jobs', async (_req, res) => {
    await Job.deleteMany({});
    res.json({ ok: true });
  });

  r.get('/jobs/:id', async (req, res) => {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: 'not_found' });
    res.json({ job });
  });

  r.patch('/jobs/:id/status', async (req, res) => {
    const bodySchema = z.object({
      status: z.enum(['new', 'shortlisted', 'applied', 'interview', 'rejected'])
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: { status: parsed.data.status } },
      { new: true }
    ).lean();
    if (!job) return res.status(404).json({ error: 'not_found' });
    res.json({ job });
  });

  r.get('/resume', async (_req, res) => {
    const resume = await Resume.findOne().sort({ updatedAt: -1 }).lean();
    res.json({ resume });
  });

  r.put('/resume', async (req, res) => {
    const bodySchema = z.object({
      name: z.string().optional(),
      headline: z.string().optional(),
      location: z.string().optional(),
      yearsOfExperience: z.number().min(0).max(50).optional(),
      skills: z.array(z.string()).optional(),
      text: z.string().optional()
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const resume = await Resume.findOneAndUpdate(
      {},
      { $set: parsed.data },
      { upsert: true, new: true }
    ).lean();
    res.json({ resume });
  });

  r.post('/resume/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'file_required' });

    let text = '';
    try {
      text = await extractResumeText({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        filename: req.file.originalname
      });
    } catch (err) {
      logger?.warn({ err }, 'resume extract failed');
      return res.status(400).json({ error: 'unsupported_or_unreadable_file' });
    }

    const cleaned = String(text || '').replace(/\u0000/g, '').trim();
    if (!cleaned) return res.status(400).json({ error: 'empty_text' });

    const details = parseResumeDetails(cleaned);

    const resume = await Resume.findOneAndUpdate(
      {},
      { $set: { text: cleaned, ...details } },
      { upsert: true, new: true }
    ).lean();

    res.json({ resume });
  });

  r.post('/pipeline/run', async (_req, res) => {
    const result = await runPipeline({ logger });
    res.json(result);
  });

  r.get('/stats', async (_req, res) => {
    const [total, byStatus] = await Promise.all([
      Job.countDocuments({}),
      Job.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);
    res.json({ total, byStatus });
  });

  r.use((err, _req, res, _next) => {
    logger?.error({ err }, 'api error');
    res.status(500).json({ error: 'internal_error' });
  });

  return r;
}

