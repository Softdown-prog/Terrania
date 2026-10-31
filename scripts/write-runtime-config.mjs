import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
for (const file of ['.env.local', '.env']) if (existsSync(file)) loadEnvFile(file);
// Public URLs only; preserve existing GitHub Actions variables during the migration.
mkdirSync('src/app', { recursive: true });
writeFileSync('src/app/runtime-config.ts', 'export const runtimeConfig = ' + JSON.stringify({
  multiplayerUrl: process.env.VITE_MULTIPLAYER_URL ?? '',
  presenceUrl: process.env.VITE_PRESENCE_URL ?? '',
}) + ' as const;\n');
