import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
if (!process.env.CIRCLE_API_KEY) throw new Error('Set a rotated CIRCLE_API_KEY in .env.local before running operator scripts.');
