# aa8e6d8: feat(ui-redesign): faza 6 — polish + a11y

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** ui-redesign — Faza 6 (Polish + a11y)

## Co zostalo zrobione

### Nowy plik
- `sleeper-app/src/lib/colors.ts` — `COLORS` const z 6 kolorami palety (`navy`, `cream`, `orange`, `purple`, `purpleLight`, `textMuted`). Source-of-truth dla HEX uzywanych w lucide ikonach, `ActivityIndicator`, SVG. Komentarz wyjasnia "collegial source-of-truth" z `tailwind.config.js` (RN nie pozwala na deep import tokenow tailwinda bez build stepu).

### Refaktor HEX -> COLORS (14 plikow)
- `_layout.tsx`, `history.tsx`, `profile.tsx`, `settings.tsx`, `index.tsx` (app screens)
- `HomeHeader.tsx`, `SessionListItem.tsx`, `QuickActions.tsx`, `BigActionButton.tsx`, `ActiveWindowCard.tsx`, `SleepInProgressCard.tsx`, `TodayStatsCard.tsx` (components)
- `IconButton.tsx`, `ProgressRing.tsx`, `Switch.tsx` (ui primitives)
- `ThemeModeBottomSheet.tsx` (feature)

Redukcja HEX literals: 50 -> 22 wystapien (28 fewer, ~56% reduction). Pozostale 22 w auth/family/sessions formach (out of scope UI redesignu — `placeholderTextColor`, niektore `ActivityIndicator`).

### P3 batch-fixy (akumulowane z Faz 0-5)
1. **`_layout.tsx`** — dead ternary `backgroundColor: isDark ? 'transparent' : 'transparent'` usuniety + `isDark` prop wyciety z `TabIcon` (nieuzywany)
2. **`ActiveWindowCard.tsx`** — redundancja `dark:text-navy` usunieta (`text-navy` juz default)
3. **`TodayStatsCard.tsx`** — local re-alias `dayMs = MS_PER_DAY` usuniety, uzywamy `MS_PER_DAY` bezposrednio
4. **`history.tsx`** — `setDate(getDate() - N)` -> `addDays(createdAt, -(RANGE_DAYS - 1))` z `date-fns` (TZ-safe pattern z `learned-patterns.md`). To samo dla `yesterday.setDate(getDate()-1)` -> `addDays(now, -1)` w `dayTitleFor`
5. **`SessionListItem.tsx`** — `accessibilityLabel` rozszerzony o ", po aktywnosci Xg Ym" gdy `showGap` (VoiceOver kontekst)
6. **`ThemeModeBottomSheet.tsx`** — inner Pressable stop-propagation: dodany `accessible={false}` (VoiceOver/TalkBack nie ogloszaja sztucznego "przycisku")
7. **`profile.ShortcutRow`** — `useEffectiveTheme()` per-row -> `chevronColor` propsem od rodzica (redukcja subskrypcji theme store)
8. **`history.tsx`** — inline TODO comment dla future FlatList refaktoru przy >100 sesji (>30 LOC scope, odlozone na pozniej)

### Faza 6 — checkboxy "Implementacja"

**1. VoiceOver/TalkBack accessibility:**
- `IconButton` juz zawsze ma `accessibilityLabel` (prop required, z Fazy 0)
- `Avatar` juz mial `accessible accessibilityRole="image" accessibilityLabel={name}` z Fazy 0
- `BigActionButton` dodany `accessibilityLabel={label}` (przedtem tylko state)
- `index.InvitationRow.Pressable` dodany `accessibilityLabel` z `family_name`

**2. Touch targets >=44pt:**
- `settings.tsx` back button `w-10 h-10` -> `w-11 h-11` + `hitSlop {8,8,8,8}` (>=44pt iOS guideline)
- `IconButton` size=`sm` (36pt) -> dodany `hitSlop {6,6,6,6}` (efektywnie 48pt)
- `index.tsx` "Pokaz wszystkie" Pressable -> dodany `hitSlop {8,8,8,8}`

**3. Tabular nums:**
- `SleepInProgressCard` timer (`display`) + `short` z `fontVariant: ['tabular-nums']` (przedtem nie mial)
- `ProgressRing` label tez z tabular nums (procent ringa)
- `ActiveWindowCard` juz mial (Faza 3)
- `TodayStatsCard` juz mial dla totalSleep + MiniStat values (Faza 3)

**4. Pressable feedback (scale 0.97 + opacity 0.85):**
- `BigActionButton` (scale + opacity)
- `QuickActions.ActionCard` (scale + opacity, NIE gdy disabled)
- `SessionListItem` (opacity only — scale dla calego rowu zaburza chevron)
- `profile.ShortcutRow` (opacity only)
- `settings` back + Wyloguj (opacity only)
- `index` "Pokaz wszystkie" + `InvitationRow.Pressable` (scale dla CTA, opacity dla linka)
- `IconButton` (scale + opacity, dotyka wszystkich uzyc IconButton w app: HomeHeader Bell, profile gear)

Wszystkie inline `style={({pressed}) => ...}` — KISS, jeden pattern dla wszystkich callsiteow (Reanimated nieuzasadnione overheadem).

**5. SegmentedControl transition:** juz uzywal `withTiming` 200ms z Fazy 4 — zweryfikowane, bez zmian.

**6. ProgressRing fade-in animation:** dodany `useSharedValue(0)` + `withTiming(1, {duration: 300})` w `useEffect` przy mount. `useAnimatedStyle` na opacity, View kontenera i label View animowane razem.

## Zmienione pliki

- `sleeper-app/src/lib/colors.ts` — NEW
- `sleeper-app/src/app/(app)/_layout.tsx` — COLORS + dead ternary + TabIcon isDark removed
- `sleeper-app/src/app/(app)/history.tsx` — COLORS + addDays + ScrollView TODO comment
- `sleeper-app/src/app/(app)/index.tsx` — COLORS + Pressable feedback (Pokaz wszystkie, InvitationRow) + a11y label
- `sleeper-app/src/app/(app)/profile.tsx` — COLORS + chevronColor prop + Pressable feedback ShortcutRow
- `sleeper-app/src/app/(app)/settings.tsx` — COLORS + back button w-11 h-11 hitSlop + Pressable feedback
- `sleeper-app/src/components/ActiveWindowCard.tsx` — dark:text-navy redundancja
- `sleeper-app/src/components/BigActionButton.tsx` — COLORS + Pressable feedback + a11y label
- `sleeper-app/src/components/HomeHeader.tsx` — COLORS + consolidated tintColor
- `sleeper-app/src/components/QuickActions.tsx` — COLORS + Pressable feedback ActionCard
- `sleeper-app/src/components/SessionListItem.tsx` — COLORS + gap context a11y label + Pressable opacity feedback
- `sleeper-app/src/components/SleepInProgressCard.tsx` — tabular nums dla timera
- `sleeper-app/src/components/TodayStatsCard.tsx` — dayMs re-alias usuniety
- `sleeper-app/src/components/ui/IconButton.tsx` — COLORS default + hitSlop sm + Pressable feedback
- `sleeper-app/src/components/ui/ProgressRing.tsx` — COLORS default + fade-in Reanimated + tabular nums w labelu
- `sleeper-app/src/components/ui/Switch.tsx` — COLORS
- `sleeper-app/src/features/settings/ThemeModeBottomSheet.tsx` — COLORS + accessible=false na inner Pressable
- `docs/active/ui-redesign/ui-redesign-zadania.md` — checkboxy Fazy 6 + P3 done
- `docs/active/ui-redesign/ui-redesign-kontekst.md` — Faza 6 progress entry

## Powod / kontekst

Faza 6 to ostatnia faza implementacyjna ui-redesignu (po niej tylko manual test Faza 7). Polish faza akumuluje wszystkie nity / batch-fix kandydaci P3 z Faz 0-5 (review wszystkich CZYSTE — 0 P1, 0 P2) PLUS dedykowane Implementation checkboxy (VoiceOver/TalkBack, touch targets, tabular nums, Pressable feedback, ProgressRing fade-in).

Decyzje:
- **colors.ts w `src/lib/`** zamiast `src/components/ui/tokens.ts` — alignuje z `time.ts` jako zero-deps utility module. Komentarz w pliku zaznacza ze `tailwind.config.js` jest second source-of-truth dla NativeWind/className contexts.
- **Pressable feedback inline (nie Reanimated)** — KISS, jeden pattern dla 7 callsiteow. Reanimated overhead nieuzasadniony dla pojedynczego transform stylu.
- **ProgressRing fade-in PRZEZ Reanimated** — `useSharedValue` ma 0 cost przy re-renderach, a ekran Dzisiaj odswieza sie co 30s.
- **HEX migration scope tradeoff** — 21 plikow z HEXami przekraczalo `>15 plikow` threshold z planu Fazy 6, wiec przykrojone do 14 plikow z core UI redesignu. Auth/family forms odlozone (placeholderTextColor + ActivityIndicator, te same HEXy, ale w out-of-scope plikach).
- **ScrollView w `history.tsx`** odlozona na pozniej (>30 LOC refaktor SectionList) — inline TODO comment zostawia trail.

## Walidacja

- typecheck: `npx tsc --noEmit` PASS
- lint: `npm run lint` (expo lint) PASS
- runtime: nie testowane w Expo Go (Faza 7 manual test)
