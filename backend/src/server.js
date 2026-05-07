import { loadEnv } from './env.js';
import express from 'express';
import cors from 'cors';
import pino from 'pino';

import { connectToDb } from './db.js';
import { apiRouter } from './routes/api.js';

loadEnv();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' }
        }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', apiRouter({ logger }));

const port = Number(process.env.PORT || 8787);
await connectToDb({ logger });
const server = app.listen(port, () => logger.info({ port }, 'server listening'));

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing server...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  logger.info('SIGINT received. Closing server...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

