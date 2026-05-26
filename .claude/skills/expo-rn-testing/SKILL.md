---
name: expo-rn-testing
description: Strategia testowania aplikacji mobilnej Expo SDK 54 — unit (Jest+RNTL), integration (Supabase local), manual on-device (Expo Go), pre-release (EAS preview), E2E (Maestro). Generuje checklisty manual testing dla danej fazy. Używaj przy planowaniu testów, weryfikacji feature przed merge, generowaniu E2E scenariuszy, decyzjach Maestro vs Detox.
---

# Expo / React Native Testing

Strategia testowania aplikacji mobilnej **Expo SDK 54** w projekcie sleeper. Zastępuje koncepcyjnie web `agent-browser` / Playwright (które NIE mają sensu dla mobile bez DOM).

## Kiedy używać

- Planowanie strategii testowej dla feature / fazy
- Generowanie manual testing checklist (Expo Go on-device)
- Decyzja Maestro vs Detox vs Appium
- Sync test dla dwóch telefonów (sleeper KRYTYCZNE)
- Pre-release verification (EAS preview build)

## Test pyramid (mobile)

```
              /\
             /E2E\          ← Maestro (1-2 happy path flows per MVP)
            /------\
           / Manual \        ← Expo Go on-device (każda faza, lista 5-15 kroków)
          /----------\
         / Integration\      ← Jest + RNTL + MSW (hooki Query, formy z Zod)
        /--------------\
       /     Unit       \    ← Jest (pure functions, schema validation, utility)
      /------------------\
```

W sleeper MVP **manual testing dominuje** (solo dev + brak setup'u testów na początku). Unit/integration dodajemy progresywnie gdy pojawi się testowalna logika biznesowa.

## Status setup'u

| Warstwa | Status sleeper-app/ | Plan |
|---------|---------------------|------|
| Unit (Jest) | ❌ brak | Setup gdy pierwszy nietrywialny `lib/`/`hooks/` (Faza 2-3) |
| Integration | ❌ brak | Razem z Jest |
| Manual (Expo Go) | ✅ aktywne | Każda faza ma checklist |
| Maestro E2E | ❌ brak | Setup w Fazie 6 (Polish) jeśli czas pozwoli |
| EAS Preview | ❌ brak | Setup w Fazie 7 (pre-release) |

## Setup Jest (gdy będzie potrzebne)

```bash
cd sleeper-app/
npm install -D jest jest-expo @testing-library/react-native @testing-library/jest-native
```

**`jest.config.js`:**
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/test/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**`package.json`:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Decyzja Jest vs Vitest**: Jest + `jest-expo` (oficjalne wsparcie Expo). Vitest dla Expo jest eksperymentalne — nie warto w MVP.

## Manual checklist (per faza)

Każda faza w `docs/active/[zadanie]/[zadanie]-zadania.md` ma `Weryfikacja:` z checkboxami. Po implementacji wygeneruj **rozszerzoną checklistę** (agent `mobile-feature-tester` to robi automatycznie):

### Struktura checklist

```markdown
## Manual Test Checklist: [nazwa feature]

### Setup
- [ ] Pull latest: `git pull && cd sleeper-app && npm install`
- [ ] Start Expo: `npx expo start`
- [ ] Open in Expo Go na fizycznym urządzeniu (iPhone X)
- [ ] Drugi telefon (Android) — sync verification

### Happy path (iPhone)
- [ ] Krok 1: ...
- [ ] Krok 2: ...
- Expected: ...

### Edge cases
- [ ] Offline (Airplane mode): operacja działa lokalnie? Sync po powrocie?
- [ ] Background → foreground: stan zachowany? Realtime reconnect?
- [ ] App killed → reopen: session persist (AsyncStorage)?
- [ ] Keyboard otwarty: czy klawiatura nie zasłania pól (KeyboardAvoidingView)?
- [ ] Dark mode: czy kolory poprawne?
- [ ] VoiceOver enabled (iOS Settings > Accessibility): czy elementy są ogłaszane?

### Two-device sync (sleeper-specific)
- [ ] Telefon A: start sesji → telefon B widzi w < 2s
- [ ] Telefon B: stop sesji → telefon A widzi w < 2s
- [ ] Telefon A offline → start sesji lokalnie → wraca online → sync do B
- [ ] Conflict: oba telefony zmienią to samo równocześnie → ostatni wygrywa (Supabase serial)

### Performance
- [ ] Lista historii (>50 sesji): scroll płynny? (FlatList tuning)
- [ ] Cold start (kill app + reopen): < 3s do widoku aktywnej sesji
- [ ] Animacje: 60fps (sprawdź FPS monitor w dev)

### A11y
- [ ] VoiceOver: każdy przycisk ma sensowny label
- [ ] Touch target: każdy przycisk ≥ 44x44pt
- [ ] Kontrast: text widoczny w trybie jasnym i ciemnym
- [ ] Font scaling: ustawienia → akcesibility → text size 200% — layout się nie rozwala
```

## E2E: Maestro vs Detox vs Appium

| Kryterium | Maestro | Detox | Appium |
|-----------|---------|-------|--------|
| Setup time | 15 min | 1-2h | 3-4h |
| Test syntax | YAML (declarative) | JS/TS | JS/Python |
| Speed | Fast | Medium | Slow |
| iOS + Android | ✅ jedno test | ✅ | ✅ |
| Expo support | ✅ z dev client | ✅ z dev client | ✅ |
| CI integration | Maestro Cloud / EAS Build | EAS Build | own infra |
| Best for | MVP, happy path | Complex gestures | Enterprise, cross-platform |
| **Rekomendacja sleeper** | ✅ **MVP** | gdy dojdą gesty | NIE |

### Maestro setup (gdy dojdzie)

```bash
brew install maestro
```

**`maestro/flows/sleep-tracking-flow.yaml`:**
```yaml
appId: com.sleeper.mobile
---
- launchApp
- tapOn: "Zaloguj się"
- inputText: "test@example.com"
- tapOn: "Hasło"
- inputText: "test1234"
- tapOn: "Kontynuuj"
- assertVisible: "Strona główna"
- tapOn: "Rozpocznij sesję"
- assertVisible: "Sesja w toku"
- wait: 3
- tapOn: "Zakończ sesję"
- assertVisible: "Historia"
```

Run: `maestro test maestro/flows/sleep-tracking-flow.yaml`

## EAS Preview builds (pre-release)

```bash
eas build --profile preview --platform all
```

Po build: link instalacyjny (ad-hoc dla iOS, APK dla Android) → daj testerom (rodzic 2) → 24h testów → feedback → fix → kolejny preview.

Wskazówki:
- **eas.json** `preview` profile: `distribution: "internal"` (ad-hoc, nie App Store)
- **Internal testers** (Expo): zaproś przez email w EAS dashboard
- **EAS Update OTA**: dla quick fix JS-only bez nowego buildu

## Co testować vs nie testować

| Testuj | Nie testuj |
|--------|------------|
| Pure functions (`lib/utils`, `date-helpers`) | Implementacje TanStack Query / RHF |
| Zod schemas (`schema.parse(invalid)` rzuca) | Komponenty prezentacyjne bez logiki |
| Custom hooki (mockuj Supabase przez MSW) | NativeWind className output |
| Form walidacja + submit (integration) | Native primitives `<View>`, `<Text>` |
| Realtime sync (manual two-device) | Renderowanie list (FlatList) |
| Auth flow happy + error (manual + integration) | Animacje (visual, manual only) |
| Deep links + URL params | Image loading (manual) |

## Sleeper-specific scenariusze testowe

### Phase 1 (Auth + Rodzina)
- Login Google OAuth → profile created → redirect home
- Login email → error wrong password
- Sign out → AsyncStorage cleared → redirect /auth
- Family invite link → join → both users see same `family_id`

### Phase 2 (Children + Sesje)
- Add child → form → optimistic update → server confirm
- Start sesja → timer running (tabular-nums) → derived state z `start_at`
- Stop sesja → `end_at` set → timer disappears
- Edge: child usunięty podczas active session → cleanup
- Partial unique constraint: nie da się utworzyć drugiej active session na to samo child

### Phase 3 (Historia + Edycja)
- FlatList historia: pull-to-refresh, infinite scroll
- Edit session → modal z form → save → list refresh
- Delete session → swipe action → confirm dialog → list refresh

### Phase 4 (Realtime sync)
- A start → B widzi w <2s (Realtime postgres_changes)
- B stop → A widzi
- A offline → start → wraca online → sync
- Network change (WiFi → 4G) → reconnect

### Phase 5 (Notyfikacje)
- expo-notifications push registration
- Notification on stop (other parent device)
- Tap notification → deep link do sesji

### Phase 6 (Polish)
- Maestro E2E happy path
- VoiceOver pełny flow
- Dark mode wszystkie ekrany
- Reduced motion gate animacji

## Powiązane skille

- `tailwind-react-guidelines` — testowanie komponentów RN
- `supabase-dev-guidelines` — Realtime testing
- `bugfix` — manual testing jako część debugowania
