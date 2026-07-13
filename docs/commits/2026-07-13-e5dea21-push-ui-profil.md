# e5dea21: feat(web): powiadomienia push o zblizajacym sie snie (toggle w Profilu)

**Data:** 2026-07-13
**Branch:** feature/web-push-notifications
**Faza zadania:** web-push-notifications Task 5

## Co zostalo zrobione
- `usePushSettings`: query `['push-settings']` (support + endpoint biezacej subskrypcji SW + wiersz `push_subscriptions`), mutacje enable (subscribeToPush -> upsert onConflict endpoint), disable (`enabled=false`, subskrypcja zostaje — ponowne wlaczenie bez nowej zgody), setLeadMinutes; stan `permissionDenied` dla UI.
- `NotificationsBottomSheet`: wzorzec ThemeModeBottomSheet (RN Modal); toggle "Przypomnienie o snie" + chipsy wyprzedzenia 5/10/15/20/30 min; komunikaty: needs-install (iOS bez standalone), unsupported, permission denied z instrukcja iOS.
- `profile.tsx`: placeholder "Przypomnienia" podpiety do sheeta, value Wlaczone/Wylaczone z hooka.
- Changelog v11 + bump `0.11.0` w app.json i package.json (ten sam commit — hook commit-msg).
- Testy: static invariants dla warstwy notifications (push API tylko przez lib/push, stabilny queryKey, onConflict endpoint, sheet bez supabase, profil bez placeholdera). Przy okazji fix warningow `import/first` w testach sessions (vi.hoisted + importy na gorze).

## Zmienione pliki
- `packages/sleeper-web/src/features/notifications/usePushSettings.ts` — nowy hook
- `packages/sleeper-web/src/features/notifications/NotificationsBottomSheet.tsx` — nowy sheet
- `packages/sleeper-web/src/features/notifications/__tests__/usePushSettings.test.ts` — invarianty
- `packages/sleeper-web/src/app/(app)/profile.tsx` — podpiecie sheeta
- `packages/sleeper-web/public/changelog.json` — wpis v11
- `packages/sleeper-web/app.json`, `packages/sleeper-web/package.json` — 0.11.0
- `packages/sleeper-web/src/features/sessions/__tests__/*.test.ts` — lint fix (import/first)

## Powod / kontekst
Ostatni element klienta web push (spec Task 5). Per-device toggle zgodnie z decyzja usera z brainstormingu; wyprzedzenie konfigurowalne per urzadzenie.

## Walidacja
- typecheck: PASS
- test: PASS (360/360 caly web suite)
- lint: PASS (0 problems)
- runtime: wymaga deployu (migracja + funkcja + VAPID) — manual smoke checklist w runbooku (Task 6)
