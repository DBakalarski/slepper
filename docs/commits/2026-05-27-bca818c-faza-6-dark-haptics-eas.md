# bca818c: feat(mvp-sleep-tracker): faza 6 — dark mode + haptics + eas.json

**Data:** 2026-05-27
**Branch:** feature/mvp-sleep-tracker
**Faza zadania:** Faza 6 — Polish dla siebie

## Co zostalo zrobione

- Zainstalowano `expo-haptics@~15.0.8` przez `npx expo install` (SDK 54 compat).
- `BigActionButton.handlePress` wola `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` synchronicznie przed `onPress()` — fire-and-forget. Medium impact dla glownego CTA (start/stop snu).
- `tailwind.config.js`: `darkMode: 'media'` + kolory `dark-bg` (`#0F0D26`), `dark-card` (`#1E1B4B`), `dark-surface` (`#2A2660`).
- Dark variants na ekranach: Dzisiaj, Historia, Statystyki, Profil, Auth (sign-in/sign-up), session/[id]. Tlo `bg-cream dark:bg-dark-bg`, tytuly `text-navy dark:text-cream`, subtitle `text-purple dark:text-cream/70`.
- BigActionButton: `bg-navy dark:bg-purple` (zachowuje rozpoznawalnosc na ciemnym tle).
- `(app)/_layout.tsx`: `useColorScheme()` z `react-native` dla dynamicznego koloru tabBar (Tabs API expo-router nie wspiera className).
- `eas.json` utworzony z 3 profilami: development (developmentClient + distribution internal + channel development), preview (internal + channel preview), production (channel production + autoIncrement). `cli.appVersionSource: "remote"`.

## Zmienione pliki

- `sleeper-app/package.json` — `expo-haptics: ~15.0.8` dodane
- `sleeper-app/package-lock.json` — lock dla expo-haptics
- `sleeper-app/tailwind.config.js` — darkMode 'media' + nowe kolory dark-*
- `sleeper-app/eas.json` — nowy plik, 3 profile build
- `sleeper-app/src/components/BigActionButton.tsx` — haptics + dark variant na tle
- `sleeper-app/src/app/(app)/_layout.tsx` — useColorScheme + tabBar dynamic styling
- `sleeper-app/src/app/(app)/index.tsx` — dark variants na top-level surfaces
- `sleeper-app/src/app/(app)/history.tsx` — dark variants
- `sleeper-app/src/app/(app)/stats.tsx` — dark variants
- `sleeper-app/src/app/(app)/profile.tsx` — dark variants
- `sleeper-app/src/app/(app)/session/[id].tsx` — dark variants na 4 SafeAreaView containers
- `sleeper-app/src/app/(auth)/sign-in.tsx` — dark variants
- `sleeper-app/src/app/(auth)/sign-up.tsx` — dark variants

## Powod / kontekst

Faza 6 = "polish dla siebie" wg planu. Zakres: dark mode (NativeWind dark variant), haptics przy start/stop snu, EAS dev build profile.

Odchylenia od planu:
- **EAS init pominiete** — wymaga interaktywnego `eas login`. `eas.json` utworzony manually z dobrymi defaultami. User wykonuje `eas login` + `eas init` wg `manual-test-faza-6.md` scenariusz 6.
- **App icon/splash zachowane z template Expo** — placeholder wystarcza dla "polish dla siebie" (wlasny uzytek). Custom design = post-MVP decyzja.
- **Dark mode `media` zamiast `class`** — brak manualnego togglera UI (out of scope MVP, nie ma sekcji Settings z preferencja motywu).

Decyzje:
- **Selective dark variants**: tylko ekrany glowne i kluczowe komponenty (BigActionButton). Karty kolorowe (ActiveWindowCard pomaranczowa, SleepInProgressCard granatowa) zachowuja palete z mockupow w obu trybach — to ich definicja designu, kontrast WCAG AA juz spelniony.
- **`useColorScheme` z `react-native`** w `(app)/_layout.tsx` (nie z `nativewind`). Tabs API wymaga `screenOptions` z hex values.
- **Haptics fire-and-forget**: brak `await`, brak `try/catch`. Spojnie z `cancelNapNotificationSafe` z Fazy 5.

## Walidacja

- typecheck: PASS (`npx tsc --noEmit`, 0 bledow)
- lint: PASS (`npm run lint`, 0 bledow)
- test: n/a (brak setupu testow w projekcie, zgodnie z CLAUDE.md)
- runtime: pending operator — `manual-test-faza-6.md` 7 scenariuszy (haptic start/stop, dark mode iOS/Android, visual mockup parity, EAS build, TestFlight)
