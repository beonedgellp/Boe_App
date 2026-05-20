import { createHmac } from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SECRET = 'dev-access-token-secret-change-before-shared-use';
const PORT = 47502;
const HOST = '127.0.0.1';
const USER_ID = '75cced71-06e3-4c2a-8683-66878bbf680f';
const DB_PATH = path.join(__dirname, '..', 'data', 'dev-db.json');

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(input, secret) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function createAccessToken(claims, ttlSeconds = 15 * 60) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    iss: 'beonedge-backend',
    aud: 'beonedge-client',
    iat: now,
    exp: now + ttlSeconds,
    ...claims,
  });
  const input = `${header}.${payload}`;
  return `${input}.${sign(input, SECRET)}`;
}

const token = createAccessToken({
  sub: '00000000-0000-4000-8000-000000000001',
  role: 'admin',
  status: 'active',
});

console.log('Generated admin JWT:', token.slice(0, 50) + '...');

function patchRequest() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ action: 'approve', reason: 'Documents verified' });
    const options = {
      hostname: HOST,
      port: PORT,
      path: `/v1/admin/kyc-review/${USER_ID}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`PATCH status: ${res.statusCode}`);
        console.log(`PATCH body: ${body}`);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const patchResult = await patchRequest();

  if (patchResult.status !== 200) {
    console.error('PATCH did not return 200, aborting verification');
    process.exit(1);
  }

  // Read DB directly from disk
  const dbRaw = fs.readFileSync(DB_PATH, 'utf8');
  const db = JSON.parse(dbRaw);

  const user = db.users.find(u => u.id === USER_ID);
  const profile = db.kycProfiles.find(p => p.userId === USER_ID);
  const receipt = db.receipts?.find(r => r.kind === 'kyc_approved' && r.entityId === USER_ID);

  console.log('\n=== VERIFICATION RESULTS ===');

  const checks = [];

  checks.push({ label: 'user.status === "approved"', pass: user?.status === 'approved', actual: user?.status });
  checks.push({ label: 'user.kycStatus === "approved"', pass: user?.kycStatus === 'approved', actual: user?.kycStatus });
  checks.push({ label: 'profile.reviewStatus === "approved"', pass: profile?.reviewStatus === 'approved', actual: profile?.reviewStatus });
  checks.push({ label: 'profile.reviewedAt is set', pass: !!profile?.reviewedAt, actual: profile?.reviewedAt });
  checks.push({ label: 'receipt with kind "kyc_approved" exists', pass: !!receipt, actual: receipt ? `found id=${receipt.id}` : 'not found' });

  for (const check of checks) {
    const status = check.pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${check.label} (actual: ${JSON.stringify(check.actual)})`);
  }

  const allPass = checks.every(c => c.pass);
  console.log(`\nAll checks passed: ${allPass}`);
  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
