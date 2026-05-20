import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');
const forbidden = /^(Admin|AdminLogin|Website|Landing|Apk|BrowserRoot)-/;
const matches = readdirSync(assetsDir).filter((name) => forbidden.test(name));

if (matches.length) {
  console.error('Android build emitted non-client chunks:');
  for (const name of matches) console.error(`- ${name}`);
  process.exit(1);
}
