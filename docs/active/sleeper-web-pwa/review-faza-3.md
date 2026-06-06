---
title: Sleeper Web — PWA — Code review Fazy 3 (UI & Routes)
data: 2026-06-06
faza: 3 (IU8 + IU9 + IU10)
branch: feature/sleeper-web-pwa
status: ⛔ WYMAGA POPRAWEK — 1 P1 (rendering blocking)
---

# Code review Fazy 3 — UI & Routes

**Zakres:** IU8 (UI components: 17 kopii 1:1 + 2 NEW web pickers + ProgressRing/SegmentedControl/BigActionButton reanimated/haptics re-add) + IU9 (auth gate + root layout sync) + IU10 (9 routes + 8 feature components).

**Severity gate:** ⛔ **WYMAGA POPRAWEK** — 1 P1 blokujący rendering, 4 P2, 5 P3.

**Liczniki:**
- 🔴 P1-blocking: **1** (KOD/E2E)
- 🟠 P2-important: **4** (KOD x3, TEST x1)
- 🟡 P3-nit: **5** (KOD x5)

**Walidacja CLI (PRE-review):**
- `pnpm --filter sleeper-web exec tsc --noEmit` → PASS (0 errors)
- `pnpm --filter sleeper-web lint` → PASS (0 errors)
- `pnpm --filter sleeper-web test` → PASS (82/82, w tym 17 nowych testów pickers)
- `pnpm --filter sleeper-app exec tsc --noEmit` → PASS (regression check)
- `pnpm --filter sleeper-web build` → PASS (`dist/index.html` + 4.42 MB JS bundle)

**Walidacja E2E (browser smoke):**
- `python3 -m http.server` na `dist/` + Playwright navigate na `http://localhost:5173/`
- HTTP 200 dla `/index.html` + bundle JS pobiera się poprawnie
- ❌ **Bundle execution FAIL:** `Uncaught SyntaxError: Cannot use 'import.meta' outside a module` — entire root tree nie renderuje (white screen, `#root` pusty).

---

## 🔴 P1-blocking — Bundle parse error przez `import.meta` z zustand@5 ESM (KOD + E2E)

### P1.1 — `import.meta.env.MODE` w bundle z zustand@5.0.14/esm/middleware.mjs

**Plik:** `packages/sleeper-web/package.json` (dependency `zustand@^5.0.13` resolwujący do 5.0.14) oraz konsumenci `features/settings/useThemeStore.ts:3` i `features/children/useActiveChild.ts:3` (`from 'zustand/middleware'`).

**Objaw E2E (browser smoke):**
```
Uncaught SyntaxError: Cannot use 'import.meta' outside a module
  @ /_expo/static/js/web/entry-a8d5f185b5703b169e83c5f1b5bdd915.js
```
Bundle wczytuje się przez `<script src="..." defer>` (NIE `type="module"`) — to klasyczny skrypt. Pierwszy `import.meta` w pobranym pliku to natychmiastowy parse error, cały tree fail, `#root` pusty (white screen).

**Root cause (zweryfikowane):**
- `zustand@5.0.14/esm/middleware.mjs` linia 64 i 126 używa `import.meta.env ? import.meta.env.MODE : void 0` (Vite-style guard dla devtools middleware).
- Metro resolver w `expo export --platform web` dopasowuje `"import"` condition z `zustand/package.json#exports` → wybiera `esm/middleware.mjs` (zamiast CJS `middleware.js`).
- Metro bundler **nie transformuje `import.meta`** dla web target — bundlowany jako raw token w klasycznym skrypcie.
- `<script defer>` (nie `type="module"`) → parse error globalny.

**Weryfikacja w pliku bundle:**
```bash
grep -c "import.meta" dist/_expo/static/js/web/entry-*.js
# 1
grep -o ".\{60\}import\.meta.\{60\}" dist/_expo/static/js/web/entry-*.js
# ...let _;try{_=(null!=p?p:"production"!==(import.meta.env?import.meta.env.MODE:void 0))&&window.__REDUX_DEVTOOLS_...
# ...e=!1;const t=f.dispatch;f.dispatch=(...n)=>{"production"===(import.meta.env?import.meta.env.MODE:void 0)||"__setState"!==n[0].type|...
```

**Skutek:** Cały Faza 3 (i regresyjnie Faza 1 sign-in/sign-up jeżeli ktoś faktycznie zrobiłby browser smoke) nie ładuje się. `pnpm build` sukces zamaskował problem — bundle istnieje, ale execution fail. Phase 2 review notował "build PASS" ale nie testował browser execution, więc problem był latentny.

**Opcje fix (rekomendacja: A):**

A) **Wymuszone aliasy `'zustand/middleware' → 'zustand/middleware.js'` (CJS)** w `metro.config.js` `resolver.alias`. CJS build nie ma `import.meta`, działa transparentnie. Najmniej inwazyjne, parity-safe.

```js
config.resolver.alias = {
  ...config.resolver.alias,
  'lucide-react-native': 'lucide-react',
  'zustand/middleware': 'zustand/middleware.js',
  'zustand': 'zustand/index.js',
};
```

B) **Globalny `import.meta` polyfill** w babel/metro transformer (overkill, ryzyko regresji w innych modułach).

C) **Downgrade do `zustand@4.x`** (zmiana API, mniejsza biblioteka — ale zaburza parytet z sleeper-app gdzie też jest 5.x).

D) **Babel plugin `babel-plugin-transform-import-meta`** w `babel.config.js` — przekształca `import.meta.env.MODE` w runtime `process.env.NODE_ENV`. Pełne pokrycie ale dodaje devDep.

**Akcja:** dodać alias do `metro.config.js`, rebuild, browser smoke test (na `http://localhost:5173/` powinno być `#root` z renderowanym Stack), bookkeeping w `dist/_expo/static/js/web/entry-*.js` — `grep -c "import.meta"` → 0.

**Klasyfikacja:** P1-blocking (KOD + E2E). Blokuje Fazę 4 deploy oraz cały manual testing IU8/IU10. Bez fixu PWA nie wstanie na Vercel.

---

## 🟠 P2-important

### P2.1 — `Alert.alert` w destruktywnych akcjach: na web no-op (KOD)

**Pliki:**
- `packages/sleeper-web/src/app/(app)/session/[id].tsx:128-148` (`handleDelete` → `Alert.alert` z confirmacją destrukcyjnej akcji)
- `packages/sleeper-web/src/features/family/components/PendingInvitationsList.tsx:21-34` (`handleRevoke` → `Alert.alert` z destruktywnym revoke)

**Problem:** `react-native-web` exportuje `Alert` ale `Alert.alert(...)` jest stub no-op (brak overlay, brak callbacku). User kliknie "Usuń sesję" lub "Cofnij zaproszenie" → cisza, brak confirmation dialogu, akcja **nigdy się nie uruchamia** (`onPress` callback w destructive button nie execute). Funkcjonalna regresja vs sleeper-app (gdzie iOS/Android pokazuje natywny alert).

**Parytet 1:1 zachowany** ale na web == funkcjonalnie broken. Plan IU8 stwierdza "kopia 1:1" — to świadoma decyzja w skali parytetu, ale dla web wymaga adaptacji.

**Fix:** abstrakcja `lib/confirm.ts`:
```ts
export function confirm(title: string, message: string): boolean {
  if (Platform.OS === 'web') return window.confirm(`${title}\n\n${message}`);
  // native uses Alert.alert with promise wrapper
}
```
Albo inline na web: `if (Platform.OS === 'web') { if (window.confirm(...)) revoke.mutate(...); return; }`.

**Klasyfikacja:** P2-important (KOD). Manual test on-device wykryłby przy próbie usunięcia. Nie blokuje renderowania, ale blokuje krytyczny flow destruktywny.

---

### P2.2 — `useFocusEffect` web edge: brak deterministic focus event (KOD, deferred P2 z Fazy 2)

**Plik:** `packages/sleeper-web/src/features/recommendation/useSleepRecommendation.ts:66`

**Status:** zaadresowany w Fazie 2 jako deferred do IU10 (`known-issues.md` P2.1), miał zostać manualnie zweryfikowany. **Fix nadal nie zaaplikowany w Fazie 3** — żaden fallback `setInterval` nie został dodany; pozostaje w stanie "to-verify".

**Problem:** `useFocusEffect` z `expo-router` na web nasłuchuje tylko `visibilitychange` (PWA bg → fg). Jeśli user trzyma kartę otwartą przez północ bez `visibilitychange`, queryKey z `dayKeyInAppTz` nie odświeży się → wczorajsze drzemki w "Sesje dzisiaj" + zła rekomendacja.

**Akcja:**
1. Manual test (operator): otwórz PWA przed 23:55, zostaw active card, sprawdź czy 00:05 nadal widzi wczorajsze sesje. Jeśli tak — fallback poniżej.
2. **Sugerowany fix preventywny (nie czekać na verify):** dodać `useEffect` z `setInterval(checkDayKey, 5 * 60 * 1000)` w `useSleepRecommendation`:
```ts
useEffect(() => {
  const id = setInterval(() => {
    const newDayKey = dayKeyInAppTz(new Date());
    if (newDayKey !== currentDayKey) {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  }, 5 * 60 * 1000);
  return () => clearInterval(id);
}, []);
```

**Klasyfikacja:** P2-important (KOD). Bug latentny — manifestuje się raz dziennie, łatwo przeoczyć.

---

### P2.3 — `expo-keep-awake` usunięty bez alternative (Wake Lock API): sleep-fullscreen nie blokuje ekranu (KOD)

**Plik:** `packages/sleeper-web/src/app/(app)/sleep-fullscreen.tsx` (komentarz "Wake Lock API jako post-MVP feature").

**Problem:** Plan IU10 explicite usunął `expo-keep-awake` (native-only), ale dla `sleep-fullscreen` to **krytyczna funkcja** — rodzic używa pełnoekranowego widoku timera podczas snu dziecka, ekran zgaśnie po iOS Safari timeout (~30s domyślnie). User nie zobaczy aktualnego timera bez ponownego dotyku, co psuje główny use-case.

Decyzja "deferred do IU11" zostawia regresję funkcjonalną w Fazie 3 — gdy user manual testuje pełen flow, sleep-fullscreen staje się bezużyteczny po pierwszym screen-off.

**Fix:** Wake Lock API ma ~30 LOC, dodać teraz nie w IU11:
```ts
useEffect(() => {
  if (Platform.OS !== 'web') return;
  let wakeLock: WakeLockSentinel | null = null;
  const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> } };
  nav.wakeLock?.request('screen').then((w) => { wakeLock = w; }).catch(() => {});
  return () => { wakeLock?.release().catch(() => {}); };
}, []);
```
iOS Safari 16.4+ wspiera Wake Lock API. Fallback (starsze Safari) — graceful degrade, no-op.

**Klasyfikacja:** P2-important (KOD). Niezauważone w typecheck/lint, manual test podczas Fazy 3 bez fixu PWA load (P1.1) niewykonalny.

---

### P2.4 — Brak testów hookow konsumentów Faza 3 (TEST)

**Pliki oczekiwane:**
- `packages/sleeper-web/src/features/sessions/components/__tests__/SessionEditForm.test.ts` (brak)
- `packages/sleeper-web/src/features/sessions/components/__tests__/BackdatedSessionModal.test.ts` (brak)
- `packages/sleeper-web/src/features/family/components/__tests__/` (brak całego folderu)
- `packages/sleeper-web/src/components/__tests__/BigActionButton.test.ts` (brak — smart type logic, haptics fire-and-forget)

**Plan:** IU8/IU10 wprowadziły 8 nowych form components + 9 routes. Zero unit testów dla nich. Pickers (NEW) mają 17 testów (PASS) — wzorzec udowodniony. Strategia "pure-functions only" + "static invariants przez readFileSync" — idealnie dopasowana do nowo dodanych komponentów.

**Sugerowane (minimum):**
- `SessionEditForm.test.ts` — `handleSave` validation paths (endDate <= startDate, future start, future end) static invariants
- Static invariants: `Alert.alert` użycie (po P2.1 fix), brak `setHours`/`setDate` na raw Date, użycie `combineDateAndTimeInAppTz` we wszystkich onChange

**Klasyfikacja:** P2-important (TEST). Realny gap przed Fazą 4 deploy — zero coverage dla form flow.

---

## 🟡 P3-nit

### P3.1 — `<input>` w TimePickerField/DatePickerField z RN klasami z Tailwind — niespójność stylingu

**Pliki:** `packages/sleeper-web/src/components/TimePickerField.tsx:68-93`, `DatePickerField.tsx:71-97`

Inline `style={{...}}` z border/padding zamiast Tailwind className. NativeWind v4 obsługuje DOM elements pod RN web (`react-native-web`), ale raw `<input>` to czysty DOM — przeszedłby `className` z Tailwind bezpośrednio do DOM. Decyzja "inline style" jest defensywna ale traci spójność z resztą stylingu komponentów (Card/Chip używają Tailwind).

**Sugestia:** użyć `className="text-base min-h-[44px] border border-purple/30 rounded-xl px-3 py-2 mt-1 w-full bg-transparent text-inherit"` zamiast inline `style`. Mniej kodu, jeden źródło stylu.

**Klasyfikacja:** P3-nit (KOD). Kosmetyka, nie blokuje.

---

### P3.2 — `console.warn` leak w prod bundle (deferred z Fazy 2 P2.3)

**Plik:** `packages/sleeper-web/src/features/sessions/hooks.ts:293`

Status: deferred do IU11 (`known-issues.md`). Bundle Fazy 3 zawiera ten warn (live cardio confirm: `grep -n "console.warn" dist/_expo/static/js/web/entry-*.js` zwróci match). Fix planowany w IU11 przez `babel-plugin-transform-remove-console` w `babel.config.js`.

**Akcja:** zachować w `known-issues.md` na IU11.

**Klasyfikacja:** P3-nit (KOD). Hardening, nie regresja.

---

### P3.3 — Default `mode` Pressable BigActionButton tylko CSS-based scale (KOD)

**Plik:** `packages/sleeper-web/src/components/BigActionButton.tsx:49-53`

Plan IU8 wymieniał `BigActionButton` z "Pressable style scale fallback dla web" — implementacja używa `style={({ pressed }) => pressed ? { transform: [{ scale: 0.97 }], opacity: 0.85 } : null}`. To OK ale **nie ma `worklets`-driven animation** zachowanego z mobile. Mobile używa reanimated dla smooth interpolation. Web ma tylko skok 1.0 → 0.97. Akceptowalne dla MVP ale informacyjnie — sleeper-app i sleeper-web będą wyglądać inaczej (mobile smooth, web "twardy snap").

**Sugestia:** jeśli reanimated re-added w deps (i jest), użyć `useAnimatedStyle` na obu platformach — parytet visual. Jeśli web reanimated nie działa runtime, accept obecne CSS scale.

**Klasyfikacja:** P3-nit (KOD). Visual polish.

---

### P3.4 — `aria-label` zamiast `aria-labelledby` w pickers (a11y)

**Pliki:** `TimePickerField.tsx:74`, `DatePickerField.tsx:78`

Picker ma `<Text>` z labelem + `<input aria-label={accessibilityLabel ?? label}>`. Lepiej: `<input aria-labelledby={textId}>` + `<Text nativeID={textId}>` — screen reader przeczyta visual label, a `aria-label` go nadpisuje (gdy `accessibilityLabel` różni się od `label`, screen reader nie usłyszy że to "Data startu" ale custom string). Marginalna różnica ale a11y best practice.

**Klasyfikacja:** P3-nit (KOD). A11y polish.

---

### P3.5 — `lucide-react-native` w `BigActionButton.tsx:2` mimo aliasu (parytet ok, ale shrinkable)

**Plik:** `packages/sleeper-web/src/components/BigActionButton.tsx:2` (`import { Moon } from 'lucide-react-native'`)

Metro alias `lucide-react-native → lucide-react` (z `metro.config.js`) działa, ale zachowuje import w sourcecode jako `lucide-react-native`. Parytet z sleeper-app — preferowane. Sygnał dla przyszłego dev że alias istnieje, nie odruch.

Akcja: zostaw, ale udokumentuj w `coding-rules.md` learned-patterns "Web aliasing zachowuje source-level parity".

**Klasyfikacja:** P3-nit (KOD). Informacyjne.

---

## Odchylenia od planu

- ✅ **Parytet 1:1 zachowany** — wszystkie 28 plików IU10 mają komentarz "kopia 1:1", potwierdzony `diff` Faza 3 (pkt kontekst).
- ⚠️ **`Alert.alert` zostawiony bez adaptacji web** — plan IU10 nie wskazywał kontraktu confirm dialog. P2.1.
- ⚠️ **`expo-keep-awake` usunięty bez Wake Lock fallback** — plan IU10 deferral do IU11, ale `sleep-fullscreen` jest top-3 flow → P2.3 (move fix do Fazy 3).
- ✅ **TimePickerField/DatePickerField nowe pliki** wg planu, 17 testów (target: minimum 1 happy path + edge cases) — ✅ przekroczony.
- ✅ **Re-add reanimated/worklets/haptics** — zgodne z planem (cofnięcie P1.3 z Fazy 1). Bundle wzrósł do 4.42 MB (vs ~3.5 MB Faza 2), akceptowalne dla SPA.
- ⚠️ **Brak testów komponentów form** — plan IU8/IU10 explicite nie wymagał testów `SessionEditForm`/`BackdatedSessionModal`, ale review "Faza 2 P2.2 → dodano hooks testy" ustanowił wzorzec. Gap.

---

## Wnioski cross-cutting

1. **`pnpm build` exit 0 ≠ runtime works.** Phase 2 build "success" nie zweryfikował execution. Phase 3 review jako pierwszy odpalił browser, wykryto P1.1. Dla Fazy 4: dodać `build:smoke` skrypt z `python3 -m http.server` + curl `index.html` + headless browser console-error check.

2. **Parytet 1:1 nie chroni przed web-specific bugs.** Alert.alert (P2.1), expo-keep-awake (P2.3), zustand ESM (P1.1) — wszystkie wynikły z "copy-paste = same behavior" assumption. Każdy native API call wymaga manual scan.

3. **Test coverage form components zero.** Wzorzec "static invariants + pipeline simulation" z `pickers.test.ts` (17 cases) jest skalowalny — replikować dla `SessionEditForm` przed Fazą 4.

4. **Web Wake Lock API to ~30 LOC** i adresuje rzeczywisty UX regression. Nie zostawiać do IU11.

5. **Zachowane learned-patterns:** TZ-safe time (pickers z `parseAppTzDateTime`+`combineDateAndTimeInAppTz`), single-source theme (`useEffectiveTheme`), stabilny queryKey (`useMemo`), `hitSlop` (Pressable w QuickActions itd.), no `setHours`/`setDate` (testy potwierdzają).

---

## Bookkeeping checkboxów Weryfikacja:

### Faza 3 — IU8

| Checkbox | Klasyfikacja | Akcja |
|---|---|---|
| `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 | CLI | ✅ PASS → odznaczyć `[x]` |
| `[Mobile-manual] TimePicker pokazuje natywny iOS wheel` | Mobile manual | `[ ]` + ` — manual test (patrz manual-test-faza-3.md)` |
| `[Mobile-manual] brak white screen / console errors` | Mobile manual | `[ ]` + ` — manual test` ⚠️ **(P1.1 blokuje obecnie)** |
| `[Mobile-manual] BigActionButton animation działa` | Mobile manual | `[ ]` + ` — manual test` |

### Faza 3 — IU9

| Checkbox | Klasyfikacja | Akcja |
|---|---|---|
| `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 | CLI | ✅ PASS → `[x]` |
| `[Mobile-manual] auth gate działa` | Mobile manual | `[ ]` + ` — manual test` ⚠️ **(P1.1 blokuje)** |

### Faza 3 — IU10

| Checkbox | Klasyfikacja | Akcja |
|---|---|---|
| `pnpm --filter sleeper-web exec tsc --noEmit` exit code 0 | CLI | ✅ PASS → `[x]` |
| `pnpm --filter sleeper-web lint` exit code 0 | CLI | ✅ PASS → `[x]` |
| `[Mobile-manual] wszystkie screens renderują się` | Mobile manual | `[ ]` + ` — manual test` ⚠️ **(P1.1 blokuje)** |
| `[Mobile-manual] cross-day night sleep zapisuje poprawnie` | Mobile manual | `[ ]` + ` — manual test` |
| `[Mobile-manual] cross-device sync z sleeper-app` | Mobile manual | `[ ]` + ` — manual test` |

### Sumary

- Odznaczone automatycznie (CLI/grep): **4** (3 tsc + 1 lint)
- Pozostawione dla operatora (Manual): **6** (mobile manual — wymagają fixu P1.1 + lokalnego serwera)
- Niejasne (P3): 0
- Failujące (P2): 0 z CLI (wszystkie CLI PASS); P1 wykryty tylko przez E2E browser smoke poza listą checkboxów planu

---

## Decyzja severity gate (re-applied po bookkeeping)

⛔ **WYMAGA POPRAWEK** — 1 problem P1 blokujący (rendering bundle):

- **P1.1** musi być naprawiony przed jakimkolwiek manual testem / przed Fazą 4 deploy. Bez fixu PWA nie wstanie ani lokalnie, ani na Vercel.

Po fixie P1.1 → ponowny browser smoke test → przejście do Fazy 4 z 4 otwartymi P2 (P2.1/P2.3 sugerowane fix w Fazie 3; P2.2/P2.4 deferrable do Fazy 4 z dokumentacją).

---

## Wynik E2E

- **E2E smoke**: 1 passed (HTTP 200, bundle download), **1 failed (bundle execution → white screen)**.
- Test commands:
  ```
  cd packages/sleeper-web/dist && python3 -m http.server 5173
  curl -I http://localhost:5173/index.html  # 200 OK
  # Playwright navigate http://localhost:5173/
  # → 2 errors: 404 favicon.ico (cosmetic), "Cannot use 'import.meta' outside a module" (P1.1 blocking)
  # → snapshot empty (root pusty)
  ```

Po fixie P1.1 (alias zustand/middleware → CJS w metro.config.js) ponowić smoke — oczekiwany rezultat: snapshot zawiera `<Stack>` Renderowany z auth screen widoczny (signed_out fallback).
