# 4a3e3eb: fix(sleeper-web-pwa): poprawki po review fazy 3 (cykl 1)

**Data:** 2026-06-06
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 3 — UI & Routes (review cykl 1/2)

## Co zostalo zrobione

- **P1.1 fix (bundle parse error / white screen):** custom `resolver.resolveRequest` w `metro.config.js` wymuszajacy CJS buildy zustand na web (`zustand`, `zustand/middleware`, `zustand/vanilla`, `zustand/react`, `zustand/shallow`, `zustand/traditional` → `.js`). ESM `esm/middleware.mjs` uzywa `import.meta.env.MODE` (Vite-style guard), Metro web target NIE transformuje `import.meta` → raw token w classic `<script defer>` powodowal `Uncaught SyntaxError`. Po fixie `grep -c "import.meta" dist/_expo/static/js/web/entry-*.js` = **0**, V8 `new Function(bundle)` parsuje cleanly.
- **P2.1 fix (Alert.alert no-op na web):** nowy `src/lib/confirm.ts` z `confirmAction(): Promise<boolean>` (Platform.OS guard — `window.confirm` na web, `Alert.alert` z Promise wrapper na native, rozwiazanie w `onPress` i `onDismiss`). Callsite `session/[id].tsx::handleDelete` + `PendingInvitationsList.tsx::handleRevoke` przepisane na `async/await` z early return na cancel.
- **P2.2 fix (cross-midnight refresh):** `useEffect` z `setInterval(checkDayKey, 5 * 60 * 1000)` w `useSleepRecommendation.ts` invalidate `['sessions', child.id]` gdy `dayKeyInAppTz(new Date()) !== dayKey`. Cleanup `clearInterval` w return.
- **P2.3 fix (Wake Lock API):** ~40 LOC w `sleep-fullscreen.tsx` — `navigator.wakeLock?.request('screen')` w `useEffect` z Platform.OS guard + graceful try/catch + re-acquire na `visibilitychange` (Safari zwalnia sentinel po zwroceniu focusu). Lokalne typy `WakeLockSentinelLike` + `NavigatorWithWakeLock` (bez dotykania `tsconfig.lib`).
- **P2.4 fix (testy form components):** 4 nowe test suites (37 cases) wzorcem "static invariants + pure-function pipeline" z `pickers.test.ts`:
  - `SessionEditForm.test.ts` (10) — TZ-safe merge, brak `setHours`/`setDate`, brak `Alert`, hooked-up Picker/Chip.
  - `BackdatedSessionModal.test.ts` (12) — `addDaysInAppTz` (NIE `+86400000`), regex HH:MM / YYYY-MM-DD, pipeline cross-day night sleep `22:00 → 06:30`.
  - `PendingInvitationsList.test.ts` (6) — wymusza `confirmAction` invariant, brak `Alert`.
  - `confirm.test.ts` (9) — kontrakt Platform.OS guard, `Promise<boolean>`, native sciezka resolves w `onPress`/`onDismiss`.
- Aktualizacja `known-issues.md`: P2.1 Fazy 2 oznaczony jako rozwiazany (cross-midnight fix), P3.1-P3.5 z Fazy 3 udokumentowane jako deferred do IU11/polish.
- Aktualizacja `sleeper-web-pwa-zadania.md`: sekcja "Do poprawy po review fazy 3" — wszystkie P1+P2 odznaczone `[x]` z opisem fixu.

## Zmienione pliki

- `packages/sleeper-web/metro.config.js` — custom `resolveRequest` dla zustand → CJS na web (P1.1).
- `packages/sleeper-web/src/lib/confirm.ts` — NEW, cross-platform `confirmAction` (P2.1).
- `packages/sleeper-web/src/lib/__tests__/confirm.test.ts` — NEW, 9 static-invariant cases (P2.4).
- `packages/sleeper-web/src/app/(app)/session/[id].tsx` — drop Alert, use confirmAction async (P2.1).
- `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` — Wake Lock API useEffect (P2.3).
- `packages/sleeper-web/src/features/family/components/PendingInvitationsList.tsx` — drop Alert, use confirmAction (P2.1).
- `packages/sleeper-web/src/features/family/components/__tests__/PendingInvitationsList.test.ts` — NEW, 6 cases (P2.4).
- `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts` — setInterval 5min dayKey check (P2.2).
- `packages/sleeper-web/src/features/sessions/components/__tests__/SessionEditForm.test.ts` — NEW, 10 cases (P2.4).
- `packages/sleeper-web/src/features/sessions/components/__tests__/BackdatedSessionModal.test.ts` — NEW, 12 cases + cross-day pipeline (P2.4).
- `docs/active/sleeper-web-pwa/known-issues.md` — P2.1 Fazy 2 closed, Faza 3 P3s added.
- `docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md` — sekcja Fazy 3 odznaczona, status aktualny.
- `docs/active/sleeper-web-pwa/sleeper-web-pwa-kontekst.md` — sekcja "Code review Fazy 3" (raport).
- `docs/active/sleeper-web-pwa/review-faza-3.md` — NEW, pelny raport review.
- `docs/active/sleeper-web-pwa/manual-test-faza-3.md` — NEW, manual checklist.

## Powod / kontekst

Review Fazy 3 wykryl P1.1 (white screen przez `import.meta` zustand@5 ESM) plus 4 P2 (`Alert.alert` no-op, brak cross-midnight refresh fallback, brak Wake Lock fallback, brak testow form components). P1 blokowal Faze 4 deploy (PWA nie wstaje ani lokalnie ani na Vercel), P2 — funkcjonalne gap-y zauwazone wczesnie. Cykl 1 z 2 autopilot dev-docs-execute → review → execute.

`resolver.alias` ze stringiem byl rekomendacja review, ale w praktyce niewystarczajacy gdy `package.json#exports` kieruje na `.mjs`. Custom `resolveRequest` dziala deterministycznie — wymusza CJS niezaleznie od condition resolution.

## Walidacja

- typecheck (`pnpm --filter sleeper-web exec tsc --noEmit`): PASS (0 errors)
- lint (`pnpm --filter sleeper-web lint`): PASS (0 errors)
- test (`pnpm --filter sleeper-web test`): PASS (12 files, **119/119** cases, byly 82)
- build (`pnpm --filter sleeper-web build`): PASS (bundle 4.42 MB, parsuje sie jako classic script)
- regresja sleeper-app (`pnpm --filter sleeper-app exec tsc --noEmit`): PASS
- E2E smoke (dist + python http.server + curl + V8 `new Function`):
  - HTTP 200 dla `index.html` + bundle download (4422131 B)
  - `grep -c "import.meta" dist/_expo/static/js/web/entry-*.js` → **0**
  - `new Function(bundleSrc)` → **PASS** (no SyntaxError)
- runtime: weryfikacja headless przez Node V8 parser (Playwright/browser smoke pending dla operatora przy IU11)
