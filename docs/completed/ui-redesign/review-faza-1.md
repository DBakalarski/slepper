# Code Review — Faza 1 (Dark mode manual override)

**Data:** 2026-05-28
**Branch:** `feature/ui-redesign`
**Commit:** `cddac73` (feat — faza 1 dark mode manual override)
**Reviewer:** dev-docs-review (5 agentów review skonsolidowane)
**Severity gate:** ✅ **CZYSTE — GOTOWE DO KONTYNUACJI**

## Statystyki

| Severity | Liczba | Typ |
|---|---|---|
| 🔴 P1 (blocking) | 0 | — |
| 🟠 P2 (important) | 0 | — |
| 🟡 P3 (nit) | 4 | KOD: 3, TEST: 1, MANUAL: 0 |
| ⚪ Manual checklist | 1 plik (`manual-test-faza-1.md`) — DEFERRED do Fazy 5, non-blocking |

**Pliki sprawdzone:** 3 zmienione (`_layout.tsx`, `useThemeStore.ts`, `ThemeProvider.tsx`)
**LOC delta:** +105 / -19

## Cross-reference z planem

Implementacja zgodna z `ui-redesign-plan.md > Faza 1` i `ui-redesign-zadania.md > Faza 1 > Implementacja`:

- ✅ `darkMode: 'class'` w `tailwind.config.js` (potwierdzone z Fazy 0)
- ✅ `useThemeStore` z Zustand + AsyncStorage persist, state `mode`, action `setMode` — zgodnie z planem
- ✅ `ThemeProvider` opakowuje children, czyta `useColorScheme()` + store, oblicza `effectiveTheme`, propaguje przez className `dark` na root `<View>`
- ✅ Mount w `src/app/_layout.tsx` powyżej `Stack` (`ThemeProvider > RootLayoutContent > Stack`)
- ✅ `expo-status-bar` `style` bindowany do `effectiveTheme`
- ✅ Bonus poza planem: eksportowany `useEffectiveTheme()` hook + typ `EffectiveTheme` — przygotowanie pod konsumentów (Profil Faza 5, potencjalne kolory SVG)

**Odchylenia od planu:** brak.

## Skonsolidowane findings (5 agentów)

### Agent 1 — Security Sentinel

**Verdict:** CZYSTE.

- Brak auth, network, RLS, deep links, user input wymagających walidacji
- AsyncStorage przechowuje tylko literał `mode` (`'system'|'light'|'dark'`) — zero PII, zero secrets
- Klucz `theme-mode` nie koliduje z istniejącymi (sprawdzone: `@react-native-async-storage` używany tylko przez `supabase` z prefiksem `sb-`)
- `useColorScheme()` to read-only RN API — brak surface

Brak findings.

### Agent 2 — Performance Oracle

**Verdict:** CZYSTE.

- `useEffectiveTheme()` wywołane w 2 miejscach (`ThemeProvider` + `RootLayoutContent`) → 2 subskrypcje store + 2 wywołania `useColorScheme`. Koszt znikomy (oba hooki tanie, store selector zwraca prymityw `mode` → React.equals).
- Drugi `useColorScheme` da się uniknąć — `RootLayoutContent` mógłby przyjąć `effectiveTheme` z context-providera zamiast wywoływać hook ponownie. Ale to mikro-optymalizacja, current code jest czytelniejszy. **Nie warto refaktorować.**
- `<View className="dark flex-1">` jako root — jeden dodatkowy node w drzewie. Layout impact: zero (`flex-1` przezroczyste w hierarchii Safe Area + Stack).
- Re-render na zmianę motywu: tylko ThemeProvider → cały subtree re-rendered (oczekiwane, NativeWind v4 nie ma sposobu na surgical update klas `dark:*`).
- Brak N+1, brak memoization gaps, brak useEffect cleanup leak (komponenty bez useEffect).

Brak findings.

### Agent 3 — Architecture & TypeScript

**Verdict:** CZYSTE z 3 nitpickami.

- 🟡 **P3 [arch-nit] — explicit return type**: `ThemeProvider({ children }: ThemeProviderProps)` (linia 30) bez explicit `ReactElement`. Formalna odchyłka od reguły §10 ("Wszystkie publiczne funkcje mają explicit return types"). Spójne z Fazą 0 nitem #3 — decyzja: zostawić (konwencja React/Expo), lub dodać w Fazie 6 polish.

- 🟡 **P3 [arch-followup-faza-2] — `(app)/_layout.tsx:11` używa raw `useColorScheme()`**: Tab bar colors w `(app)/_layout.tsx` (linie 33-37) bindowane do systemowego `useColorScheme`, NIE do `useEffectiveTheme`. Skutek: manual override (Light/Dark wybrane przez usera) **NIE wpływa na kolor tab bara** — śledzi tylko system. To bug znany, ALE Faza 2 jawnie dotyka tego pliku ("tab bar redesign"). **Akcja: w Fazie 2 podmienić `useColorScheme()` na `useEffectiveTheme()` z `ThemeProvider`.** Heads-up dla `feature-builder-ui` Fazy 2 — dopisane do "Do poprawy po review fazy 1" jako kontekst, NIE bloker fazy 1.

- 🟡 **P3 [arch-nit] — `<View className={...}>` ternary inline**: Linia 33 `ThemeProvider.tsx` ma ternary w className. Czytelne, ale alternatywa `clsx`-style byłaby bardziej skalowalna gdy dojdą kolejne warianty. Aktualnie 2 warianty (dark / not-dark) — ternary OK. Nie naprawiać.

**Pozytywne obserwacje:**
- File sizes: 27, 37, 46 linii — wszystkie << 50 linii funkcja, << 300 linii plik ✅
- No `any`, no `!.`, no `as` ✅
- Imports grouped (third-party → local) i alfabetyczne ✅
- Naming: `useEffectiveTheme` (camelCase hook), `ThemeMode`/`EffectiveTheme` (PascalCase types bez prefiksu `I`) ✅
- Single Responsibility: store = state, provider = applies className, hook = computes derived value ✅
- Discriminated union `'system'|'light'|'dark'` zamiast boolean flag ✅ (zgodne z §10 i §3)
- Komentarze tłumaczą WHY (dlaczego `'system'` default, dlaczego fallback `'light'` przy null) — nie WHAT ✅
- Eksport `useEffectiveTheme` i `EffectiveTheme` przygotowuje pod Fazę 5 bez over-engineering ✅

### Agent 4 — Scenario Exploration & Test Coverage

**Verdict:** CZYSTE z 1 future-test sugestią.

**Scenariusze przeszły code-walk:**
- **Happy path 1**: `mode='system'`, `systemScheme='dark'` → `effectiveTheme='dark'` → root View `className="dark flex-1"` → cała appka dark ✅
- **Happy path 2**: `mode='light'`, `systemScheme='dark'` → `effectiveTheme='light'` → root View `className="flex-1"` (no dark) → override aktywny ✅
- **Boundary 1**: `systemScheme === null` (RN edge case przy starcie modułu) → fallback `'light'` (linia 16 ThemeProvider) ✅
- **Boundary 2**: AsyncStorage hydration race — przed hydratacją `mode = 'system'` (initial Zustand state). Jeśli user wcześniej wybrał `'dark'`, będzie milisekundowy flash do system theme → settle na 'dark' po hydratacji. **Acceptable dla MVP** — analog FOWT z `learned-patterns.md`, ale w RN nie ma synchronicznego sposobu na pre-render hydratację AsyncStorage. Mitigacja: `onRehydrateStorage` callback + splash screen gating, ALE to over-engineering dla MVP fazy 1. Sprawdzić wizualnie w Fazie 5 manual test (już w `manual-test-faza-1.md` Scenariusz 2).
- **Concurrent operations**: `setMode` jest synchroniczny (Zustand set), AsyncStorage write asynchroniczny w tle. Jeśli user szybko klika System→Light→Dark, ostatnia wartość wygrywa (Zustand persist debouncuje internally). ✅
- **Scale**: store ma 2 pola (mode + setMode) — n/a dla scale concerns.

**Test coverage:**
- 🟡 **P3 [test-future-sugg]** — `useEffectiveTheme()` to pure derived hook (input: `mode`, `systemScheme` → output: `'light'|'dark'`). Idealny kandydat na unit test gdy projekt dostanie Jest + RNTL. Edge cases warte testu:
  - `mode='system'` × `systemScheme='light'|'dark'|null` (3 cases)
  - `mode='light'` × dowolne `systemScheme` (override wins)
  - `mode='dark'` × dowolne `systemScheme` (override wins)
  Łącznie 5 testów, wszystkie deterministyczne. Plan techniczny `ui-redesign-plan.md` nie definiował `Test scenarios:` (brak `docs/plans/`) — brak brakujących testów do zgłoszenia jako P2.

### Agent 5 — Mobile Manual Test Checklist Generator

**Verdict:** Wygenerowano `manual-test-faza-1.md` (DEFERRED do Fazy 5).

**Niezaznaczone checkboxy `Weryfikacja:` z Fazy 1 do manual testing:**

- `Walidacja po Fazie 5 (gdy toggle w Profilu działa): przełączyć każdą z 3 opcji` → ✅ **checklist_generated** (Scenariusz 1 w `manual-test-faza-1.md`)
- `Sprawdzić persist między restartami appki` → ✅ **checklist_generated** (Scenariusz 2 w `manual-test-faza-1.md`)

**Klasyfikacja:** Oba scenariusze są **DEFERRED do Fazy 5** — nie da się ich wykonać manualnie bez UI togglera w Profilu (Faza 5). User świadomie zaplanował to w taki sposób (potwierdzone w prompt: "Walidacja 'z Fazy 5' (toggle UI + persist) jest zaplanowana po implementacji bottom sheet — NIE klasyfikuj jako bloker").

**NIE klasyfikujemy jako P2.** Checkboxy pozostają `[ ]` w `ui-redesign-zadania.md` z suffixem ` — manual test (patrz manual-test-faza-1.md)`.

---

## Walidacja CLI (automatyczna z Fazy 1)

| Komenda | Status | Notatka |
|---|---|---|
| `npx tsc --noEmit` | ✅ PASS | 0 błędów (sprawdzone w review 2026-05-28) |
| `npm run lint` | ✅ PASS | 0 błędów (sprawdzone w review 2026-05-28) |

---

## Bookkeeping checkboxów `Weryfikacja:`

- Odznaczone automatycznie (CLI/grep): 0 (już odznaczone wcześniej przez `dev-docs-execute` po Fazie 1)
- Odznaczone na podstawie Agent 5: 0
- Pozostawione dla mobile manual (DEFERRED do Fazy 5): 2
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły

- [x] CLI: `npx tsc --noEmit + npm run lint PASS` → już odznaczone w pliku zadań (linia 90)
- [x] CLI: `Commit + Commit log` → już odznaczone (linie 91-92)
- [ ] Manual: `Walidacja po Fazie 5: przełączyć każdą z 3 opcji` — manual test (patrz manual-test-faza-1.md), DEFERRED
- [ ] Manual: `Sprawdzić persist między restartami appki` — manual test (patrz manual-test-faza-1.md), DEFERRED

---

## Podsumowanie

✅ **CZYSTE — kontynuuj do Fazy 2**

Faza 1 jest minimalna i poprawna. 3 pliki implementacji, każdy z explicite określonym celem, brak nadmiarowej abstrakcji, brak `any`/non-null assertion. Findings są wyłącznie P3 nity (formalna odchyłka §10 + heads-up dla Fazy 2 że tab bar nadal czyta raw `useColorScheme`).

**Heads-up dla Fazy 2:** `feature-builder-ui` MUSI w `(app)/_layout.tsx:11` podmienić `useColorScheme()` na `useEffectiveTheme()` (import z `@/features/settings/ThemeProvider`), żeby tab bar respektował manual override. Bez tego override Light/Dark NIE wpływa na kolor tab bara.

**Manual test:** Pełna walidacja end-to-end (3 tryby + persist + dark mode parity ekranów) odłożona do Fazy 5 — checklist gotowy w `manual-test-faza-1.md` (5 scenariuszy: toggle, persist, parity, edge cases, two-device).
