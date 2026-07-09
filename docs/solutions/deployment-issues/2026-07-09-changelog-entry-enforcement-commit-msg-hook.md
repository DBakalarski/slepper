---
title: "Baner „co nowego” nie pokazywał się userom — brak wpisu changelogu nie był niczym wymuszany"
date: 2026-07-09
category: deployment-issues
severity: medium
stack:
  - Expo SDK 54 (web)
  - Git hooks
  - Vitest
tags:
  - changelog
  - release-process
  - git-hooks
  - commit-msg
  - version-sync
  - process-enforcement
status: verified
last_verified: 2026-07-09
---

# Baner „co nowego” nie pokazywał się po deployu — wpis changelogu notorycznie pomijany

## Symptomy

- Po deployu zmiany user-facing (np. `408cd80` — usunięcie przełącznika algorytmu i „korekty za drzemkę”) w aplikacji NIE pojawił się baner „co nowego” + prośba o restart.
- Zero błędów: `pnpm web:build:check` przechodził, deploy na Vercel działał, aplikacja działała.
- Problem powtarzał się przy kolejnych releasach („notorycznie”) — mimo reguły w memory/CLAUDE.md „każda user-facing zmiana = wpis w changelog.json + bump wersji”.

## Root Cause

Mechanizm banera (`useChangelogUpdate` → fetch `/changelog.json` no-store → porównanie `max(v)` z `lastSeen` w localStorage) działał poprawnie — po prostu nie dostawał danych. Invariant `version-sync.test.ts` pilnuje wyłącznie **spójności** trzech wersji (`app.json` == `package.json` == top wpis changelogu). Gdy commit user-facing wchodzi bez żadnego bumpa, wszystkie trzy zostają na starej wersji i są **spójne** — gate przechodzi. Reguła procesowa istniała tylko „na papierze” (CLAUDE.md/memory), bez deterministycznego wymuszenia — a reguły niewymuszane są w praktyce pomijane.

## Rozwiązanie

1. **Retroaktywnie**: wpis `0.9.0` w `packages/sleeper-web/public/changelog.json` (v: 9, items z perspektywy usera) + bump `version` w `app.json` i `package.json`.
2. **Wymuszenie**: wersjonowany git hook `.githooks/commit-msg` — commit z subjectem `feat|fix|perf(*web*)` bez zestage'owanego `packages/sleeper-web/public/changelog.json` jest odrzucany z instrukcją naprawy. Escape hatch: `[no-changelog]` w treści commit message dla zmian realnie niewidocznych dla usera.

```sh
case "$SUBJECT" in
  feat\(*web*\)* | fix\(*web*\)* | perf\(*web*\)*) ;;
  *) exit 0 ;;
esac
grep -q '\[no-changelog\]' "$MSG_FILE" && exit 0
git diff --cached --name-only | grep -q '^packages/sleeper-web/public/changelog\.json$' && exit 0
# ... komunikat błędu ...
exit 1
```

3. **Samoinstalacja**: root `package.json` → `"prepare": "git config core.hooksPath .githooks"` (uruchamia się przy `pnpm install`; świeży klon dostaje hook automatycznie).
4. **Ochrona przed regresją**: test w `version-sync.test.ts` — `.githooks/commit-msg` istnieje i ma bit wykonywalności (`stat.mode & 0o111`).
5. **Dokumentacja**: sekcja „Changelog dla usera — OBOWIĄZKOWE” w CLAUDE.md.

Podział odpowiedzialności: hook pilnuje **obecności** wpisu w commicie; vitest-invariant pilnuje **spójności** wersji. Razem domykają obie luki.

## Komendy diagnostyczne

```bash
# czy hook jest zainstalowany?
git config core.hooksPath          # oczekiwane: .githooks

# test hooka bez commitowania
echo "feat(web): x" > /tmp/msg && .githooks/commit-msg /tmp/msg; echo $?

# czy ostatni deploy miał wpis? (top changelogu vs wersja appki)
head -8 packages/sleeper-web/public/changelog.json
grep '"version"' packages/sleeper-web/app.json packages/sleeper-web/package.json
```

## Zapobieganie

- Reguła procesowa bez deterministycznego wymuszenia (hook/test/CI) będzie pomijana — dokumentacja to za mało.
- Gdy istniejący invariant ma świadome ograniczenie (tu: komentarz „test NIE wykryje sytuacji zapomniano całego wpisu”), traktuj je jako dług — zmaterializuje się.
- Hooki gita trzymaj wersjonowane w `.githooks/` + `core.hooksPath` przez `prepare` script; hooki wrzucane ręcznie do `.git/hooks/` giną przy klonie.

## Powiązane

- `docs/solutions/testing-issues/2026-06-06-static-invariants-testing-strategy.md` — filozofia lekkich invariantów; ten przypadek pokazuje granicę: invariant statyczny nie wykryje „braku zmiany”, do tego potrzebny hook na granicy commitu.
- `docs/commits/2026-06-25-c72c497-changelog-announce-deploys.md` — wprowadzenie mechanizmu changelogu.

## Kontekst

Solo dev, deploy = `git push origin main` → Vercel. Baner „co nowego” to jedyny kanał informowania usera o zmianach i konieczności odświeżenia PWA (service worker network-first na HTML, ale stary bundle w pamięci do reloadu). Wpis w changelogu jest więc de facto częścią deployu, nie opcjonalną dokumentacją.
