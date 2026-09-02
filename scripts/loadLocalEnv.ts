import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

/** Load .env.local then .env without committing secrets to Git. */
export function loadLocalEnv(): void {
  const root = process.cwd();
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(root, file);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
}
