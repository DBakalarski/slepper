# 70c2989: chore(repo): usuń deprecated aplikację mobilną (sleeper-app), web-only

**Data:** 2026-06-24
**Branch:** main
**Faza zadania:** n/a (cleanup / deprecation)

## Co zostalo zrobione
- Skasowano cały pakiet `packages/sleeper-app/` (Expo mobile) — aplikacja mobilna uznana za deprecated. Projekt jest teraz wyłącznie PWA (`packages/sleeper-web/`).
- Przeniesiono `supabase/` (12 migracji + `config.toml` + `.gitignore`) z `sleeper-app/` do `packages/sleeper-web/supabase/`. To był schema source-of-truth wspóldzielonej bazy Supabase, a `sleeper-web` nie miał własnej kopii — bez przeniesienia migracje zostałyby osierocone.
- Zaktualizowano `package.json` (root): usunięto skrypty `app:dev` / `app:ios` / `app:android`, poprawiono opis monorepo.
- Przeliczono `pnpm-lock.yaml` (`pnpm install`, −178 paczek).
- Zaktualizowano CLAUDE.md pod web-only: sekcja Scope, drzewo repo, tabela Stack (ścieżka package.json, notyfikacje/wake → web wrappery, alias lucide), komendy walidacji, runtime, "Czego NIE robic".
- Usunięto przestarzałe root scratch-docs: `manual.md` (Expo Go checklist), `design.md` (zarchiwizowane w `docs/completed/ui-redesign/`), `window-machine.md` (mobile-only plan).
- Zaktualizowano `.claude/agents/`: `feature-builder-{ui,data,fullstack}`, `auto-error-resolver`, `architecture-strategist` — ścieżki `sleeper-app`→`sleeper-web`, toolchain `npm`/Jest/Expo Go → `pnpm`/vitest/przeglądarka (guidance RN-komponentów zostaje — web używa react-native-web).

## Zmienione pliki
- `packages/sleeper-app/**` — usunięte (115 plików tracked + artefakty untracked).
- `packages/sleeper-web/supabase/**` — przeniesione z `sleeper-app/supabase/` (git mv, 13 plików jako rename).
- `package.json` — usunięte skrypty mobile + opis.
- `pnpm-lock.yaml` — przeliczony.
- `CLAUDE.md` — web-only.
- `manual.md`, `design.md`, `window-machine.md` — usunięte (obsolete root scratch).
- `.claude/agents/feature-builder-ui.md`, `feature-builder-data.md`, `feature-builder-fullstack.md`, `auto-error-resolver.md`, `architecture-strategist.md` — retarget na sleeper-web.

## Powod / kontekst
User: "wersje aplikacji mobilnej uznaj za deprecated, nic tam juz nie zmieniaj, mozna ja usunac. zostaw tylko pwa." `sleeper-web` nie zależał od `sleeper-app` jako pakiet (tylko komentarze referencyjne), więc usunięcie nic nie zepsuło. Jedyne realne ryzyko — migracje Supabase w `sleeper-app/supabase/` — rozwiązane przez `git mv` do `sleeper-web`.

Pozostawione świadomie (NIE zmieniane):
- `docs/solutions/`, `docs/plans/`, `docs/dev-brainstorms/` — historyczna baza wiedzy.
- `docs/active/` (2 foldery mobile-only) — oznaczone jako obsolete w CLAUDE.md; pierwotne notatki sugerowały możliwy port pomysłów na web.
- Komentarze provenance w źródłach/configach `sleeper-web` ("parity z sleeper-app").
- `.claude/settings.local.json` — lokalny allowlist (gitignored).

Do osobnego, większego passa (flagged userowi): głębsza migracja skilli `expo-rn-testing`, agenta `mobile-feature-tester` i mobilnych założeń testowych w pipeline `dev-*` — wymaga ustalenia web testing strategy.

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-web exec tsc --noEmit`)
- test: PASS (vitest, 162/162)
- lint + invariants + expo export: PASS (`pnpm web:build:check`)
- runtime: n/a (brak zmian runtime; deletion + docs)
