# e952e19: feat(sleeper-web-pwa): IU10 main screens — 9 routes + 8 feature components

**Data:** 2026-06-05
**Branch:** feature/sleeper-web-pwa
**Faza zadania:** Faza 3 (UI & Routes) — IU10

## Co zostalo zrobione

- Skopiowano 9 routes z sleeper-app jako kopia 1:1:
  - `(app)/_layout.tsx` — Tabs z lucide ikonami + auth gate (`signed_out` → Redirect /sign-in) + useRealtimeSessions
  - `(app)/index.tsx` — Main dashboard (BigActionButton, last activity, smart-start)
  - `(app)/history.tsx` — Historia sesji grupowana per dzien w app tz
  - `(app)/profile.tsx` — Profil dziecka, ActiveChildCard, ThemeMode
  - `(app)/settings.tsx` — Family settings + sign-out
  - `(app)/stats.tsx` — Wykresy 7 dni
  - `(app)/sleep-fullscreen.tsx` — **swiadomie zmodyfikowany** (patrz nizej)
  - `(app)/child/[id]/edit.tsx` — Edycja dziecka (algorytm, profile)
  - `(app)/session/[id].tsx` — Edit session z TimePicker + cross-day support
- Skopiowano 8 feature components jako kopia 1:1:
  - `features/sessions/components/`: BackdatedSessionModal, SessionEditForm
  - `features/children/components/`: AddChildForm, EditChildForm
  - `features/family/components/`: FamilyMembersList, InviteMemberForm, NoFamilyFallback, PendingInvitationsList

## Zmienione pliki

- `packages/sleeper-web/src/app/(app)/` — 9 plikow + child/[id]/, session/
- `packages/sleeper-web/src/features/{sessions,children,family}/components/` — 8 plikow
- `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` — odchylenie: usunieto import `expo-keep-awake` (native-only excluded)

## Powod / kontekst

Faza 3 IU10 (XL). Glowny krok dla Fazy 3 — funkcjonalne ekrany aplikacji. Strategia kopii 1:1 zachowana — parytet z sleeper-app gwarantuje ze bug-fix w mobile zostanie odziedziczony przy nastepnej kopii.

`sleep-fullscreen.tsx` swiadomie zmodyfikowany — `expo-keep-awake` jest native-only (Wake Lock API na web wymaga progressive enhancement w IU11+, post-MVP per kontekst). Komentarz w pliku wyjasnia, ze ekran moze sie zablokowac po OS timeout — manual test confirm behavior na iOS Safari.

Auth gate domkniety: `(app)/_layout.tsx` ma `<Redirect href="/sign-in" />` dla `signed_out`, `(auth)/_layout.tsx` (z IU3) ma `<Redirect href="/" />` dla `signed_in`.

## Walidacja

- typecheck: PASS (0 errors)
- lint: PASS (0 warnings)
- test: PASS (82/82, brak nowych testow dla IU10 — komponenty wymagaja jsdom+RTL out of scope)
- build: PASS (dist/index.html + 4.42MB JS bundle)
- sleeper-app regression: PASS (0 errors)
- parytet 1:1: 16/17 plikow PASS (sleep-fullscreen swiadomie modyfikowany)
- runtime: brak (manual test pending)

## Manual test pending (operator checklist Fazy 3)

- Main dashboard `/` — ostatnia aktywnosc, smart-start, BigActionButton START
- Start sesji → optimistic UI → cross-device sync via Realtime
- History `/history` — grupowanie per dzien w app tz
- Edit session `/session/[id]` — TimePicker + cross-day night sleep
- Stats `/stats` — wykresy 7 dni
- Settings `/settings` — theme toggle + sign-out
- Profile `/profile` — edycja
- Child detail `/child/[id]/edit` — zmiana algorytmu → recommendation refresh
- Backdated insert — prefill todayDateInAppTz, walidacja endAt>startAt
- `useFocusEffect` cross-midnight (review-faza-2 P2.1 deferred — manual verify ~23:55 → po polnocy)
- sleep-fullscreen — czy ekran sie blokuje po OS timeout? (Wake Lock API decision dla IU11)
