# Known issues po autopilocie

Lista findingow swiadomie odlozonych (graceful deferral) w trakcie autopilot review.
Kazdy wpis ma jasny owner (IU lub manual checklist) i nie blokuje obecnej fazy.

## Faza 2 — Data Layer (graceful P2)

- ~~**P2.1: useFocusEffect web cross-midnight edge** — verify w IU10 manual test.~~
  - **ROZWIAZANE** w cyklu 1 review Fazy 3 (2026-06-06): dodany preventywny `useEffect` z `setInterval(checkDayKey, 5 * 60 * 1000)` w `useSleepRecommendation.ts` invalidate `['sessions', child.id]` gdy `dayKeyInAppTz(new Date()) !== dayKey`.

- **P2.3: console.warn missing env vars / notifications fallback** — fix w IU11 (deploy hardening).
  - Plik: `packages/sleeper-web/src/features/sessions/hooks.ts:293-295` (useEndSession fallback warning) + `packages/sleeper-web/src/lib/supabase.ts:11-16` (P3 missing env vars warning).
  - Powod odlozenia: parytet z sleeper-app. Fix centralny — `babel-plugin-transform-remove-console` dla `NODE_ENV === 'production'` w IU11 (PWA shell config) elimuje wszystkie console.* leaki naraz bez dotykania kodu domeny.
  - Action item dla IU11: dodaj `babel-plugin-transform-remove-console` do devDeps + plugin w `babel.config.js` pod warunkiem `process.env.NODE_ENV === 'production'`.

## Faza 3 — UI & Routes (graceful P3)

P3s z review Fazy 3 swiadomie odlozone (kosmetyka / informacyjne) — bez wplywu na funkcjonalnosc.

- **P3.1: TimePickerField/DatePickerField inline `style={{...}}` zamiast Tailwind `className`** — odlozone do IU11/polish, kosmetyka. Pliki: `packages/sleeper-web/src/components/TimePickerField.tsx:68-93`, `DatePickerField.tsx:71-97`.
- **P3.2: console.warn w prod bundle** — pokryte przez P2.3 z Fazy 2 (`babel-plugin-transform-remove-console` w IU11). Plik: `packages/sleeper-web/src/features/sessions/hooks.ts:293`.
- **P3.3: BigActionButton CSS scale zamiast reanimated `useAnimatedStyle`** — visual polish. Mobile smooth, web "twardy snap". Akceptowalne dla MVP. Plik: `packages/sleeper-web/src/components/BigActionButton.tsx:49-53`.
- **P3.4: pickers a11y `aria-label` zamiast `aria-labelledby`** — best practice, marginalna roznica dla screen reader. Plik: `packages/sleeper-web/src/components/TimePickerField.tsx:74`, `DatePickerField.tsx:78`.
- **P3.5: `lucide-react-native` w `BigActionButton.tsx:2` mimo aliasu** — informacyjne (alias w metro.config.js dziala). Plik: `packages/sleeper-web/src/components/BigActionButton.tsx:2`. Action item: dokumentacja w `learned-patterns.md` (Web aliasing zachowuje source-level parity) — TODO przy `/dev-compound`.
