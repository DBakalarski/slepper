---
title: Sleeper Web — Faza 4 (PWA & Deploy) manual test checklist
data: 2026-06-06
faza: 4 (IU11 PWA shell + IU12 Vercel deploy)
status: KOD GOTOWY — czeka na user deploy + on-device testing
---

# Manual test checklist — Faza 4 (PWA & Deploy)

Wszystkie testy poniżej wykonywane PO deploymencie Vercel.

**Pre-requisites (USER ACTION):**
1. Vercel project zalozony — patrz `docs/runbook/sleeper-web-deploy.md` sekcja 1.
2. Env vars `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` ustawione w Vercel.
3. Supabase Auth URL Configuration ma prod URL whitelistowany (PKCE wymaga).
4. Pierwszy deploy zakonczony → masz prod URL (np. `https://sleeper-web-xxx.vercel.app`).

---

## A) Local pre-deploy smoke (Mac, przed pushem na Vercel)

```bash
pnpm web:build:check    # full pipeline: tsc + lint + test + invariants + build
cd packages/sleeper-web/dist && python3 -m http.server 5173
```

- [ ] `pnpm web:build:check` exit 0 — PASS
- [ ] Otworz `http://localhost:5173/` w Chrome — strona renderuje, brak white screen
- [ ] Otworz DevTools → Console — brak `SyntaxError: import.meta`
- [ ] DevTools → Application → Manifest — JSON parsuje, name "Sleeper", display "standalone"
- [ ] DevTools → Application → Service Workers — aktywny, scope `/`
- [ ] DevTools → Lighthouse PWA audit (mobile emulation) — installable ✓, SW ✓, manifest valid ✓

## B) Production smoke (po Vercel deploy, Mac)

- [ ] Vercel build log: brak `Missing EXPO_PUBLIC_SUPABASE_URL`
- [ ] Otworz prod URL w Safari macOS — renderuje sie
- [ ] Otworz DevTools → Network: `/manifest.json` zwraca 200, Content-Type `application/manifest+json`
- [ ] `/sw.js` zwraca 200, Cache-Control `max-age=0, must-revalidate`
- [ ] `/_expo/static/js/web/entry-*.js` zwraca 200, Cache-Control `max-age=31536000, immutable`
- [ ] `/icons/apple-touch-icon.png` zwraca 200 (180×180 PNG)

## C) iPhone Safari — Add to Home Screen

(iPhone z iOS 16+, fizyczne urzadzenie)

- [ ] Otworz prod URL w Safari iOS
- [ ] Bottom bar → Share button → "Add to Home Screen"
- [ ] W edycji pojawia sie ikona z `apple-touch-icon.png` (NIE generic Safari favicon)
- [ ] Nazwa "Sleeper" preselected
- [ ] Tap "Add" → ikona pojawia sie na home screen
- [ ] Tap ikony z home screen → otwiera sie w **standalone** mode:
  - Brak Safari address bar
  - Brak tab indicator
  - Full screen (treść siega do krawedzi)
- [ ] Status bar: czytelny, black-translucent (treść pod nim ale nie blokuje)
- [ ] Safe-area-inset: header NIE jest przykryty przez status bar / notch

## D) Authentication w PWA (po deploy + Supabase URL whitelist)

- [ ] Sign-in z istniejacym kontem (tym samym co sleeper-app) — sukces
- [ ] Po sign-in: redirect na `/` (home)
- [ ] Refresh strony — sesja persistuje (localStorage z PKCE)
- [ ] Walidacja na sign-in: pusty email → error message, max 254 znaki email blokowany, password < 6 → error
- [ ] Sign-out — redirect na `/sign-in`
- [ ] Sign-up (nowe konto) — jesli enabled w Supabase

## E) Cross-device sync (krytyczny test feature parity)

(wymaga: PWA na iPhone + sleeper-app w Expo Go na drugim telefonie, oboje zalogowani na to samo konto)

- [ ] Start sesji w PWA na iPhone — w ciagu 2s widoczna w Expo Go (Realtime WS)
- [ ] End sesji w Expo Go — w ciagu 2s widoczna w PWA jako zakonczona
- [ ] Edycja czasu sesji w PWA — propaguje do Expo Go
- [ ] Dodaj backdated sesje w PWA z cross-day night sleep (22:00 → 06:00) — `end_at` na nastepnym dniu, widoczne w Expo Go

## F) Offline behavior (PWA quality)

(po pierwszym wejsciu PWA z online — SW zarejestrowany)

- [ ] Wlacz Airplane Mode na iPhone
- [ ] Otworz PWA z home screen — app shell sie laduje (z cache)
- [ ] Probuj sign-in / fetch sesje — gracefully failuje (NIE crash, NIE white screen)
- [ ] Wylacz Airplane Mode — fetch sesji wraca, Realtime reconnect

## G) Service Worker invalidation (po kolejnym deploy)

(zrob maly change w `public/sw.js` → bump CACHE_NAME → redeploy)

- [ ] Po redeploy: otworz PWA na iPhone (wlasnie zainstalowana z home screen)
- [ ] DevTools (remote Web Inspector z Maca) → Application → Service Workers
- [ ] Aktywny SW pokazuje nowa wersje cache `sleeper-shell-v2` (po activate)
- [ ] Stara wersja `sleeper-shell-v1` usunieta z `caches.keys()`
- [ ] Bundle JS = nowy hash w nazwie pliku

## H) Lighthouse PWA audit (Chrome DevTools, desktop mobile emulation)

- [ ] Lighthouse → Mobile + PWA + Performance category
- [ ] **Installable:** ✅ — manifest valid, SW registered, HTTPS, viewport meta
- [ ] **PWA Optimized:** maskable icon, theme color, viewport, content sized correctly
- [ ] Performance score: > 80 (acceptable dla 4.42 MB bundle — pierwsze ladowanie ~3s na 4G)

## I) Operator checklist (USER do potwierdzenia po deploy)

- [ ] User: instaluje PWA na swoim iPhone z prod URL
- [ ] User: pozytywnie testuje sign-in tym samym kontem co sleeper-app
- [ ] User: testuje pelny flow (start → end → edit → stats)
- [ ] User + partner: oboje zainstalowali PWA, oboje widza ten sam stan (cross-device sync)
- [ ] User: 24h+ uzycie — brak crashy, sesja persistuje przez restart telefonu
- [ ] User: potwierdza ze sleeper-app w Expo Go NADAL dziala bez regresji
