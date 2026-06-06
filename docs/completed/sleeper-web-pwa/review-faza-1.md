---
title: Code Review — Faza 1 sleeper-web-pwa
data: 2026-06-05
faza: 1 (IU1-IU4)
branch: feature/sleeper-web-pwa
status: WYMAGA POPRAWEK (P1 blocking)
---

# Code Review — Faza 1 sleeper-web-pwa

**Branch:** `feature/sleeper-web-pwa`
**Data review:** 2026-06-05
**Zakres:** IU1 (Bootstrap) + IU2 (Foundation lib) + IU3 (Auth flow) + IU4 (Theme system)
**Pliki:** `packages/sleeper-web/` — 36 plików, ~1765 LOC

## Tldr

Foundation jest solidne i konsekwentne z patternami sleeper-app. Provider chain, `useEffectiveTheme` single-source-of-truth, no-op `notifications.ts`, kopie lib 1:1 — wszystko wykonane czysto. **Quality gate failuje na 2 deferred TS errors** (`session-gaps.ts:1`, `sleep-stats.ts:4` → `@/features/sessions/hooks`). Kontekst zadania udokumentował ten dług jako świadomie odroczony do IU5, ale **brak inline-komentarzy w kodzie** powoduje że `tsc --noEmit` + `expo lint` zwracają exit 1 — łamie quality gate z `.claude/rules/coding-rules.md` §6 i `IU1-IU4` weryfikacje. Dodatkowo wykryto 2 bundle smells (reanimated w bundle bez użyć, lucide-react-native zamiast lucide-react na web) — łącznie ~100KB niepotrzebnego JS w PWA shellu.

## Statystyki

| Severity | Count |
|---|---|
| 🔴 P1-blocking | 4 |
| 🟠 P2-important | 7 |
| 🟡 P3-nit | 9 |
| ⚪ info | 2 |

**Decyzja severity gate:** ⛔ **WYMAGA POPRAWEK** — przed kontynuacją do Fazy 2 należy zaadresować 4 P1 (deferred imports comment + bundle clean-up).

## CLI weryfikacje (executed)

| Komenda | Wynik |
|---|---|
| `pnpm --filter sleeper-web exec tsc --noEmit` | ❌ FAIL (2 deferred TS errors, IU5) |
| `pnpm --filter sleeper-web lint` | ❌ FAIL (1 error: `import/no-unresolved` w `sleep-stats.ts:4`) |
| `pnpm --filter sleeper-web test` | ✅ PASS (14/14 testów w `time.test.ts`) |
| `pnpm --filter sleeper-app exec tsc --noEmit` | ✅ PASS (regression OK) |
| `grep "detectSessionInUrl: true" supabase.ts` | ✅ match |
| `grep "expo-notifications" notifications.ts` | ✅ 0 references |

## 🔴 P1-blocking

### P1.1 — Brak inline-komentarzy + eslint-disable na deferred TS errors
**Files:** `packages/sleeper-web/src/lib/session-gaps.ts:1`, `packages/sleeper-web/src/lib/sleep-stats.ts:4`

Oba pliki importują `@/features/sessions/hooks`, który nie istnieje w sleeper-web (resolve dopiero w IU5). Kontekst zadania (`sleeper-web-pwa-kontekst.md:62-71`) udokumentował to jako "deferred do IU5", ale **żaden komentarz w samym kodzie** o tym nie ostrzega. Ryzyko: przyszły agent/dev zobaczy `TS2307` i "naprawi" przez stub/usunięcie importu → utrata kontraktu z IU5.

**Fix:** dodać na linii 1 obu plików:
```ts
// FAZA 5 (IU5): import z @/features/sessions/hooks świadomie niedziałający do czasu kopii features/sessions/.
// Patrz docs/active/sleeper-web-pwa/sleeper-web-pwa-kontekst.md sekcja "Faza 1 — znane TS errors (deferred do IU5)".
// eslint-disable-next-line import/no-unresolved
```

### P1.2 — `expo lint` failuje (exit 1) — quality gate złamany
**Files:** `packages/sleeper-web/src/lib/sleep-stats.ts:4`

`pnpm --filter sleeper-web lint` zwraca exit 1 (`import/no-unresolved`). Quality gate w `.claude/rules/coding-rules.md` §6 wymaga "Zero błędów lintera" przed deklaracją "gotowe". IU1, IU2, IU3, IU4 deklarują `Weryfikacja: pnpm --filter sleeper-web lint exit code 0` — niespełnione.

**Fix:** wraz z P1.1 — eslint-disable-next-line. Po dodaniu, lint przejdzie. Alternatywnie: `.eslintignore` na te 2 ścieżki (gorsze, ukrywa też przyszłe regresje).

### P1.3 — `react-native-reanimated` + `react-native-worklets` w bundle bez użyć
**File:** `packages/sleeper-web/package.json:26-32`

Grep `reanimated|useSharedValue|withTiming` w `src/` zwraca pustkę — Faza 1 nie używa żadnej animacji Reanimated. Mimo to obie deps są w `dependencies` (~80-120 KB gzipped w web bundle przez `react-native-reanimated/lib/module/reanimated2/js-reanimated`).

**Fix:** **opcja A (preferowana dla Fazy 1):** usuń obie z `package.json`, dodaj z powrotem w IU8 gdy `BigActionButton` faktycznie użyje scale animation. **Opcja B:** zostaw, ale udokumentuj w kontekście że to świadomy carry dla IU8. Plan IU8 zakłada Reanimated → fallback CSS — opcja A wymusza jasną decyzję teraz.

### P1.4 — `lucide-react-native` zamiast `lucide-react` na web
**File:** `packages/sleeper-web/package.json:20`, używane w `ThemeModeBottomSheet.tsx:1`

`lucide-react-native` renderuje przez `react-native-svg` → web bundle ładuje cały adapter `react-native-svg/lib/module/web`. `lucide-react` (web-natywne SVG DOM) jest 2-3× mniejsze.

**Fix:** alias w `metro.config.js`:
```js
config.resolver.alias = { 'lucide-react-native': 'lucide-react' };
```
Działa transparentnie dla wszystkich `import { Icon } from 'lucide-react-native'` w skopiowanym kodzie z sleeper-app. Dodaj `lucide-react` jako dep, zostaw `lucide-react-native` (wymagane przez workspace lock).

## 🟠 P2-important

### P2.1 — Brak `flowType: 'pkce'` w supabase config (web)
**File:** `packages/sleeper-web/src/lib/supabase.ts:18-28`

`detectSessionInUrl: true` jest ustawione, ale domyślny `implicit` flow zwraca `access_token` w URL fragment — leakage do history API, Referer headerów (przy redirect), browser extensions. PKCE używa `?code=...` z krótko-żyjącym code wymienianym na token — best practice dla web PWA.

**Fix:** dodać `flowType: 'pkce'` w `auth` config. Wymaga skonfigurowania redirect URL whitelisty w Supabase Dashboard.

### P2.2 — Brak walidacji email/maxLength w sign-in
**File:** `packages/sleeper-web/src/app/(auth)/sign-in.tsx:42`

Sign-up używa `isValidEmail` + `MIN_PASSWORD`, sign-in tylko `trim().length > 0`. Asymetria + brak `maxLength` (potencjalny DoS payload).

**Fix:** użyj `isValidEmail` i `MIN_PASSWORD` w sign-in (early return), dodaj `maxLength={254}` na email i `maxLength={128}` na password.

### P2.3 — `new QueryClient()` poza komponentem
**File:** `packages/sleeper-web/src/app/_layout.tsx:11`

Działa dla CSR-only PWA, ale konwencja TanStack zaleca `useState(() => new QueryClient())` dla bezpieczeństwa przy fast-refresh i potencjalnym SSR/RSC w Expo Router.

**Fix:**
```ts
function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  // ...
}
```

### P2.4 — `useThemeStore` AsyncStorage na web → FOWT risk
**File:** `packages/sleeper-web/src/features/settings/useThemeStore.ts:23`

`@react-native-async-storage/async-storage` na web async-wrapuje `localStorage`. Pierwszy render z default `mode: 'system'`, potem rehydrate → re-render z prawdziwym mode = potencjalny flash of wrong theme (udokumentowany pattern, `docs/solutions/ui-bugs/2026-05-19-flash-of-wrong-theme-fowt.md`).

**Fix:** custom storage adapter `Platform.OS === 'web' ? localStorage : AsyncStorage` — sync hydration eliminuje FOWT.

### P2.5 — `_layout.tsx` referencja do nieistniejącego segmentu `(app)`
**File:** `packages/sleeper-web/src/app/_layout.tsx:19`

`<Stack.Screen name="(app)" />` referuje katalog `app/(app)/`, który nie istnieje (utworzenie w IU10). Expo-router może warningować przy build. Niski runtime impact ale architektonicznie czyste byłoby usunąć do IU10.

**Fix:** usunąć linię 19 lub dodać stub `src/app/(app)/_layout.tsx` zwracający `<Stack />`.

### P2.6 — `app/index.tsx` brak redirect logic (placeholder permanentny)
**File:** `packages/sleeper-web/src/app/index.tsx`

Po zalogowaniu user widzi "Sleeper Web — Coming soon" w nieskończoność. Faza 1 jest świadomym placeholderem, ale brak komentarza wyjaśniającego że IU5/IU10 doda redirect — przyszły dev nie wie czy to bug.

**Fix:** dodać komentarz w pliku: `// FAZA 5+: index.tsx dostanie redirect logic na podstawie useAuth().status`.

### P2.7 — Brak unit testu dla `translate-auth-error.ts`
**File:** `packages/sleeper-web/src/features/auth/translate-auth-error.ts`

Czysta funkcja, 6 branchy (invalid login, email not confirmed, already registered, password, network, fallback). Niski wysiłek, wysokie pokrycie. Mobile (sleeper-app) też nie ma — to jest nowa szansa na lift coverage bez parytetu pressure.

**Fix:** dodać `translate-auth-error.test.ts` (~30 LOC, 6 cases).

## 🟡 P3-nit

### P3.1 — `translateAuthError` fallback wycieka raw Supabase message
**File:** `packages/sleeper-web/src/features/auth/translate-auth-error.ts:21`

Fallback `return message` może wyciec PostgREST stack hint / infra error do usera.

**Fix:** fallback na generic `"Nie udalo sie. Sprobuj ponownie."` (PL parytet).

### P3.2 — `console.warn` przy missing env vars zamiast fail-loud
**File:** `packages/sleeper-web/src/lib/supabase.ts:11-16`

Brak `EXPO_PUBLIC_SUPABASE_URL` w prod build → klient z pustymi stringami → każdy signIn zwraca "Invalid URL" → translateAuthError mapuje na "Blad polaczenia. Sprawdz internet." (wprowadza w błąd). Mobile ma parytet, ale Vercel prod = realne ryzyko incydentu.

**Fix:** decyzja produktowa — `throw` w prod build (build-time check) lub dedykowany error screen.

### P3.3 — `useNow.ts` alokuje nowy `Date()` co tick
**File:** `packages/sleeper-web/src/lib/useNow.ts:21`

60 alokacji/min przy `setInterval(1000)`. Dla Fazy 1 (brak konsumentów) — neutralne, ale potencjalny smell w IU8+.

### P3.4 — AsyncStorage = localStorage XSS dług
**File:** `packages/sleeper-web/src/lib/supabase.ts:20`

JWT w localStorage dostępne dla każdego JS w originie — XSS = pełna kradzież sesji. Realne ryzyko niskie (brak user-rendered HTML), ale długoterminowo cookie HttpOnly + `@supabase/ssr` jest właściwym rozwiązaniem. Wymaga osobnej decyzji architektonicznej.

### P3.5 — Brak corrupt-JSON guard test w `useThemeStore`
**File:** `packages/sleeper-web/src/features/settings/useThemeStore.ts`

Zustand `persist` ma fallback do initial state przy corrupt JSON, ale nie pokryte testem explicit.

### P3.6 — Brak grep-test invariant `notifications.ts` ≠ `expo-notifications`
**File:** `packages/sleeper-web/vitest.config.mjs` (i n/a — wymaga nowego scriptu)

Plan IU2 wymienia grep jako weryfikację manualną, ale nie jako automated test. W IU5 powtórzy się dla `schedule-nap-side-effects.ts` — warto zautomatyzować (np. `scripts/check-no-native-imports.sh`).

### P3.7 — Plan IU2 wzmianka o `sleep-stats.test.ts` / `session-gaps.test.ts`
**File:** plan techniczny `docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md`

Plan wymienia w "Scenariusze testowe" *"time, sleep-stats, session-gaps"*, ale w sleeper-app istnieje tylko `time.test.ts`. Implementacja zgodna z dostępnym źródłem (kopia 1:1), ale plan był nieprecyzyjny — sugerowane usunięcie wzmianki lub dodanie test stubs.

### P3.8 — Niespójność dokument zadań vs rzeczywistość
**File:** `docs/active/sleeper-web-pwa/sleeper-web-pwa-zadania.md` (IU1-IU4 weryfikacje)

Każda Faza 1 IU deklaruje `Weryfikacja: pnpm --filter sleeper-web exec tsc --noEmit exit code 0`, ale 2 deferred errors łamią to. Kontekst (`sleeper-web-pwa-kontekst.md:62-71`) udokumentował deferral, ale weryfikacje w pliku zadań nie odnotowują wyjątku.

**Fix:** w pliku zadań przy weryfikacji `tsc --noEmit` dla IU1-IU4 dodać adnotację `(2 deferred TS errors → IU5)`. Albo lepiej: zaadresować P1.1/P1.2 (eslint-disable + komentarze) → tsc nadal failuje (nie da się disable TS bez `@ts-expect-error`), ale przynajmniej kod się dokumentuje sam.

### P3.9 — Provider chain bez `GestureHandlerRootView` vs sleeper-app
**File:** `packages/sleeper-web/src/app/_layout.tsx`

Sleeper-app ma dodatkowo `GestureHandlerRootView` i `KeyboardProvider`. Sleeper-web pominął (świadomie, brak `react-native-keyboard-controller` w deps). Warto zweryfikować Modal behavior w `ThemeModeBottomSheet` na web — okaże się w IU8+.

## ⚪ Info

### I.1 — `useEffectiveTheme` single-source-of-truth ZACHOWANY
Grep `useColorScheme` w `sleeper-web/src` zwraca tylko `ThemeProvider.tsx` (2 wystąpienia) + komentarz w `useThemeStore.ts:5`. Zgodne z learned pattern `docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md`. ✅

### I.2 — Native-only deps EXCLUDED
`expo-haptics`, `expo-glass-effect`, `expo-notifications`, `expo-keep-awake`, `expo-symbols`, `@react-native-community/datetimepicker`, `expo-device` — wszystkie NIEOBECNE w `package.json`. Zgodne z kontekstem "Native-only deps WYKLUCZONE". ✅

### I.3 — `notifications.ts` no-op parity z sleeper-app
5 eksportów: `configureNotificationHandler(): void`, `requestPermissions(): Promise<PermissionStatus>`, `cancelNapNotification(string): Promise<void>`, `scheduleNapNotification(input): Promise<string | null>`, type `PermissionStatus`. Signatures dokładnie matchują. ✅

### I.4 — `Delegate to:` w IU zgodne z faktyczną implementacją
- IU1 (fullstack): configs + placeholder routes — OK
- IU2 (data): lib copy + no-op notifications — OK
- IU3 (fullstack): AuthProvider (data layer) + sign-in/sign-up (UI) — OK
- IU4 (ui): ThemeProvider + useThemeStore + ThemeModeBottomSheet — OK (useThemeStore to logika UI state, akceptowalne)

## Odchylenia od planu

1. **`app/(app)/` referencja w `_layout.tsx:19` bez stub'a** — plan IU1 mówił "minimal Stack", referencja `(app)` segmentu jest premature. Patrz P2.5.
2. **Plan IU2 — `sleep-stats.test.ts`/`session-gaps.test.ts`** wymieniane w "Scenariusze testowe" ale brak w sleeper-app do skopiowania. Patrz P3.7.
3. **`expo-env.d.ts`** w `.gitignore` (linia 10) ale plik istnieje on disk — minor niespójność. Plik utworzony explicit żeby `tsc` przeszło na świeżym kloncie (udokumentowane w kontekście).

## Recommendations (priority)

1. **(P1.1, P1.2 — fix natychmiast):** komentarze + `eslint-disable-next-line import/no-unresolved` w `session-gaps.ts:1` i `sleep-stats.ts:4`. Po fix → `lint` exit 0 (`tsc` nadal failuje na 2 deferred, świadomie).
2. **(P1.3 — fix przed Fazą 2):** usuń `react-native-reanimated` + `react-native-worklets` z `package.json` do czasu IU8.
3. **(P1.4 — fix przed Fazą 2):** alias `lucide-react-native` → `lucide-react` w `metro.config.js`, dodaj `lucide-react` dep.
4. **(P2.1):** dodaj `flowType: 'pkce'` w `supabase.ts` + skonfiguruj redirect URL w Supabase Dashboard przed deployem.
5. **(P2.2):** wyrównaj walidację sign-in z sign-up, dodaj `maxLength`.
6. **(P2.3):** `useState(() => new QueryClient())` w `_layout.tsx`.
7. **(P2.4):** custom storage adapter `localStorage` na web w `useThemeStore`.
8. **(P2.5):** usuń `<Stack.Screen name="(app)" />` z `_layout.tsx:19` (do IU10).
9. **(P2.6):** komentarz w `app/index.tsx` o przyszłym redirect.
10. **(P2.7):** `translate-auth-error.test.ts` z 6 cases.

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI/grep): 5
- Pozostawione dla operatora (Manual-mobile): 6
- Failujące (P2/P1): 5 (`tsc` x4, `lint` x1)

### Szczegóły

**IU1:**
- [x] CLI: `pnpm install` → PASS
- [ ] FAIL: `pnpm --filter sleeper-web exec tsc --noEmit` → 2 deferred TS errors (P1, ale udokumentowane, fix przez P1.1)
- [ ] FAIL: `pnpm --filter sleeper-web lint` → 1 error (P1.2)
- [x] CLI: `pnpm --filter sleeper-app exec tsc --noEmit` → PASS (regression OK)
- [ ] Manual: `[Mobile-manual] localhost web placeholder działa` — patrz manual-test-faza-1.md
- [ ] Manual: `[Mobile-manual] sleeper-app w Expo Go bez zmian` — patrz manual-test-faza-1.md

**IU2:**
- [ ] FAIL: `pnpm --filter sleeper-web exec tsc --noEmit` → 2 deferred (P1.1)
- [x] CLI: `pnpm --filter sleeper-web test` → 14/14 PASS
- [x] Grep: `detectSessionInUrl: true` w supabase.ts → PASS
- [x] Grep: `expo-notifications` w notifications.ts → 0 references, PASS

**IU3:**
- [ ] FAIL: `pnpm --filter sleeper-web exec tsc --noEmit` (P1.1)
- [ ] Manual: `[Mobile-manual] logowanie istniejącym kontem` — patrz manual-test-faza-1.md
- [ ] Manual: `[Mobile-manual] persist po reload` — patrz manual-test-faza-1.md

**IU4:**
- [ ] FAIL: `pnpm --filter sleeper-web exec tsc --noEmit` (P1.1)
- [ ] Manual: `[Mobile-manual] dark/light/system działa` — patrz manual-test-faza-1.md
