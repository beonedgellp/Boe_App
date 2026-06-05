#!/usr/bin/env node
// Programmatic Kimi (Moonshot) round-trip: send one or more chunk files + a task
// prompt to the Kimi chat API and stream the reply to a response file, which
// `apply-kimi-output.mjs` then writes back to disk.
//
// API key resolution (first match wins):
//   1. KIMI_API_KEY environment variable
//   2. ./kimi-api-key.txt  (gitignored)
//
// Usage:
//   node scripts/kimi/kimi-api.mjs <chunkFile...> --prompt "<task>" [options]
//   node scripts/kimi/kimi-api.mjs kimi_chunks/backend_core.txt --prompt-file task.txt
//
// Options:
//   --prompt "<text>"      inline task description
//   --prompt-file <path>   read task description from a file
//   --out <path>           response file (default: kimi_response.txt)
//   --model <id>           model id (default: env KIMI_MODEL or kimi-k2-0905-preview)
//   --base-url <url>       API base (default: env KIMI_BASE_URL or https://api.moonshot.ai/v1)
//   --max-tokens <n>       max output tokens (default: 8192)
//   --temperature <n>      sampling temperature (default: 0.3)

import { promises as fs } from 'node:fs';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULTS = {
  model: process.env.KIMI_MODEL ?? 'kimi-k2-0905-preview',
  baseUrl: (process.env.KIMI_BASE_URL ?? 'https://api.moonshot.ai/v1').replace(/\/+$/, ''),
  out: 'kimi_response.txt',
  maxTokens: 8192,
  temperature: 0.3,
};

// Minimal machine contract so the reply can be parsed by apply-kimi-output.mjs.
const OUTPUT_CONTRACT =
  'When you return code, output every changed or new file as a COMPLETE file in this exact frame ' +
  'so it can be written straight to disk: a line "===== FILE: <repo-root-relative-path> =====", ' +
  'then the full file content, then a line "===== END FILE =====". Output whole files, never diffs or snippets.';

function parseArgs(argv) {
  const args = { chunks: [], prompt: null, promptFile: null, ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--prompt') args.prompt = argv[++i];
    else if (a === '--prompt-file') args.promptFile = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--base-url') args.baseUrl = argv[++i].replace(/\/+$/, '');
    else if (a === '--max-tokens') args.maxTokens = Number(argv[++i]);
    else if (a === '--temperature') args.temperature = Number(argv[++i]);
    else if (!a.startsWith('--')) args.chunks.push(a);
  }
  if (args.chunks.length === 0) throw new Error('provide at least one chunk file (e.g. kimi_chunks/backend_core.txt)');
  return args;
}

async function readApiKey() {
  if (process.env.KIMI_API_KEY?.trim()) return process.env.KIMI_API_KEY.trim();
  const raw = await fs.readFile(path.resolve('kimi-api-key.txt'), 'utf8').catch(() => null);
  if (!raw?.trim()) throw new Error('no API key: set KIMI_API_KEY or put it in kimi-api-key.txt');
  return raw.trim();
}

async function buildUserContent(args) {
  const task =
    (args.promptFile ? await fs.readFile(path.resolve(args.promptFile), 'utf8') : args.prompt) ?? '';
  if (!task.trim()) throw new Error('provide a task via --prompt or --prompt-file');

  const parts = [task.trim()];
  for (const chunkPath of args.chunks) {
    const content = await fs.readFile(path.resolve(chunkPath), 'utf8');
    parts.push(`\n\n----- PROJECT CONTEXT: ${path.basename(chunkPath)} -----\n${content}`);
  }
  return parts.join('');
}

// Stream the SSE response, append assistant text to the out file, echo to stdout.
async function streamCompletion(args, apiKey, userContent) {
  const res = await fetch(`${args.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: args.model,
      stream: true,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      messages: [
        { role: 'system', content: OUTPUT_CONTRACT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Kimi API ${res.status} ${res.statusText}: ${detail.slice(0, 500)}`);
  }

  const outStream = createWriteStream(path.resolve(args.out), { encoding: 'utf8' });
  const decoder = new TextDecoder();
  let buffer = '';
  let written = 0;

  for await (const part of res.body) {
    buffer += decoder.decode(part, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
        if (delta) {
          outStream.write(delta);
          process.stdout.write(delta);
          written += delta.length;
        }
      } catch {
        // ignore keep-alive / non-JSON frames
      }
    }
  }
  await new Promise((resolve, reject) => outStream.end((err) => (err ? reject(err) : resolve())));
  return written;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = await readApiKey();
  const userContent = await buildUserContent(args);

  const approxTokens = Math.ceil(userContent.length / 4);
  console.error(`model: ${args.model} | base: ${args.baseUrl}`);
  console.error(`context: ${args.chunks.length} chunk(s), ~${approxTokens.toLocaleString()} input tokens → ${args.out}\n`);

  const written = await streamCompletion(args, apiKey, userContent);
  console.error(`\n\nWrote ${written.toLocaleString()} chars to ${args.out}`);
  console.error(`Next: node scripts/kimi/apply-kimi-output.mjs ${args.out} --dry-run`);
}

main().catch((err) => {
  console.error(`kimi-api failed: ${err.message}`);
  process.exit(1);
});
