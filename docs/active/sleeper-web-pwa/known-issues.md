# Known issues po autopilocie

Lista findingow swiadomie odlozonych (graceful deferral) w trakcie autopilot review.
Kazdy wpis ma jasny owner (IU lub manual checklist) i nie blokuje obecnej fazy.

## Faza 2 — Data Layer (graceful P2)

- **P2.1: useFocusEffect web cross-midnight edge** — verify w IU10 manual test.
  - Plik: `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts:66`
  - Powod odlozenia: hook nie ma konsumenta w Fazie 2 (`(app)/` ekrany dopiero w IU10). Strukturalnie zalezne od UI — nie ma sensu fixowac przed dodaniem komponentu konsumujacego. Parytet 1:1 z sleeper-app zachowany.
  - Action item dla IU10: po dodaniu RecommendationCard do `(app)/index.tsx` zostaw PWA otwarte ~23:55, sprawdz po polnocy czy queryKey sie odswiezyl. Jesli failuje — fallback: `useEffect` z `setInterval` co 5min sprawdzajacy `dayKeyInAppTz(new Date())` vs stale.

- **P2.3: console.warn missing env vars / notifications fallback** — fix w IU11 (deploy hardening).
  - Plik: `packages/sleeper-web/src/features/sessions/hooks.ts:293-295` (useEndSession fallback warning) + `packages/sleeper-web/src/lib/supabase.ts:11-16` (P3 missing env vars warning).
  - Powod odlozenia: parytet z sleeper-app. Fix centralny — `babel-plugin-transform-remove-console` dla `NODE_ENV === 'production'` w IU11 (PWA shell config) elimuje wszystkie console.* leaki naraz bez dotykania kodu domeny.
  - Action item dla IU11: dodaj `babel-plugin-transform-remove-console` do devDeps + plugin w `babel.config.js` pod warunkiem `process.env.NODE_ENV === 'production'`.
