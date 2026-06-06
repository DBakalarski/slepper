# e926490: fix(sleeper-web): serif fallback fontu i wolne miejsce pod tab barem na iOS PWA

**Data:** 2026-06-06
**Branch:** main
**Faza zadania:** n/a (hotfix post-deploy sleeper-web-pwa)

## Co zostalo zrobione

Dwa wizualne fixy zgloszone przez usera na iOS PWA standalone:

1. **Czcionka serif zamiast sans-serif** — timer, przyciski, naglowki renderowaly sie w Times New Roman zamiast SF Pro. Tailwind config mial `fontFamily.display/mono: ['System']` — token RN ktory `react-native-web` NIE tlumaczy. CSS dostawal literal `font-family: System` (custom font name, nie istnieje) -> iOS Safari standalone PWA fallback do default user-agent font, ktory dla standalone mode jest Times New Roman. Fix: zmiana na real web stack (`-apple-system, BlinkMacSystemFont, ...`).

2. **Wolne miejsce pod tab barem** — pas tla cream/navy pod tab barem siegajacy do iOS home bar. Trzy przyczyny: `SafeAreaView`/`SafeAreaProvider` na web sa no-op (zwracaja 0 insets), tab bar (`Tabs` z expo-router) nie injectuje `padding-bottom: env(safe-area-inset-bottom)`, `body { height: 100% }` zamiast `100dvh`. Fix: CSS w `index.html` — `100dvh` z fallback, `div[role="tablist"] { padding-bottom: env(safe-area-inset-bottom) }`, dark body bg `#0F0F1A` -> `#0F0D26` zeby matchowal tab bar.

## Zmienione pliki

- `packages/sleeper-web/tailwind.config.js` — `fontFamily.display`/`fontFamily.mono` z `['System']` na real web stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...` dla display; `ui-monospace, SFMono-Regular, Menlo, ...` dla mono)
- `packages/sleeper-web/public/index.html` — `<style id="expo-reset">`: `100dvh` z fallback `100%` dla `html/body/#root`, dark bg `#0F0F1A` -> `#0F0D26`, nowa regula `div[role="tablist"] { padding-bottom: env(safe-area-inset-bottom) }`
- `packages/sleeper-web/src/features/pwa/__tests__/registerSW.test.ts` — invariant test FOWT bg zaktualizowany pod nowy dark `#0F0D26`

## Powod / kontekst

Hotfix po deploy sleeper-web-pwa (kod gotowy 2026-06-06). User zglosil dwa bugi na zainstalowanym PWA na iOS:
- timer "00:15:05" i przyciski w serifie
- pas wolnego miejsca pod tab barem

Plan: `~/.claude/plans/na-pwa-dziwna-czcionka-quizzical-pillow.md`.

Wybor system font stack (nie Spline Sans z Google Fonts) — user wybral system stack jako Recommended: zero zewnetrznych request, natywny look identyczny jak natywna app sleeper-app.

Bez zmian w sleeper-app — RN runtime poprawnie tlumaczy `'System'` na iOS/Android, tylko web ma problem.

## Walidacja

- typecheck (`pnpm --filter sleeper-web exec tsc --noEmit`): PASS
- lint (`pnpm --filter sleeper-web lint`): PASS
- test (`pnpm --filter sleeper-web test`): PASS 160/160
- build (`pnpm --filter sleeper-web build`): PASS, `dist/_expo/static/css/web-*.css` zawiera `.font-display{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,...}` (nie `System`); `dist/index.html` zawiera `100dvh` x3 i `div[role="tablist"] { padding-bottom: env(safe-area-inset-bottom) }`
- runtime: do weryfikacji po push -> Vercel auto-deploy -> user testuje on-device na iOS PWA standalone
