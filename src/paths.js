import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serverless platforms (Vercel, AWS Lambda) mount a read-only filesystem where
// only /tmp is writable. Locally we keep data under the project's ./data folder.
// NOTE: on serverless /tmp is ephemeral and per-instance — data does not persist
// reliably. That is why production needs an external database (e.g. Supabase).
export const isServerless = !!(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);

export const DATA_DIR =
  process.env.DATA_DIR ||
  (isServerless ? "/tmp/presenze-data" : path.join(__dirname, "..", "data"));

fs.mkdirSync(DATA_DIR, { recursive: true });
