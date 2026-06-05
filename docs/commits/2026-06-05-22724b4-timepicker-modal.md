# 22724b4: fix(time-picker): wrap iOS spinner in modal to show minutes column

**Data:** 2026-06-05
**Branch:** feature/fixy-edycja-aktywnosc-smart-start
**Faza zadania:** Faza 3 — Fix 1: wheel picker minut (TimePickerField, iOS Modal)

## Co zostalo zrobione
- Rozbito galaz iOS / Android w `TimePickerField`:
  - **iOS:** otwieramy `<Modal transparent animationType="fade">` z bottom-sheet kontenerem (`SafeAreaView edges={['bottom']}` + `bg-cream dark:bg-navy rounded-t-2xl`). Backdrop `flex-1 bg-black/50` z `Pressable.onPress = handleClose` (tap poza sheet = Anuluj). Stop-propagation: `<Pressable accessible={false} onPress={() => {}}>` wokol SafeAreaView, zeby tap na sam sheet nie zamykal modala.
  - **Android:** zachowano natywny system dialog (`display="default"` poza Modalem), galaz `Platform.OS === 'android'` bez zmian.
- Wprowadzono lokalny state `tempValue: Date` (init z `value` przy `handleOpen`). `iosChange` aktualizuje tylko `tempValue` — `onChange(parent)` woluje sie dopiero przy `handleConfirm` ("Gotowe"). Eliminuje spam `onChange` podczas scroll spinnera.
- Header bottom-sheet: `Anuluj` (lewo, `text-purple`) | `{label}` (srodek, font-semibold) | `Gotowe` (prawo, `text-purple font-semibold`).
- Akcesybilnosc: `accessibilityRole="button"` + `accessibilityLabel` po polsku ("Anuluj wybor godziny", "Zapisz wybrana godzine", "Zamknij wybor godziny bez zapisu") na wszystkich 3 Pressable.
- `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` na przyciskach Anuluj/Gotowe (visual `px-2 py-2` = ~36pt, hitSlop daje >44pt — zgodne z `[[hitslop-vs-padding-for-touch-targets]]`).
- DateTimePicker `display="spinner"`, `is24Hour`, w pelnej szerokosci kontenera (`px-4 pb-2` — bez `flex-1` parent crop'ujacego MM).

## Zmienione pliki
- `packages/sleeper-app/src/components/TimePickerField.tsx` — 87 insertions, 9 deletions. Dodano import `Modal` z `react-native` (juz dostepne) i `SafeAreaView` z `react-native-safe-area-context` (juz w `package.json`). Brak nowych dependencji.

## Powod / kontekst
User zglosil, ze przy edycji sesji wheel picker na iOS pokazuje tylko kolumne godzin — kolumna minut jest przyciety. Diagnoza: iOS `display="spinner"` w `@react-native-community/datetimepicker@8.4.4` dziedziczy szerokosc rodzica (`<View flex-1>` = polowa ekranu), natywny UIDatePicker cropuje kolumne MM gdy szerokosc < threshold. Rozwiazanie: Modal z full-width bottom sheet (standardowy iOS pattern, identyczny jak `ThemeModeBottomSheet`). Tempo commit przez `tempValue` to dodatkowy bonus (poprzednio kazdy scroll na iOS wolal `onChange` na rodzicu, mimo ze `display="default"` na Androidzie commituje raz po OK).

## Walidacja
- typecheck: PASS (`pnpm --filter sleeper-app exec tsc --noEmit` — 0 bledow)
- lint: PASS (`pnpm --filter sleeper-app lint` — 0 warningow)
- test: n/a (komponent czysto UI, brak unit testow; manual on-device pending — patrz `manual-test-faza-3.md`)
- runtime: manual on-device test pending (Expo Go iOS — 7 scenariuszy: open modal, scroll minutes, Gotowe commit, Anuluj brak commitu, tap backdrop = Anuluj, powtorka Godz. koniec, dark mode kontrast; Android — 2 scenariusze regresji system dialog).
- new deps: NIE. `Modal` z `react-native` (built-in), `SafeAreaView` z `react-native-safe-area-context` (juz w `package.json` ~5.6.0).
