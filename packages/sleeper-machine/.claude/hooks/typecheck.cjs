#!/usr/bin/env node
// typecheck: po edycji .ts w src/ lub tests/ uruchamia `tsc --noEmit`
// i powiązany test vitest (paired: src/foo.ts <-> tests/foo.test.ts).
// PostToolUse: exit code 2 wraca do Claude jako komunikat o błędzie.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }
  const fp = String((data.tool_input && data.tool_input.file_path) || '');
  if (!/\.(ts|tsx)$/.test(fp)) process.exit(0);
  if (!/(^|\/)(src|tests)\//.test(fp)) process.exit(0);

  const cwd = process.cwd();

  const tsc = spawnSync('pnpm', ['exec', 'tsc', '--noEmit'], { cwd, encoding: 'utf8' });
  if (tsc.status !== 0) {
    process.stderr.write('[typecheck] tsc --noEmit zwróciło błędy:\n');
    if (tsc.stdout) process.stderr.write(tsc.stdout);
    if (tsc.stderr) process.stderr.write(tsc.stderr);
    process.exit(2);
  }

  // Powiązany test: src/foo.ts -> tests/foo.test.ts (zachowując podkatalogi math/ itd.)
  let testPath = null;
  if (/(^|\/)src\//.test(fp)) {
    const candidate = fp.replace(/(^|\/)src\//, '$1tests/').replace(/\.ts$/, '.test.ts');
    if (fs.existsSync(path.resolve(cwd, candidate))) testPath = candidate;
  } else if (fp.endsWith('.test.ts')) {
    testPath = fp;
  }

  if (testPath) {
    const v = spawnSync('pnpm', ['exec', 'vitest', 'run', testPath], { cwd, encoding: 'utf8' });
    if (v.status !== 0) {
      process.stderr.write(`[typecheck] vitest ${testPath} nie przeszedł:\n`);
      if (v.stdout) process.stderr.write(v.stdout);
      if (v.stderr) process.stderr.write(v.stderr);
      process.exit(2);
    }
  }

  process.exit(0);
});
