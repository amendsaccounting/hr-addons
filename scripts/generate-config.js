// Simple .env -> src/config.env.ts generator (no external deps)
// Usage: node scripts/generate-config.js

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env');
const OUT_DIR = path.join(ROOT, 'src');
const OUT_PATH = path.join(OUT_DIR, 'config.env.ts');

function parseEnv(content) {
  const map = {};
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

function generate(env) {
  const keys = [
    'ERP_API_KEY',
    'ERP_API_SECRET',
    'ERP_DEVICE_ID',
    'ERP_URL_RESOURCE',
    'ERP_URL_METHOD',
    'MOCK_RECENT_HISTORY',
    'MOCK_RECENT_HISTORY_DAYS',
  ];
  const lines = [
    '// AUTO-GENERATED from .env. Do not edit directly.',
    ...keys.map(
      (k) => `export const ${k} = ${JSON.stringify(env[k] || '')} as string;`
    ),
    '',
  ];
  ensureOutDir();
  fs.writeFileSync(OUT_PATH, lines.join('\n'));
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)}`);
}

function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.warn('.env not found. Writing empty config.env.ts from defaults.');
    generate({});
    return;
  }
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const env = parseEnv(content);
  generate(env);
}

main();
