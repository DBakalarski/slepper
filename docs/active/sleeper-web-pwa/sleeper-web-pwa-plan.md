---
title: Sleeper Web — PWA jako osobny package
branch: feature/sleeper-web-pwa
ostatnia_aktualizacja: 2026-06-05
status: active
---

# Sleeper Web — PWA jako osobny package

**Branch:** `feature/sleeper-web-pwa`
**Ostatnia aktualizacja:** 2026-06-05

## Podsumowanie wykonawcze

Tworzymy nowy package `packages/sleeper-web/` jako Expo SDK 54 web-only PWA z portem feature'ów sleeper-app (start/stop sesji, edycja historii, algorytmy Galland/Kotki + smart-start). PWA współdzieli bazę Supabase z sleeper-app — cross-device sync między mobile (Expo Go) i web (PWA na iPhone Safari) działa identycznie. **Cel:** dystrybucja sleeper'a na iPhone'y bez Apple Developer license ($99/rok). **Granica:** zero modyfikacji w `packages/sleeper-app/`.

## Cele i zakres

### Cele
1. Dostarczyć PWA dystrybuowalną na iPhone bez Apple Developer license.
2. Zachować feature-parity ze sleeper-app dla: start/stop, edycja historii, cross-day night sleeps, algorytmy + rekomendacje.
3. Pełna izolacja od sleeper-app — zero ryzyka regresji w mobile.
4. Cross-device sync between PWA i Expo Go via Supabase Realtime.

### Out of scope
- Push notifications (świadomie wykluczone, iOS Safari limitations)
- Działanie w tle / background tasks
- Desktop-first UI (mobile-first wystarczy)
- Shared lib package (YAGNI, kopiowanie 1:1)
- Modyfikacje sleeper-app
- Next.js / inny framework

## Analiza obecnego stanu

- `packages/sleeper-app/` — Expo SDK 54, RN 0.81, NativeWind v4, Supabase, TanStack Query, Zustand. **`react-native-web ~0.21.0` JUŻ w deps** (Expo Web gotowe).
- `app.json` w sleeper-app ma `web.output: "static"` — wzorzec gotowy do skopiowania.
- Auth: email + password Supabase (`signInWithPassword`) — ZERO OAuth, trywialny port na web.
- `src/lib/time.ts` — DST-safe helpery (`combineDateAndTimeInAppTz`, `dayKeyInAppTz`, `addDaysInAppTz`). Kopia 1:1.
- `src/features/sessions/hooks.ts` — 9 hooks (queries + mutations + optimistic). Kopia 1:1, side effects mock.
- Algorytmy `sleeper-machine` (Galland) i `sleeper-machine-kotki` — workspace deps, framework-agnostic TS, działają OOTB.
- Brak `docs/DESIGN.md` i brak Figmy — PWA jako port 1:1 sleeper-app (tailwind.config + komponenty = source of truth).

## Proponowany stan docelowy

- `packages/sleeper-web/` jako Expo SDK 54 web-only package z kompletnym portem feature'ów.
- Konfiguracja deploymentu na Vercel (free hobby tier), env vars dla `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`.
- PWA installable (manifest + service worker + iOS meta tagi), Lighthouse PWA audit pass.
- Build pipeline: `pnpm --filter sleeper-web build` → `dist/` → Vercel auto-deploy z `main`.
- User + partner instalują PWA na iPhone (Safari → Add to Home Screen) i używają jako alternatywę do Expo Go.

## Fazy wdrożenia

### Faza 1: Bootstrap & Foundation (IU1-IU4)

Cel: package skeleton + lib copy + Auth + Theme — po fazie PWA loguje się i ma podstawowe ramy.

- **IU1: Bootstrap package skeleton** (S) — config files, deps, scripts. `pnpm --filter sleeper-web start --web` działa.
- **IU2: Foundation lib (time, supabase, query-client, error utils)** (M) — copy 1:1 + `notifications.ts` no-op mock + `detectSessionInUrl: true`.
- **IU3: Auth flow** (M) — AuthProvider + sign-in/sign-up. Logowanie tym samym kontem co mobile.
- **IU4: Theme system** (S) — ThemeProvider + useEffectiveTheme + tri-state (System/Light/Dark).

**Kryteria akceptacji Fazy 1:**
- `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- User loguje się tym samym kontem co w sleeper-app, sesja persistuje po reload.
- Tri-state theme przełącza się i persistuje w localStorage.

### Faza 2: Data Layer (IU5-IU7)

Cel: cała logika domenowa działa — sessions, children/family, recommendations.

- **IU5: Sessions data layer** (M) — hooks + Realtime + timer. Schedule-nap side effects no-op.
- **IU6: Children + family data layer** (S) — hooks + useActiveChild Zustand.
- **IU7: Recommendation data + algorytm wiring** (S) — adapter + useSleepRecommendation + RecommendationCard.

**Kryteria akceptacji Fazy 2:**
- `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi.
- `pnpm --filter sleeper-machine build && pnpm --filter sleeper-machine-kotki build` produkują `dist/`.
- Wszystkie hooks eksportowane i resolvują się.

### Faza 3: UI & Routes (IU8-IU10)

Cel: pełna funkcjonalność UI feature-parity.

- **IU8: UI components + web pickers** (L) — base UI + feature components + HTML5 `<input type="time"/date">` wrapper.
- **IU9: Routes (auth)** (S) — auth gate między `(auth)` a `(app)` w `_layout.tsx`.
- **IU10: Routes (app) — main screens** (XL) — index, history, profile, settings, stats, sleep-fullscreen, child/[id], session/[id].

**Kryteria akceptacji Fazy 3:**
- Wszystkie screens renderują się bez błędów konsoli w Safari iOS.
- TimePicker/DatePicker pokazują natywne iOS wheel pickery.
- Cross-day night sleep edit (22:00 → 06:00) zapisuje `end_at` na następnym dniu.
- Cross-device sync: start sesji w PWA → widoczne w sleeper-app via Realtime.

### Faza 4: PWA & Deploy (IU11-IU12)

Cel: instalowalność + production hosting.

- **IU11: PWA shell** (M) — manifest.json, sw.js, iOS meta tagi, ikony, `+html.tsx` custom HTML wrapper.
- **IU12: Build pipeline + Vercel deploy** (M) — `expo export --platform web`, Vercel project config, env vars, prod URL.

**Kryteria akceptacji Fazy 4:**
- Lighthouse PWA audit: installable ✓, service worker ✓, manifest valid ✓.
- Safari iOS → Add to Home Screen → standalone PWA launch.
- Production URL działa, login + cross-device sync z sleeper-app.

## Ocena ryzyka i strategie mitygacji

| Ryzyko | Wpływ | Mitygacja |
|---|---|---|
| Reanimated 4 worklets na web nie działają dla wszystkich animacji | M | Fallback CSS: NativeWind `active:scale-95` / `animate-pulse` zamiast Animated.View |
| iOS Safari PWA quirks runtime (input zoom, keyboard, safe-area) | M | Testowanie on-device w IU11; viewport-fit=cover + `text-base` (16px) na inputs |
| SW serwuje stale JS po deploy | M | Hardcoded version `sleeper-shell-v{N}` bump przy każdym deploy + activate handler clean |
| Feature drift sleeper-web ↔ sleeper-app | H | Świadomy trade-off; re-sync co 2-4 tyg lub przy znaczącej zmianie domeny |
| `lucide-react-native` na web (wymaga `react-native-svg`) | L | Fallback do `lucide-react` (pure DOM) jeśli problem |
| Vercel free tier quota | L | User + partner generują <1% limitu, monitorować |
| Initial PWA install wymaga sieci (SW reg) | L | OK, jednorazowo |

## Mierniki sukcesu

- User i partner zainstalowali PWA na iPhone, otwierają z home screen jako codzienne narzędzie.
- Cross-device sync: zmiana w PWA pojawia się w sleeper-app w <2s (Realtime WS).
- Sleeper-app (mobile) bez regresji — `pnpm --filter sleeper-app exec tsc --noEmit` przechodzi, smoke test mobile OK.
- Lighthouse PWA audit: 100% installable.
- Build pipeline: `pnpm --filter sleeper-web build` < 60s, deploy Vercel < 90s.

## Wymagane zasoby i zależności

**Workspace deps (już istnieją):**
- `sleeper-machine` (Galland algorithm)
- `sleeper-machine-kotki` (Kotki Dwa algorithm)

**Nowe deps (per sleeper-web/package.json):**
- Expo SDK 54 stack (mirror sleeper-app minus native-only)
- `react-native-web ~0.21.0`, `react-dom 19.1.0`

**Zewnętrzne:**
- Konto Vercel (free hobby tier)
- Zmienne środowiskowe `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (te same co sleeper-app)
- iPhone (Safari) do manual testing on-device

**Pre-build dependency:**
- `pnpm --filter sleeper-machine build` przed pierwszym `tsc --noEmit` w sleeper-web
- `pnpm --filter sleeper-machine-kotki build` j.w.

## Szacunki czasowe

| Faza | Estymata | Komentarz |
|---|---|---|
| Faza 1 (IU1-4) | 1-2 dni | Foundation, dużo plików ale prostych kopii |
| Faza 2 (IU5-7) | 1 dzień | Data hooks, copy + mock side effects |
| Faza 3 (IU8-10) | 3-5 dni | UI największa praca, IU10 może wymagać podziału |
| Faza 4 (IU11-12) | 1-2 dni | PWA shell + Vercel setup |
| **Razem** | **6-10 dni** | Solo dev, część eksperymentalna (iOS Safari runtime) |

## Kryteria akceptacji projektu

- [ ] Wszystkie 12 IUs ukończone i odznaczone w `sleeper-web-pwa-zadania.md`
- [ ] `packages/sleeper-app/` bez modyfikacji (potwierdzone `git log --oneline packages/sleeper-app/`)
- [ ] `pnpm --filter sleeper-web exec tsc --noEmit` przechodzi
- [ ] `pnpm --filter sleeper-web lint` przechodzi
- [ ] `pnpm --filter sleeper-web test` przechodzi
- [ ] `pnpm --filter sleeper-web build` produkuje `dist/`
- [ ] Mobile smoke test sleeper-app — bez regresji
- [ ] PWA installable z prod URL na iPhone Safari
- [ ] Cross-device sync potwierdzony (PWA ↔ sleeper-app)
- [ ] Lighthouse PWA audit pass

## Źródła

- Requirements doc: `docs/dev-brainstorms/2026-06-05-sleeper-web-pwa-requirements.md`
- Plan techniczny: `docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md`
