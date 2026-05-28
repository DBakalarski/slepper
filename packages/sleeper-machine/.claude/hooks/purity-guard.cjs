#!/usr/bin/env node
// purity-guard: blokuje wzorce zakazane przez CLAUDE.md w plikach src/.
// Działa jako PreToolUse hook dla Edit/Write. Wyjście != 0 anuluje narzędzie.

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(raw); } catch { process.exit(0); }
  const input = data.tool_input || {};
  const fp = String(input.file_path || '');

  // Tylko src/ (nie tests/, nie scripts/, nie dist/).
  if (!/(^|\/)src\//.test(fp)) process.exit(0);
  if (fp.endsWith('.test.ts')) process.exit(0);

  // Edit ma new_string, Write ma content.
  const candidates = [
    input.content,
    input.new_string,
    // MultiEdit: scal wszystkie new_string.
    Array.isArray(input.edits) ? input.edits.map((e) => e && e.new_string).join('\n') : null,
  ].filter((s) => typeof s === 'string' && s.length > 0);
  if (candidates.length === 0) process.exit(0);
  const content = candidates.join('\n');

  const checks = [
    { re: /\bDate\.now\s*\(/, rule: 'Date.now() — łamie determinizm. `now` przekazuj przez state.now: DateTime.' },
    { re: /\bnew\s+Date\s*\(\s*\)/, rule: 'new Date() bez argumentów — łamie determinizm. `now` przekazuj przez state.now: DateTime. (Konstrukcja `new Date(arg)` z ms/iso jest dozwolona — to czysta funkcja od danych wejściowych.)' },
    { re: /\bMath\.random\s*\(/, rule: 'Math.random() — łamie determinizm.' },
    { re: /\bprocess\.env\b/, rule: 'process.env — I/O w src/ jest zabronione.' },
    { re: /^\s*(export\s+)?class\s+[A-Za-z_]/m, rule: 'class — projekt używa pure functions nad danymi, nie OOP.' },
    { re: /^\s*(export\s+)?interface\s+[A-Za-z_]/m, rule: 'interface — używaj `type` zamiast `interface`.' },
    { re: /^\s*(export\s+)?enum\s+[A-Za-z_]/m, rule: 'enum — używaj string-literal unions zamiast enum.' },
  ];

  const hits = checks.filter((c) => c.re.test(content));
  if (hits.length === 0) process.exit(0);

  console.error(`[purity-guard] zablokowano zapis do ${fp}:`);
  for (const h of hits) console.error(`  - ${h.rule}`);
  console.error('Patrz CLAUDE.md sekcje "Zasady kodowania" i "Anti-patterns".');
  console.error('Jeśli edycja jest świadoma i poprawna, omów wyjątek z użytkownikiem przed obejściem hooka.');
  process.exit(2);
});
