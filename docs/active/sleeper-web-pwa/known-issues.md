# Known issues po autopilocie

Lista findingow swiadomie odlozonych (graceful deferral) w trakcie autopilot review.
Kazdy wpis ma jasny owner (IU lub manual checklist) i nie blokuje obecnej fazy.

## Faza 2 — Data Layer (graceful P2)

- ~~**P2.1: useFocusEffect web cross-midnight edge** — verify w IU10 manual test.~~
  - **ROZWIAZANE** w cyklu 1 review Fazy 3 (2026-06-06): dodany preventywny `useEffect` z `setInterval(checkDayKey, 5 * 60 * 1000)` w `useSleepRecommendation.ts` invalidate `['sessions', child.id]` gdy `dayKeyInAppTz(new Date()) !== dayKey`.

- ~~**P2.3: console.warn missing env vars / notifications fallback** — fix w IU11 (deploy hardening).~~
  - **ROZWIAZANE** w Fazie 4 IU11 (2026-06-06, commit `690569d`): `packages/sleeper-web/babel.config.js` ma `babel-plugin-transform-remove-console` z `exclude: ['error']` pod `NODE_ENV=production`. Eliminuje wszystkie `console.warn/log` leaki naraz (hooks.ts, supabase.ts dev warn, Faza 3 P3.2).

## Faza 3 — UI & Routes (graceful P3)

P3s z review Fazy 3 swiadomie odlozone (kosmetyka / informacyjne) — bez wplywu na funkcjonalnosc.

- **P3.1: TimePickerField/DatePickerField inline `style={{...}}` zamiast Tailwind `className`** — odlozone do post-MVP polish (kosmetyka, nie blokuje deploy). Pliki: `packages/sleeper-web/src/components/TimePickerField.tsx:68-93`, `DatePickerField.tsx:71-97`.
- ~~**P3.2: console.warn w prod bundle**~~ — **ROZWIAZANE** w Fazie 4 IU11 przez `babel-plugin-transform-remove-console` w `babel.config.js` (commit `690569d`).
- **P3.3: BigActionButton CSS scale zamiast reanimated `useAnimatedStyle`** — visual polish post-MVP. Mobile smooth, web "twardy snap". Akceptowalne dla MVP. Plik: `packages/sleeper-web/src/components/BigActionButton.tsx:49-53`.
- **P3.4: pickers a11y `aria-label` zamiast `aria-labelledby`** — best practice, marginalna roznica dla screen reader. Plik: `packages/sleeper-web/src/components/TimePickerField.tsx:74`, `DatePickerField.tsx:78`.
- **P3.5: `lucide-react-native` w `BigActionButton.tsx:2` mimo aliasu** — informacyjne (alias w metro.config.js dziala). Plik: `packages/sleeper-web/src/components/BigActionButton.tsx:2`. Action item: dokumentacja w `learned-patterns.md` (Web aliasing zachowuje source-level parity) — TODO przy `/dev-compound`.

## Faza 4 — PWA & Deploy (open follow-ups)

Pozostale zadania zaadresowane:
- **Wszystkie P2 z Faz 1+2** ZAADRESOWANE w IU11 (commit `690569d`) — patrz `sleeper-web-pwa-zadania.md` sekcja "Do poprawy po review fazy 1/2".
- **Wszystkie P3 (kosmetyka)** — czesc rozwiazana (P3.2 console.warn), czesc swiadomie odlozone do post-MVP polish.

### Cykl 1 fixów post-review fazy 4 (2026-06-06)

**Zaadresowane:** 3 P2 (P2.1 babel + NODE_ENV guards, P2.2 README move, P2.3 SW network-first) + 3 P3 (P3.1 regex escape, P3.3 PKCE invariant test, P3.5 security headers).

**Swiadomie deferred do post-MVP polish:**
- **P3.2: manifest.json `purpose: "any maskable"` bez dedicated assets** — wymaga regeneracji ikon przez maskable.app/ z safe-area padding (~10% inset). Manualny chore wymagajacy graphic asset. Risk: niski (mozliwe obciecie logo na Pixel/Samsung adaptive icons). Akcja: post-MVP w trakcie polish faz UI.
- **P3.4: auto-inject git SHA do CACHE_NAME postbuild** — manualny bump nadal OK, P2.3 fix (network-first dla nawigacji) drastycznie obniza ryzyko stale-cache. ~10 LOC postbuild script `scripts/inject-sw-version.sh`. Akcja: jesli operator zapomni bump 2+ razy w trakcie pierwszych deployow, zaimplementowac auto-inject.

**USER ACTION ITEMS** (deploy + mobile-manual — nie blokuja kodowo zakonczonej fazy):
- Konfiguracja Vercel project (root, build command, output, Node 22) — `docs/runbook/sleeper-web-deploy.md` sekcja 1.
- Env vars w Vercel: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Production + Preview + Development).
- Supabase Auth URL Configuration: dodaj prod URL do Site URL + Redirect URLs (PKCE wymaga).
- Lighthouse PWA audit po deploy.
- Add to Home Screen + standalone test na iPhone Safari (operator + partner).
- Cross-device sync test (PWA vs sleeper-app Expo Go).
