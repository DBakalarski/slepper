# 8e2be5a: feat(ui-redesign): faza 2 — tab bar redesign

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** Faza 2 — Tab bar redesign (ui-redesign)

## Co zostalo zrobione

- Tab bar (`(app)/_layout.tsx`) ma 4 ikony lucide-react-native: `Home` (Dzisiaj), `Calendar` (Historia), `BarChart3` (Statystyki — out of scope redesignu ekranu, ale ikona w tab barze), `User` (Profil).
- Active state: outlined chip wokol ikony (border 2px + rounded-pill + paddingX 14 / paddingY 6). Inactive: ikona bez ramki.
- `tabBarShowLabel: false` — chip wokol ikony sam w sobie sluzy jako wizualny "active label" zgodnie ze screenem #1.
- `useColorScheme()` (raw RN) podmienione na `useEffectiveTheme()` z `@/features/settings/ThemeProvider` — tab bar respektuje manual override Light/Dark/System (heads-up z review Fazy 1 zaadresowany).
- Kolory active/inactive bazuja na effectiveTheme: active `#1E1B4B` (navy) light / `#F5F0E8` (cream) dark, inactive `#6B6580` (text-muted) light / `#B8A8D9` (purple-light) dark.
- Lokalny komponent `TabIcon` (nie wynoszony do `src/components/ui/` — 1 uzycie, YAGNI).
- Typ `LucideIcon = ComponentType<{ color: string; size: number; strokeWidth?: number }>` — match lucide-react-native API, zero `any`, zero non-null `!`.

## Zmienione pliki

- `sleeper-app/src/app/(app)/_layout.tsx` — dodano import lucide ikon + `useEffectiveTheme`, `TabIcon` local component, `tabBarIcon` w 4 `Tabs.Screen`, podmiana `useColorScheme()` -> `useEffectiveTheme()`.
- `docs/active/ui-redesign/ui-redesign-zadania.md` — odhaczone checkboxy Fazy 2 (Implementacja + Walidacja typecheck/lint/commit).
- `docs/active/ui-redesign/ui-redesign-kontekst.md` — sekcja Postep zaktualizowana o Faze 2.

## Powod / kontekst

Zgodnie z planem `ui-redesign-plan.md` Faza 2 mial dodac ikony do tab bara. Wariant A (`Tabs.Screen tabBarIcon`) pozwolil na zrealizowanie outlined-box-on-active przez prosty wrapper component w funkcji `tabBarIcon` — Wariant B (`CustomTabBar`) okazal sie zbedny (KISS).

Dodatkowo zaadresowane: heads-up z review Fazy 1 (`(app)/_layout.tsx:11` uzywal raw `useColorScheme()` ignorujac manual override). Podmiana na `useEffectiveTheme()` byla wymagana zeby Faza 1 (manual override Light/Dark) byla funkcjonalna dla tab bara.

## Walidacja

- typecheck: PASS (`npx tsc --noEmit` w `sleeper-app/` — 0 bledow)
- lint: PASS (`npm run lint` w `sleeper-app/` — 0 ostrzezen)
- runtime: deferred (manual test on-device, scheduled na koncu fazy 5 lub fazy 7 zgodnie z planem testow)
