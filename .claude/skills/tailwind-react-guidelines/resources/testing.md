# Testowanie

> ℹ️ **Status w projekcie sleeper:** Setup testowy **nie istnieje jeszcze** w `sleeper-app/`. Patrz skill `expo-rn-testing` po pełną strategię (unit + integration + manual + EAS preview).

Plan testowy gdy będzie potrzebny pierwszy moduł do przetestowania (najwcześniej Faza 3-6):

## Stack docelowy

| Narzędzie | Rola |
|-----------|------|
| **Vitest** | Test runner (kompatybilny z Metro/Expo przez plugin) — alternatywa: **Jest** z `jest-expo` preset (oficjalne wsparcie Expo) |
| **@testing-library/react-native** (RNTL) | Testowanie komponentów React Native (`render`, `screen`, `fireEvent`) |
| **MSW** | Mockowanie HTTP (działa na RN przez `msw/native`) |
| **@testing-library/user-event** | Symulacja interakcji — częściowe wsparcie w RNTL (preferuj `fireEvent` na RN) |
| **Maestro** (E2E mobile) | Manual / preview testing → patrz `expo-rn-testing` skill |

## Decyzja: Jest vs Vitest

| Kryterium | Jest + jest-expo | Vitest |
|-----------|------------------|--------|
| Oficjalne wsparcie Expo | ✅ | ❌ (eksperymentalne) |
| Speed | Wolniejszy | Szybszy |
| ESM | Problematyczny w Expo SDK | Natywny |
| RNTL kompatybilność | ✅ pełna | ✅ z plugin |
| Snapshot testing | ✅ | ✅ |
| **Rekomendacja dla Expo SDK 54** | ✅ **Wybierz Jest** | Tylko jeśli już biegle |

## Co testować (pyramid)

1. **Unit (Jest + RNTL)** — czyste funkcje (`lib/utils`, `lib/date-helpers`, Zod schemas), komponenty prezentacyjne (Button, Card)
2. **Integration (Jest + RNTL + MSW)** — hooki TanStack Query z mockowanym Supabase, formularze RHF + Zod (walidacja + submit), realtime invalidation
3. **Manual / Device (Expo Go)** — flow autoryzacji, deep links, push notifications, dwóch urządzeń sync
4. **E2E (Maestro)** — pełne flow MVP (login → utworzenie dziecka → start sesji → stop)

## Czego NIE testować

- Implementacji bibliotek (TanStack Query, RHF, Supabase SDK)
- Typów TypeScript (compiler to robi)
- NativeWind class output (zaufaj bibliotece)
- Renderowania natywnych komponentów RN

## Pierwsze testy — kiedy

Setup testów dodaj gdy pojawi się **pierwszy nietrywialny moduł logiki biznesowej** — prawdopodobnie:
- Helper do oblicz czasu trwania sesji z `start_at`/`end_at` (Faza 2)
- Walidacja schemy `session-create.schema.ts`
- Hook `useActiveSession` (Faza 2-4)

## Setup gdy będzie potrzebny

```bash
# w sleeper-app/
npm install -D jest jest-expo @testing-library/react-native @testing-library/jest-native msw
```

`jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/test/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

`package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

## Wzorce — gdy będą potrzebne

Wzorce z poprzedniej wersji tego pliku (Vitest + RTL web) — pojęciowo te same dla RNTL:
- **Arrange-Act-Assert** w `describe`/`it`
- **Testuj zachowanie**, nie implementację (preferuj `getByRole`, `getByText` zamiast `getByTestId`)
- **Async** z `findBy*` i `waitFor`
- **Mock provider wrapper** dla TanStack Query (z `retry: false`, `gcTime: 0`)
- **MSW handlers** dla Supabase REST + Realtime (osobne dla anon i authenticated)

Pełne przykłady — dodaj gdy będzie pierwszy test do napisania.

## Zobacz także

- Skill `expo-rn-testing` — strategia + manual checklist + Maestro
- [forms.md](./forms.md) — RHF + Zod patterns
- [component-patterns.md](./component-patterns.md) — co testować w komponentach
