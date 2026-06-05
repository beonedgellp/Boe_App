#!/usr/bin/env node
// Apply Kimi's chat output back to the local repo.
//
// Supports two return formats:
//   1. File blocks (preferred):  ===== FILE: <relpath> ===== ... ===== END FILE =====
//   2. Unified diff (--mode diff or auto-detected): delegated to `git apply`.
//
// Safety:
//   - Every target path is resolved and confirmed to stay inside the repo root.
//   - Sensitive local paths (.env, API key files, resources/credentials) are rejected.
//   - Originals are backed up under .kimi_backups/<timestamp>/ before overwrite.
//   - --dry-run prints the plan and writes nothing.
//
// Usage:
//   node scripts/kimi/apply-kimi-output.mjs <responseFile> [--repo <root>] [--dry-run] [--no-backup] [--mode auto|file|diff]

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const FILE_HEADER = /^={3,}\s*FILE:\s*(.+?)\s*={3,}\s*$/;
const FILE_FOOTER = /^={3,}\s*END FILE\s*={3,}\s*$/;
const SENSITIVE_FILE_BASENAMES = new Set(['.env', 'kimi-api-key.txt']);
const SENSITIVE_PATH_PREFIXES = ['resources/credentials/'];

function parseArgs(argv) {
  const args = { responseFile: null, repo: process.cwd(), dryRun: false, backup: true, mode: 'auto' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--no-backup') args.backup = false;
    else if (arg === '--repo') args.repo = argv[++i];
    else if (arg === '--mode') args.mode = argv[++i];
    else if (!arg.startsWith('--') && !args.responseFile) args.responseFile = arg;
  }
  if (!args.responseFile) throw new Error('usage: apply-kimi-output.mjs <responseFile> [--dry-run] [--no-backup] [--mode auto|file|diff]');
  if (!['auto', 'file', 'diff'].includes(args.mode)) throw new Error(`invalid --mode: ${args.mode}`);
  args.repo = path.resolve(args.repo);
  return args;
}

// Reject absolute paths and anything that escapes the repo root via `..`.
function resolveSafe(repoRoot, relPath) {
  if (path.isAbsolute(relPath)) throw new Error(`absolute path rejected: ${relPath}`);
  const resolved = path.resolve(repoRoot, relPath);
  const rel = path.relative(repoRoot, resolved);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`path escapes repo root: ${relPath}`);
  }
  const normalizedRel = rel.split(path.sep).join('/');
  if (SENSITIVE_FILE_BASENAMES.has(path.basename(normalizedRel))) {
    throw new Error(`sensitive local file rejected: ${normalizedRel}`);
  }
  if (SENSITIVE_PATH_PREFIXES.some((prefix) => normalizedRel.startsWith(prefix))) {
    throw new Error(`sensitive local path rejected: ${normalizedRel}`);
  }
  return resolved;
}

// Drop blank padding and a single surrounding markdown code fence, if present.
function stripFences(lines) {
  const out = [...lines];
  while (out.length && out[0].trim() === '') out.shift();
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  if (out.length && out[0].trimStart().startsWith('```')) out.shift();
  if (out.length && out[out.length - 1].trim() === '```') out.pop();
  return out;
}

function parseFileBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const header = line.match(FILE_HEADER);
    if (header) {
      if (current) blocks.push(current);
      current = { filePath: header[1].trim(), body: [] };
      continue;
    }
    if (FILE_FOOTER.test(line)) {
      if (current) blocks.push(current);
      current = null;
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) blocks.push(current);

  return blocks.map((block) => ({
    filePath: block.filePath,
    content: `${stripFences(block.body).join('\n')}\n`,
  }));
}

function looksLikeDiff(text) {
  return /^diff --git /m.test(text) || (/^--- /m.test(text) && /^\+\+\+ /m.test(text));
}

async function backupOriginal(repoRoot, relPath, stamp) {
  const abs = path.resolve(repoRoot, relPath);
  const exists = await fs.stat(abs).then(() => true).catch(() => false);
  if (!exists) return false;
  const dest = path.join(repoRoot, '.kimi_backups', stamp, relPath);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(abs, dest);
  return true;
}

async function applyFileBlocks(blocks, args) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let written = 0;
  const errors = [];

  for (const block of blocks) {
    try {
      const abs = resolveSafe(args.repo, block.filePath);
      const existed = await fs.stat(abs).then(() => true).catch(() => false);
      const tag = existed ? 'update' : 'create';

      if (args.dryRun) {
        console.log(`[dry-run] ${tag}  ${block.filePath}  (${block.content.length} bytes)`);
        continue;
      }
      if (args.backup) await backupOriginal(args.repo, block.filePath, stamp);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, block.content, 'utf8');
      console.log(`${tag}  ${block.filePath}`);
      written += 1;
    } catch (err) {
      errors.push(`${block.filePath}: ${err.message}`);
    }
  }

  if (!args.dryRun && args.backup && written > 0) {
    console.log(`\nbackups: .kimi_backups/${stamp}/`);
  }
  return { written, errors };
}

async function applyDiff(text, args) {
  const patchPath = path.join(args.repo, `.kimi-patch-${Date.now()}.patch`);
  await fs.writeFile(patchPath, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
  try {
    await execFileAsync('git', ['apply', '--check', patchPath], { cwd: args.repo });
    if (args.dryRun) {
      console.log('[dry-run] git apply --check passed; patch is applicable.');
      return { written: 0, errors: [] };
    }
    await execFileAsync('git', ['apply', patchPath], { cwd: args.repo });
    console.log('git apply: patch applied.');
    return { written: 1, errors: [] };
  } catch (err) {
    return { written: 0, errors: [`git apply failed: ${(err.stderr || err.message).trim()}`] };
  } finally {
    await fs.rm(patchPath, { force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const text = await fs.readFile(path.resolve(args.responseFile), 'utf8');

  const blocks = parseFileBlocks(text);
  const useDiff = args.mode === 'diff' || (args.mode === 'auto' && blocks.length === 0 && looksLikeDiff(text));

  let result;
  if (useDiff) {
    console.log('mode: unified diff (git apply)');
    result = await applyDiff(text, args);
  } else {
    if (blocks.length === 0) throw new Error('no `===== FILE: ... =====` blocks found and input is not a unified diff');
    console.log(`mode: file blocks (${blocks.length} file${blocks.length === 1 ? '' : 's'})${args.dryRun ? ' [dry-run]' : ''}`);
    result = await applyFileBlocks(blocks, args);
  }

  if (result.errors.length) {
    console.error(`\n${result.errors.length} error(s):`);
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`\nDone. ${args.dryRun ? 'No files written (dry-run).' : `${result.written} file(s) applied.`}`);
  console.log('Next: review `git diff`, then run validation (backend routes / db:check / migrate, frontend build, Docker Compose health when present).');
}

main().catch((err) => {
  console.error(`apply-kimi-output failed: ${err.message}`);
  process.exit(1);
});
