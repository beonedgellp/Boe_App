import { createRouter } from '#router';
import { loadConfig } from '#config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = loadConfig();
const router = createRouter({ config, logger: { info() {} } });
const routes = router.describe();

// Sort routes by group, then method, then path
const sorted = [...routes].sort((a, b) => {
  if (a.group !== b.group) return a.group.localeCompare(b.group);
  if (a.method !== b.method) return a.method.localeCompare(b.method);
  return a.path.localeCompare(b.path);
});

// Check for duplicates
const seen = new Map();
const duplicates = [];
for (const r of sorted) {
  const key = `${r.method} ${r.path}`;
  if (seen.has(key)) {
    duplicates.push({ key, first: seen.get(key), second: r });
  } else {
    seen.set(key, r);
  }
}

// Build markdown table
let md = '# T11 Route Inventory\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `Total routes: ${sorted.length}\n\n`;

md += '| Method | Path | Group | Auth Required | Roles Allowed | Description |\n';
md += '|--------|------|-------|---------------|---------------|-------------|\n';

for (const r of sorted) {
  const auth = r.auth === false ? 'No' : 'Yes';
  const roles = r.roles.length > 0 ? r.roles.join(', ') : (r.auth === false ? '—' : 'Any authenticated');
  md += `| ${r.method} | \`${r.path}\` | ${r.group} | ${auth} | ${roles} | ${r.description || ''} |\n`;
}

if (duplicates.length > 0) {
  md += '\n## Duplicate Routes Found\n\n';
  md += '| Method + Path | First Group | Second Group |\n';
  md += '|---------------|-------------|--------------|\n';
  for (const d of duplicates) {
    md += `| \`${d.key}\` | ${d.first.group} | ${d.second.group} |\n`;
  }
} else {
  md += '\nNo duplicate routes found.\n';
}

const outPath = path.join(__dirname, '..', 'reports', 't11-route-inventory.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md, 'utf8');

console.log(`Route inventory written to ${outPath}`);
console.log(`Total routes: ${sorted.length}`);
if (duplicates.length > 0) {
  console.log(`Duplicates found: ${duplicates.length}`);
  for (const d of duplicates) {
    console.log(`  DUPLICATE: ${d.key}`);
  }
}
