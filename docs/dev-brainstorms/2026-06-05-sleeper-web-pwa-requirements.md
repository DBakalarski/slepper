---
date: 2026-06-05
topic: sleeper-web-pwa
---

# Sleeper Web — PWA jako osobny package

## Problem

Sleeper-app działa w Expo Go (dev) i jest używany przez user'a + partnera. Dystrybucja na iPhone'y poza Expo Go wymaga Apple Developer license ($99/rok). User chce uniknąć tego kosztu i mieć stabilniejszą formę dystrybucji niż 30-dniowe builds Expo Go. PWA omija sklepy i działa przez Safari → "Add to Home Screen".

Kluczowi użytkownicy: user + partner, oboje na iPhone'ach. Sleeper to sleep tracker dziecka z cross-device sync via Supabase.

## Wymagania

- **R1.** Stworzyć nowy package `packages/sleeper-web/` jako osobny Expo SDK 54 web-only target (`platforms: ["web"]`). Zero modyfikacji w istniejącym `packages/sleeper-app/` (izolacja od ryzyka regresji).
- **R2.** PWA współdzieli tę samą bazę Supabase co sleeper-app — cross-device sync między mobile (Expo Go) i web (PWA) działa identycznie jak obecny sync między dwoma telefonami.
- **R3.** Feature: start/stop sesji + lista historii (rdzeń sleep tracker).
- **R4.** Feature: pełna edycja historii (czas start/end picker, typ sesji, obsługa cross-day night sleeps zgodnie z istniejącym wzorcem `addDaysInAppTz`).
- **R5.** Feature: algorytmy `sleeper-machine` (Galland) i `sleeper-machine-kotki` + smart-start rekomendacje (per pole `children.algorithm`).
- **R6.** Wybór algorytmu, dziecko, ustawienia użytkownika — zgodne z modelem danych sleeper-app (ten sam schemat tabel, te same RLS policies).
- **R7.** Instalowalność PWA: `manifest.json` (name, icons 192/512, theme_color, display: standalone), service worker (cache shell + offline fallback), ikony, splash screen via meta tagi iOS.
- **R8.** Auth zgodny z sleeper-app — user loguje się tym samym kontem na obu platformach (web flow Supabase Auth zamiast mobilnego, ale ten sam provider).
- **R9.** Strefa czasowa: `Europe/Warsaw` w UI, UTC w bazie — re-implementacja helperów `lib/time` w sleeper-web zgodna 1:1 z sleeper-app (`combineDateAndTimeInAppTz`, `dayKeyInAppTz`, `parseAppTzDateTime`, `addDaysInAppTz`).
- **R10.** UX: mobile-first (PWA głównie na iPhone Safari po "Add to Home Screen"). Desktop layout nie jest celem — telefon-podobny widok na laptopie jest akceptowalny.

## Kryteria sukcesu

- User i partner mogą używać sleeper-web zainstalowanego na ekranie głównym iPhone'a jako codzienne narzędzie (eksperyment, rola finalna otwarta).
- Cross-device sync: zmiana w PWA (start sesji, edycja) pojawia się w sleeper-app (Expo Go) i odwrotnie, w czasie zbliżonym do realtime (Supabase WS).
- User nie kupuje Apple Developer license dla bieżącego use case.
- Sleeper-app (mobile) nie ma regresji — wymaga zero zmian (potwierdzone brakiem commitów w `packages/sleeper-app/` w ramach tego zadania).
- PWA przechodzi Lighthouse PWA audit: installable + service worker + manifest valid.

## Granice scope'u

- **Brak push notifications.** Świadomie wykluczone — iOS Safari PWA wspiera od 16.4 ale wymaga skomplikowanego setup'u (Web Push + VAPID, service worker handler) i jest mniej niezawodne niż APNS. Nie wnosi wystarczającej wartości dla MVP.
- **Brak action w tle.** Sleeper timer to derived state (`start_at` w bazie + setInterval w UI) — działa OOTB bez background tasks. Service Worker NIE jest używany do timera.
- **Brak desktop-first UX.** Mobile-first wystarczy — PWA głównie na iPhone, laptop = sporadyczny use case.
- **Brak shared lib package na start.** Logika domenowa (queries, hooks, lib/time) jest **kopiowana** z sleeper-app do sleeper-web. Wydzielenie do `packages/sleeper-shared/` zostaje odroczone do momentu gdy duplikacja realnie zaboli (YAGNI).
- **Brak modyfikacji w sleeper-app.** Twarda granica — sleeper-app jest tylko źródłem do kopiowania, nie celem refactoru w tym zadaniu.
- **Brak SSR / SEO.** Sleeper to authenticated app, SEO bezsensowne. Hosting = static + client-side routing.
- **Brak Next.js / innego frameworka.** Stack to Expo SDK 54 web (web-only). Świadomy wybór zamiast Next.js żeby ograniczyć cognitive load i nauczyć się Expo web zamiast nowego frameworka.

## Kluczowe decyzje

- **Stack: Expo SDK 54 web-only** w `packages/sleeper-web/` — RN/NativeWind syntax (znajomy z sleeper-app), expo-router, metro bundler dla web. Powód: zerowy coast switchu stacku + share visual język z mobile gdyby kiedyś trzeba było zharmonizować.
- **Izolacja przez osobny package** zamiast Expo web target w sleeper-app — świadoma decyzja user'a oparta na obawie regresji w mobile. Trade-off: 2× pracy per feature na zawsze, ale zero ryzyka mobile.
- **Współdzielenie kodu:**
  - `sleeper-machine`, `sleeper-machine-kotki` → workspace deps (już są zewnętrzne packages, importują się naturalnie).
  - Logika domenowa, hooks, queries, lib/time → **kopiowanie 1:1** z sleeper-app.
  - UI komponenty → kopiowanie z adaptacją (web-specific fallbacki gdy potrzeba).
- **Auth:** Supabase Auth z tym samym providerem co sleeper-app (web flow zamiast mobile flow — patrz pytania odroczone).
- **Database:** ta sama baza Supabase, te same tabele, te same RLS policies. Schemat NIE jest forkowany.
- **Strefa czasowa:** `Europe/Warsaw` w UI, UTC w bazie — bez zmian względem sleeper-app.

## Zależności / Założenia

- Sleeper-app i sleeper-web wskazują na ten sam projekt Supabase (te same env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- Schemat bazy (children, sessions, etc.) jest stabilny — sleeper-web konsumuje istniejący schemat bez migracji.
- `sleeper-machine` (Galland) i `sleeper-machine-kotki` są framework-agnostic TypeScript → działają w web bez zmian.
- User akceptuje konieczność onboarding'u "Add to Home Screen" na iPhone (jednorazowo per urządzenie).
- Hosting PWA (Vercel/Cloudflare Pages/Netlify) wymaga konta i HTTPS — user ma do dyspozycji.

## Otwarte pytania

### Do rozwiązania przed planowaniem

(Brak — produktowo scope jest jednoznaczny.)

### Odroczone do planowania

- [Dotyczy R8][Techniczne] Jaki provider auth używa obecnie sleeper-app (Google/Facebook OAuth czy email)? Trzeba sprawdzić `packages/sleeper-app/src/` i odtworzyć ten sam provider w web flow (Supabase Auth `signInWithOAuth` z redirectem — różny od mobilnego `expo-auth-session`).
- [Dotyczy R1, R3-R6][Techniczne] Strategia kopiowania kodu domenowego: jednorazowy "snapshot" przy starcie projektu czy długoterminowy sync? Czy plan'er powinien rozważyć od razu wydzielenie `packages/sleeper-shared/`? (Domyślnie: kopiowanie + YAGNI dla shared lib.)
- [Dotyczy R7][Wymaga researchu] Service Worker: Workbox vs manual SW vs Expo's built-in (`@expo/metro-runtime`). Workbox = standard ale dodatkowa dep. Sprawdzić co najlepiej współgra z Expo Web w SDK 54.
- [Dotyczy R7][Techniczne] Hosting: Vercel vs Cloudflare Pages vs Netlify. Wszystkie OK dla static + HTTPS. Cloudflare najtańszy, Vercel najprostszy DX. Wybór do plan'u.
- [Dotyczy R4][Techniczne] TimePicker na web — HTML5 `<input type="time">` (różne na Safari iOS vs desktop) vs custom komponent. Pamiętać o wzorcu z fixu iOS minute scroll (patrz docs/active/fixy-edycja-aktywnosc-smart-start/).
- [Dotyczy R10][Wymaga researchu] iOS Safari PWA quirks: viewport meta, status bar style (`apple-mobile-web-app-status-bar-style`), splash screen meta tagi, safe-area-inset, keyboard handling, gesture handling.
- [Dotyczy R3-R5][Techniczne] `react-native-reanimated 4` na web — które worklets faktycznie działają w SDK 54 web, czy potrzebne fallbacki dla animacji używanych w sleeper-app (timer pulse, scale 0.96 on press).
- [Dotyczy R2][Techniczne] Supabase realtime na web (WebSocket) — sprawdzić czy działa OOTB w Expo SDK 54 web, czy potrzebne polyfille (powinno działać bez zmian).
- [Dotyczy R1][Techniczne] Build pipeline w monorepo: jak skonfigurować `pnpm --filter sleeper-web build` żeby produkował static output gotowy do uploadu na hosting. Expo SDK 54 ma `expo export --platform web`.
- [Dotyczy R5][Techniczne] Wybór algorytmu i smart-start UI — zreplikować logikę z sleeper-app (`children.algorithm` field).

## Następne kroki

→ `/dev-plan` do planowania technicznego implementacji
