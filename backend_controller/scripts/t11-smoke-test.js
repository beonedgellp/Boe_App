import { spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 47502;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const ACCESS_TOKEN_SECRET = 'smoke-test-access-secret-32-bytes-long!!';
const REFRESH_TOKEN_SECRET = 'smoke-test-refresh-secret-32-bytes!!';

// Copy dev-db.json to a temp file so the smoke test doesn't mutate the original
const dbPath = path.join(__dirname, '..', 'data', 'dev-db.json');
const tmpDbPath = path.join(__dirname, '..', 'data', `dev-db-smoke-${randomUUID()}.json`);
fs.copyFileSync(dbPath, tmpDbPath);

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const adminUser = db.users.find(u => u.role === 'admin');
const clientUser = db.users.find(u => u.role === 'client' && u.status === 'approved');
const pendingUser = db.users.find(u => u.role === 'client' && u.status === 'pending_approval');
const rejectedUser = db.users.find(u => u.role === 'client' && u.status === 'rejected');

const existingFund = db.funds?.[0];
const existingPayment = db.payments?.[0];
const existingPlan = db.investmentPlans?.[0];
const existingMandate = db.mandates?.[0];
const existingTransaction = db.transactions?.[0];
const existingTicket = db.supportTickets?.[0];
const existingNotification = db.notifications?.[0];
const existingRedemption = db.redemptionRequests?.[0];
const existingSipControl = db.sipControlRequests?.[0];

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(input, secret) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function createToken(claims, ttlSeconds = 15 * 60) {
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
  return `${input}.${sign(input, ACCESS_TOKEN_SECRET)}`;
}

function makeToken(user) {
  // Do NOT include deviceSessionId so jsonStore auth returns actor directly
  return createToken({
    sub: user.id,
    role: user.role,
  });
}

const adminToken = adminUser ? makeToken(adminUser) : null;
const clientToken = clientUser ? makeToken(clientUser) : null;
const pendingToken = pendingUser ? makeToken(pendingUser) : null;
const rejectedToken = rejectedUser ? makeToken(rejectedUser) : null;

function resolvePath(rawPath) {
  return rawPath
    .replace(':faq_id', '00000000-0000-4000-8000-000000000010')
    .replace(':fund_id', existingFund?.id || '00000000-0000-4000-8000-000000000020')
    .replace(':product_id', existingFund?.id || '00000000-0000-4000-8000-000000000020')
    .replace(':user_id', clientUser?.id || '00000000-0000-4000-8000-000000000030')
    .replace(':userId', clientUser?.id || '00000000-0000-4000-8000-000000000030')
    .replace(':ticket_id', existingTicket?.id || '00000000-0000-4000-8000-000000000040')
    .replace(':payment_id', existingPayment?.id || '00000000-0000-4000-8000-000000000050')
    .replace(':order_id', existingPlan?.id || '00000000-0000-4000-8000-000000000060')
    .replace(':mandate_id', existingMandate?.id || '00000000-0000-4000-8000-000000000070')
    .replace(':transaction_id', existingTransaction?.id || '00000000-0000-4000-8000-000000000080')
    .replace(':statement_id', '00000000-0000-4000-8000-000000000090')
    .replace(':notification_id', existingNotification?.id || '00000000-0000-4000-8000-0000000000a0')
    .replace(':receiptId', '00000000-0000-4000-8000-0000000000b0')
    .replace(':request_id', existingRedemption?.id || existingSipControl?.id || '00000000-0000-4000-8000-0000000000c0')
    .replace(':provider', 'razorpay');
}

async function httpRequest(method, path, token, body = null) {
  const url = new URL(path, BASE_URL);
  const headers = {
    'content-type': 'application/json',
    'accept': 'application/json',
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), {
      method,
      headers,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(timeout);
    const text = await res.text().catch(() => '');
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') return { status: 'TIMEOUT', json: null, text: 'Request timed out' };
    return { status: 'ERROR', json: null, text: err.message };
  }
}

function classify(route, tokenType, status) {
  const numeric = typeof status === 'number' ? status : 0;
  const isAuthRequired = route.auth !== false;
  const isAdminRoute = route.group === 'admin' || route.group === 'internal';

  if (status === 'TIMEOUT' || status === 'ERROR') {
    return 'BLOCKER';
  }

  if (numeric >= 500 && numeric !== 501) {
    return 'BLOCKER';
  }

  if (!isAuthRequired) {
    // Public route should never get 401/403 from auth layer
    if (numeric === 401 || numeric === 403) return 'FAIL';
    return 'PASS';
  }

  if (tokenType === 'none') {
    return numeric === 401 ? 'PASS' : 'FAIL';
  }

  if (tokenType === 'client') {
    if (isAdminRoute) return numeric === 403 ? 'PASS' : 'FAIL';
    if (numeric === 401 || numeric === 403) return 'FAIL';
    return 'PASS';
  }

  if (tokenType === 'admin') {
    if (numeric === 401) return 'FAIL';
    return 'PASS';
  }

  if (tokenType === 'pending') {
    if (numeric === 401) return 'FAIL';
    return 'PASS';
  }

  if (tokenType === 'rejected') {
    if (numeric === 401) return 'FAIL';
    return 'PASS';
  }

  return 'FAIL';
}

async function main() {
  if (!adminToken) {
    console.error('No admin user found in dev-db.json');
    process.exit(1);
  }
  if (!clientToken) {
    console.error('No approved client user found in dev-db.json');
    process.exit(1);
  }

  // Ensure port is free
  try {
    const check = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(500) });
    if (check.status === 200) {
      console.error(`Port ${PORT} is already in use. Please free it before running smoke tests.`);
      process.exit(1);
    }
  } catch {
    // Port is free, good
  }

  // Start server
  const env = {
    ...process.env,
    PORT: String(PORT),
    HOST,
    DATA_STORE: 'json',
    JSON_DB_PATH: tmpDbPath,
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    ALLOW_DEV_AUTH: 'true',
    MOCK_WEBHOOK_ENABLED: 'true',
    LOG_LEVEL: 'error',
  };

  const server = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: 'pipe',
  });

  let serverReady = false;
  const serverLogs = [];
  server.stdout.on('data', d => {
    const line = d.toString();
    serverLogs.push(line);
    if (line.includes('listening on')) serverReady = true;
  });
  server.stderr.on('data', d => {
    serverLogs.push(d.toString());
  });

  // Wait for server
  for (let i = 0; i < 50; i++) {
    if (serverReady) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!serverReady) {
    console.error('Server failed to start');
    serverLogs.forEach(l => console.error(l.trim()));
    server.kill();
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 300));

  // Load routes from the running server via internal endpoint
  const internalRes = await httpRequest('GET', '/v1/internal/routes', adminToken);
  if (internalRes.status !== 200 || !internalRes.json?.data) {
    console.error('Failed to fetch route list from /v1/internal/routes');
    console.error('Status:', internalRes.status, 'Body:', internalRes.text);
    server.kill();
    process.exit(1);
  }
  const routes = internalRes.json.data;

  const results = [];

  for (const route of routes) {
    const resolvedPath = resolvePath(route.path);
    const body = ['POST', 'PATCH', 'PUT'].includes(route.method) ? {} : null;

    const publicRes = await httpRequest(route.method, resolvedPath, null, body);
    const clientRes = await httpRequest(route.method, resolvedPath, clientToken, body);
    const adminRes = await httpRequest(route.method, resolvedPath, adminToken, body);

    let pendingRes = null;
    let rejectedRes = null;
    if (route.group === 'client') {
      pendingRes = await httpRequest(route.method, resolvedPath, pendingToken, body);
      rejectedRes = await httpRequest(route.method, resolvedPath, rejectedToken, body);
    }

    results.push({
      route,
      resolvedPath,
      public: publicRes,
      client: clientRes,
      admin: adminRes,
      pending: pendingRes,
      rejected: rejectedRes,
    });
  }

  server.kill();
  await new Promise(r => setTimeout(r, 200));

  // Clean up temp db
  try { fs.unlinkSync(tmpDbPath); } catch {}

  // Build report
  let md = '# T11 Smoke Test Results\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Server: ${BASE_URL}\n\n`;

  let pass = 0, fail = 0, blocker = 0;
  for (const r of results) {
    const classifications = [
      classify(r.route, 'none', r.public.status),
      classify(r.route, 'client', r.client.status),
      classify(r.route, 'admin', r.admin.status),
      r.pending ? classify(r.route, 'pending', r.pending.status) : null,
      r.rejected ? classify(r.route, 'rejected', r.rejected.status) : null,
    ];
    for (const c of classifications) {
      if (c === 'PASS') pass++;
      else if (c === 'FAIL') fail++;
      else if (c === 'BLOCKER') blocker++;
    }
  }

  md += '## Summary\n\n';
  md += `| Metric | Count |\n|--------|-------|\n`;
  md += `| Total routes | ${routes.length} |\n`;
  md += `| Total checks | ${pass + fail + blocker} |\n`;
  md += `| PASS | ${pass} |\n`;
  md += `| FAIL | ${fail} |\n`;
  md += `| BLOCKER | ${blocker} |\n`;
  md += '\n';

  // Detail table
  md += '## Per-Route Results\n\n';
  md += '| Method | Path | Group | Auth | Roles | No-Auth | Client | Admin | Pending | Rejected |\n';
  md += '|--------|------|-------|------|-------|---------|--------|-------|---------|----------|\n';

  for (const r of results) {
    const pubCls = classify(r.route, 'none', r.public.status);
    const cliCls = classify(r.route, 'client', r.client.status);
    const admCls = classify(r.route, 'admin', r.admin.status);
    const pendCls = r.pending ? classify(r.route, 'pending', r.pending.status) : '—';
    const rejCls = r.rejected ? classify(r.route, 'rejected', r.rejected.status) : '—';

    const fmt = (res, cls) => `${res.status} ${cls}`;

    const roles = r.route.roles.length > 0 ? r.route.roles.join(', ') : (r.route.auth === false ? '—' : 'any');
    const auth = r.route.auth === false ? 'No' : 'Yes';

    md += `| ${r.route.method} | \`${r.route.path}\` | ${r.route.group} | ${auth} | ${roles} | ${fmt(r.public, pubCls)} | ${fmt(r.client, cliCls)} | ${fmt(r.admin, admCls)} | ${r.pending ? fmt(r.pending, pendCls) : '—'} | ${r.rejected ? fmt(r.rejected, rejCls) : '—'} |\n`;
  }

  // Failures and blockers detail
  md += '\n## Failures and Blockers\n\n';
  const issues = [];
  for (const r of results) {
    const checks = [
      { type: 'no-auth', res: r.public, cls: classify(r.route, 'none', r.public.status) },
      { type: 'client', res: r.client, cls: classify(r.route, 'client', r.client.status) },
      { type: 'admin', res: r.admin, cls: classify(r.route, 'admin', r.admin.status) },
    ];
    if (r.pending) checks.push({ type: 'pending', res: r.pending, cls: classify(r.route, 'pending', r.pending.status) });
    if (r.rejected) checks.push({ type: 'rejected', res: r.rejected, cls: classify(r.route, 'rejected', r.rejected.status) });

    for (const c of checks) {
      if (c.cls === 'FAIL' || c.cls === 'BLOCKER') {
        issues.push({ route: r.route, check: c.type, status: c.res.status, cls: c.cls, body: c.res.text?.slice(0, 200) });
      }
    }
  }

  if (issues.length === 0) {
    md += 'No failures or blockers.\n';
  } else {
    md += '| Method | Path | Check | Status | Class | Response Snippet |\n';
    md += '|--------|------|-------|--------|-------|------------------|\n';
    for (const issue of issues) {
      md += `| ${issue.route.method} | \`${issue.route.path}\` | ${issue.check} | ${issue.status} | ${issue.cls} | ${(issue.body || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
    }
  }

  // Duplicate check
  md += '\n## Duplicate Route Check\n\n';
  const seen = new Map();
  const duplicates = [];
  for (const r of routes) {
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) duplicates.push(key);
    else seen.set(key, true);
  }
  if (duplicates.length === 0) {
    md += 'No duplicate routes found.\n';
  } else {
    md += 'Duplicates:\n';
    for (const d of duplicates) md += `- \`${d}\`\n`;
  }

  // Write report
  const reportPath = path.join(__dirname, '..', 'reports', 't11-smoke-test-results.md');
  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`Smoke test report written to ${reportPath}`);
  console.log(`Summary: ${pass} PASS, ${fail} FAIL, ${blocker} BLOCKER`);

  if (fail > 0 || blocker > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  try { fs.unlinkSync(tmpDbPath); } catch {}
  process.exit(1);
});
