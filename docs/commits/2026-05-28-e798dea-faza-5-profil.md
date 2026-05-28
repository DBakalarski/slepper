# e798dea: feat(ui-redesign): faza 5 — profil redesign

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** Faza 5 — Profil redesign (ui-redesign)

## Co zostalo zrobione

- Rewrite ekranu Profil zgodnie ze screenem #3 design.md — karta aktywnego dziecka (Avatar lg + imie + wiek + norma snu + ProgressBar 7d), sekcja SKROTY (Przypomnienia placeholder + Tryb ciemny tri-state).
- 2 nowe helpery TZ-safe: `child-age.ts` (`formatChildAge` z polska deklinacja + miesiace skrocone PL), `sleep-stats.ts` (`useAvgSleep7d` hook + `avgSleepProgressRatio` / `avgSleepPercentOfNorm`).
- Nowy `ThemeModeBottomSheet.tsx` — tri-state bottom sheet (System/Light/Dark) przez RN `Modal` transparent + slide, bez nowych zaleznosci (KISS).
- Nowy `settings.tsx` placeholder route — sekcja Rodzina + Wyloguj przeniesione z profile.tsx bez utraty funkcjonalnosci, wpiety jako Tabs.Screen z `href: null`.
- Aktualizacja `(app)/_layout.tsx` — dodanie `<Tabs.Screen name="settings" options={{ href: null }} />` (pattern z sleep-fullscreen/session/[id]).

## Zmienione pliki

- `sleeper-app/src/lib/child-age.ts` (nowy, 100 LOC) — `formatChildAge(birthDate, now?)` TZ-safe. Logika wieku: <12 tyg "X tygodni", <24 mc "X miesiecy", >=24 mc "X lat" z polska deklinacja. Format daty ur.: "DD MMM YYYY" z tabela PL short (sty/.../gru). Bez importu `date-fns/locale/pl` (YAGNI dla 12 stringow).
- `sleeper-app/src/lib/sleep-stats.ts` (nowy, 115 LOC) — `useAvgSleep7d(childId)` hook reuse `useSessions`. Range 7 pelnych dni wstecz (bez dzisiaj). `aggregateByDayInAppTz` dzieli sesje cross-midnight per dzien w `dayKeyInAppTz`. `useMemo([todayKey])` stabilizuje rangeStart/rangeEnd (zapobiega refetch petli przez `toISOString()` w queryKey).
- `sleeper-app/src/features/settings/ThemeModeBottomSheet.tsx` (nowy, 95 LOC) — RN `Modal` transparent+slide, 3 opcje Smartphone/Sun/Moon + `Check` dla aktywnej, backdrop tap zamyka (stop-propagation pattern: zewnetrzny Pressable + wewnetrzny no-op Pressable).
- `sleeper-app/src/app/(app)/settings.tsx` (nowy, 90 LOC) — header z back button (ChevronLeft + router.back), sekcja Rodzina (FamilyMembersList, InviteMemberForm, PendingInvitationsList, NoFamilyFallback), button Wyloguj (`supabase.auth.signOut`).
- `sleeper-app/src/app/(app)/profile.tsx` (rewrite, 220 LOC) — header "Profil"+subtitle, gear IconButton → router.push('/settings'). `ActiveChildCard` solid bg-purple-light z Avatar lg+border-2 border-white, imie text-2xl bold, formatChildAge. Zagniezdzona biala Card z norma snu (getNormForChild) + ProgressBar (tint success/orange wg progu 85%) + procent normy. `NoActiveChildCard` fallback. `ShortcutRow` lokalny komponent — 2 wiersze (Bell placeholder, Moon tri-state sheet).
- `sleeper-app/src/app/(app)/_layout.tsx` — dodanie `<Tabs.Screen name="settings" options={{ href: null }} />`.
- `docs/active/ui-redesign/ui-redesign-zadania.md` — checkboxy Fazy 5 oznaczone jako ukonczone.
- `docs/active/ui-redesign/ui-redesign-kontekst.md` — wpis Fazy 5 z kluczowymi decyzjami.

## Powod / kontekst

Faza 5 ui-redesign zgodnie z `docs/active/ui-redesign/ui-redesign-zadania.md`. Decyzje przyjete z Fazy 0:
- Karta dziecka SOLID `bg-purple-light` (NIE gradient — `expo-linear-gradient` SKIP).
- Sekcja Rodzina przeniesiona do `/settings` placeholder route za gear icon.
- Tri-state bottom sheet (System/Light/Dark) — iOS-idiomatic.
- Sleep norm WHO+AAP hybrid (juz zaimplementowane w `sleep-norms.ts` Faza 0).

Sign out musi byc zachowany — przeniesiony do settings.tsx, profile.tsx nie ma juz duplikatu. User dociera do logout przez gear icon → settings.

Routing settings: uzyto `<Tabs.Screen name="settings" options={{ href: null }} />` w `(app)/_layout.tsx` (najmniej inwazyjna opcja, taki sam pattern jak istniejace `sleep-fullscreen`/`session/[id]`). Stack.Screen w root layout byloby narzutem (zmienialibysmy auth-aware layouting).

ThemeModeBottomSheet: RN `Modal` (KISS), brak `@gorhom/bottom-sheet` (nowa zaleznosc wymagalaby zatwierdzenia §8 a YAGNI dla pojedynczego sheeta).

## Walidacja

- typecheck: PASS (`npx tsc --noEmit`, 0 bledow)
- lint: PASS (`npm run lint` = `expo lint`, exit 0)
- runtime: n/a (manual test on-device DEFFERED, do wykonania przez usera w Expo Go; checklist w `manual-test-faza-5.md` powstanie w toku review fazy 5)

## Odchylenia od planu

- **`Switch` zamiast tri-state bottom sheet** — design.md Faza 5 sugeruje "Switch (controlled by useThemeStore)" jako alternatywe do tri-state. Wybrano tri-state zgodnie z decyzja Fazy 0 (potwierdzona przez usera) — Switch byby binary, ukrywal opcje 'system'.
- **`useAvgSleep7d` range = 7 pelnych dni WSTECZ (BEZ dzisiaj)** — design.md nie precyzuje "co liczone jako 7 dni". Pominiecie dzisiaj zapobiega zanizaniu sredniej przez sesje w toku lub brak nocy. `daysCovered` zwraca liczbe dni z faktycznymi danymi (1..7).
- **`computeAggregates` z TodayStatsCard NIE reused** — funkcja jest lokalna dla komponentu (nie eksportowana), Faza 3 nie wynosila jej do `lib/`. Eksport teraz byby out-of-scope refaktorem; lokalna implementacja `aggregateByDayInAppTz` w `sleep-stats.ts` jest specyficzna dla 7-dniowego agregatu (split cross-midnight per dzien, nie per-session totals).
