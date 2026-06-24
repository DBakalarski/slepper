# c52ebab: feat(stats): dashboard snu — trendy 7/14/30, regularnosc, forma snu

**Data:** 2026-06-24
**Branch:** main
**Faza zadania:** Roadmap post-MVP — Faza 1 (Dashboard). Spec: `docs/superpowers/specs/2026-06-24-sleep-dashboard-design.md`

## Co zostalo zrobione
- Zastapiono placeholder `stats.tsx` realnym dashboardem trendow snu:
  - wykres slupkowy snu/dobe (slupki = `View`, zero nowych zaleznosci) z pozioma
    linia normy wiekowej,
  - przelacznik zakresu 7 / 14 / 30 dni (`SegmentedControl`),
  - agregaty: sredni sen vs norma (% normy), srednio drzemek/dobe, regularnosc
    zasypiania (odchylenie standardowe, kotwica 18:00), zakres porannych pobudek,
  - jakosciowa „forma snu" 🟢/🟡/🔴 z ostatnich 3 dni (±15% pasma normy),
  - stany loading / error / empty.
- Wydzielono day-split cross-midnight do `lib/sleep-aggregation.ts` jako single
  source of truth; `sleep-stats.ts` (uzywany na Profilu) importuje go zamiast
  prywatnej kopii — bez duplikacji TZ-wrazliwej logiki.

## Zmienione pliki
- `packages/sleeper-web/src/lib/sleep-aggregation.ts` — NOWY: `durationWithinWindow`, `dailySleepTotalsMs`, `dailySleepSeries`, `bedtimeRegularityMinutes`, `morningWakeRange`, `averageSleepMs`/`averageNapCount`/`averageSleepMsLastDays`, `sleepForm`.
- `packages/sleeper-web/src/lib/__tests__/sleep-aggregation.test.ts` — 15 testow unit.
- `packages/sleeper-web/src/lib/sleep-stats.ts` — refaktor: import `dailySleepTotalsMs` (usuniete prywatne `durationWithinWindow`/`aggregateByDayInAppTz`).
- `packages/sleeper-web/src/lib/time.ts` — `minutesOfDayInAppTz` (TZ-safe minuty od polnocy) + `formatClockMinutes`.
- `packages/sleeper-web/src/features/stats/useSleepStats.ts` — hook (stabilny queryKey przez memo `dayKey`, agregaty + status).
- `packages/sleeper-web/src/features/stats/__tests__/useSleepStats.test.ts` — static-invariants (queryKey, brak `new Date()` inline, reuse lib) + ekran (SegmentedControl, 3 stany).
- `packages/sleeper-web/src/features/stats/components/SleepBarChart.tsx` — wykres slupkowy + linia normy + etykiety dni.
- `packages/sleeper-web/src/features/stats/components/SleepFormBadge.tsx` — kropka + label formy snu.
- `packages/sleeper-web/src/app/(app)/stats.tsx` — kompozycja ekranu + stany.
- `packages/sleeper-web/public/changelog.json` — bump v2 (Faza 1 + quick-undo).
- `docs/ideation/2026-06-24-roadmap.md` — Faza 1 odznaczona.
- `docs/superpowers/specs/2026-06-24-sleep-dashboard-design.md` — spec.

## Powod / kontekst
Najwieksza jawna luka po MVP — `stats.tsx` byl placeholderem, a dane sa w bazie.
Decyzje z brainstormingu: pelny zakres (7/14/30 + score + regularnosc); slupki
jako `View` (react-native-svg dostepny, ale dla slupkow zbedny — mniejszy bundle);
forma snu jakosciowa, nie numeryczna (unika falszywej precyzji). Lazy-load ekranu
oceniony jako niepotrzebny (brak ciezkiej zaleznosci). Profil juz pokazuje srednia
7d vs norma — dashboard dokłada trend per dzien.

Odchylenie od specu: prog „ok" formy snu liczony jako ±15% krawedzi pasma normy
(nie 80–110% maxHours) — kotwiczenie do maxHours dawalo pusty/odwrocony przedzial
ponizej normy (80% z 14h = 11.2h > minHours 11h). Definicja krawedziowa jest
spojna i intuicyjna (lekko poza = ok, daleko poza = poor).

## Walidacja
- typecheck: PASS (`tsc --noEmit`)
- lint: PASS (`expo lint`)
- test: PASS (`vitest run` — 15 unit agregacji + static-invariants hooka/ekranu)
- invariants: PASS (`check-no-native-imports.sh` + web-mock)
- build: PASS (`expo export` → dist)
- runtime: do manualnej weryfikacji po deployu — ekran Statystyki: przelacznik
  zakresu, wykres, kafelki, stany pusty/blad.
