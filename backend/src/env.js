import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

let loaded = false;

export function loadEnv() {
  if (loaded) return;
  loaded = true;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Always load backend/.env even if process.cwd() is repo root.
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

