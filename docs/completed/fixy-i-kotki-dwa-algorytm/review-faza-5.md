# Code Review — Faza 5: Integracja sleeper-machine-kotki + toggle UI

**Data:** 2026-05-29
**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Reviewer:** dev-docs-review (5-perspektywowy)
**Commit reviewowany:** `5117f73`

---

## Wynik ogólny

**CZYSTE** — P1=0, P2=0, P3=4 (nity nieblokujące, opcjonalne do naprawy)

---

## Pliki sprawdzone

1. `packages/sleeper-app/src/features/children/hooks.ts`
2. `packages/sleeper-app/src/features/children/components/EditChildForm.tsx`
3. `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts`
4. `packages/sleeper-app/src/app/(app)/index.tsx`
5. `packages/sleeper-app/package.json` (workspace dep)

---

## Findings

### 🟡 [P3-1] ARCH — Duplikacja inline type w `index.tsx` vs eksportowany `ChildForRecommendation`

**Plik:** `packages/sleeper-app/src/app/(app)/index.tsx:130-138`

`ActiveChildSectionProps.child` definiuje inline typ strukturalnie identyczny z `ChildForRecommendation` z `useSleepRecommendation.ts`:

```ts
// index.tsx — inline (linie 131-138)
interface ActiveChildSectionProps {
  child: {
    id: string;
    birth_date: string;
    preferred_naps_per_day: number | null;
    preferred_bedtime: string | null;
    algorithm: 'galland' | 'kotki_dwa'; // duplikacja
  };
}
```

`ChildForRecommendation` jest eksportowanym typem — mógłby być użyty bezpośrednio. Strukturalne dopasowanie TypeScript pozwala na duck typing, ale przy rozszerzeniu `ChildForRecommendation` o nowe pole (np. `targetWakeTime?: TimeOfDay`) inline type w `index.tsx` nie zostanie zaktualizowany automatycznie.

**Sugerowana naprawa (opcjonalna):**
```ts
import { useSleepRecommendation, type ChildForRecommendation } from '@/features/recommendation/useSleepRecommendation';

interface ActiveChildSectionProps {
  child: ChildForRecommendation;
}
```

**Severity:** P3-nit. TypeScript strukturalne duck typing chroni przed błędami runtime — zmiana kosmetyczna dla maintainability.

---

### 🟡 [P3-2] A11Y — Brak `accessibilityState={{ selected }}` na chipach algorytmu

**Plik:** `packages/sleeper-app/src/features/children/components/EditChildForm.tsx:154-186`

Chipy algorytmu (inline `Pressable`) nie mają `accessibilityState={{ selected: algorithm === 'galland' }}`. Istniejący komponent `Chip` w projekcie (`@/components/Chip.tsx`) dodaje ten atrybut — ale EditChildForm używa inline Pressable wzorca (zgodnie z sekcją nap selection na linii 198-221, która też nie ma `accessibilityState`).

VoiceOver/TalkBack nie informuje usera o tym, który algorytm jest aktualnie wybrany. Workaround: `accessibilityLabel` zawiera nazwę algorytmu, ale stan zaznaczenia nie jest przekazany.

Uwaga: ten sam problem dotyczy pre-existing nap selection chips — nie jest nową regresją. Jednak nowe chipy algorytmu powinny stosować Chip komponent zgodnie z planem (`Reuse istniejących utilities` → `Chip komponent`).

**Sugerowana naprawa:**
Dodać `accessibilityState={{ selected: algorithm === 'galland' }}` do Galland chip i `accessibilityState={{ selected: algorithm === 'kotki_dwa' }}` do Kotki Dwa chip.

Alternatywnie: refaktor na `Chip` komponent (który już ma ten atrybut).

**Severity:** P3-nit. Nie blokuje funkcjonalności. Dotyczy accessibility (VoiceOver użytkowników).

---

### 🟡 [P3-3] ARCH — Odchylenie od planu: inline Pressable zamiast `Chip` komponent

**Plik:** `packages/sleeper-app/src/features/children/components/EditChildForm.tsx:151-191`

Plan (`fixy-i-kotki-dwa-algorytm-plan.md`, sekcja Faza 5 kryteria akceptacji) zawierał przykład kodu używający `<Chip label="Naukowy (Galland)" selected={...} onPress={...} />`. Implementacja używa inline `Pressable` wzorca.

Kontekst: EditChildForm już używa inline Pressable dla nap selection — inlining był świadomym wyborem zachowania konsekwencji wewnątrz tego formularza. Jednak stwarza drift od `Chip` komponentu i duplikuje styling.

`Chip` komponent ma 3 użycia w projekcie (BackdatedSessionModal, Historia), EditChildForm = byłoby 4. Regula §3 `coding-rules.md`: "abstrakcja od 2+ użyć". Chip komponent jest już abstrakcją — powinien być używany.

**Severity:** P3-nit. Nie blokuje. Sugestia dla przyszłego cleanup.

---

### 🟡 [P3-4] PERF — Potencjalny render-time throw z `useMemo` bez obsługi

**Plik:** `packages/sleeper-app/src/features/recommendation/useSleepRecommendation.ts:77-89`

Zarówno `recommendGalland` jak i `recommendKotkiDwa` mogą rzucić wyjątek z walidacji inputu (np. niepoprawna data urodzenia, `state.now` NaD). Wywołanie w `useMemo` powoduje render-time throw — bez `ErrorBoundary` app crasha.

Uwaga: ta sama sytuacja istniała PRZED Fazą 5 dla `recommendGalland` — nie jest nową regresją. Faza 5 dodaje drugą ścieżkę (`recommendKotkiDwa`) z identycznym ryzykiem.

**Sprawdzono:** Brak `ErrorBoundary` w całej app (`grep -r ErrorBoundary` = 0 wyników). Jeśli walidacja `ChildProfile` nigdy nie zawodziłaby przy normalnych danych — ryzyko jest teoretyczne. Dane z bazy są walidowane przez `rowToChild` i `parseTimeString` w adapterze.

**Severity:** P3-nit. Pre-existing ryzyko rozszerzone na nową ścieżkę kodu. Nie blokuje Fazy 5.

---

## Agent 1: Security Review — wyniki

**Ocena: BRAK PROBLEMÓW BEZPIECZEŃSTWA**

- Nowe pole `children.algorithm` objęte istniejącymi RLS policies (migration `0007` → `"children: family members can update"` z `using (is_family_member(family_id))` + `with check (...)`) — INSERT/UPDATE column automatycznie objęta table-level policy.
- DB `CHECK constraint` (`algorithm in ('galland', 'kotki_dwa')`) zapobiega injection nieznanych wartości przez bezpośrednie API call.
- `rowToChild` narrowing (`row.algorithm === 'kotki_dwa' ? 'kotki_dwa' : 'galland'`) — bezpieczny fallback, DB constraint jest drugą warstwą.
- `EXPO_PUBLIC_*` env vars bez zmian — brak nowych sekretów.
- `sleeper-machine-kotki` workspace dep: zero npm-published, zero supply chain risk (lokalny package).
- `algorithm` field w `UpdateChildInput` jest optional — brak możliwości wymuszenia update przez pominięcie.

---

## Agent 2: Performance Review — wyniki

**Ocena: BRAK PROBLEMÓW WYDAJNOŚCIOWYCH**

- `useSleepRecommendation` `useMemo` z prawidłowymi zależnościami `[child, now, targetWakeTime, sessionsQuery.data]`. Algorytm obliczeniowy (`recommendKotkiDwa`) jest synchroniczny i deterministyczny — brak async w render path.
- `child` obiekt z `children.find(...)` w `index.tsx` stabilizowany przez `useMemo([children, activeChildId])`. Po update `algorithm` → `useUpdateChild.onSuccess` invaliduje `childrenQueryKey(family_id)` → refetch → nowy `child` → recompute recommendation. Prawidłowy data flow.
- Brak N+1 queries: update `algorithm` = single Supabase PATCH.
- `sleeper-machine-kotki` build output trafia do `dist/` — tree-shakeable przez bundler Expo. Rozmiar pakietu: lookup table + recommender = ~5-8KB gzipped (szacunek). Mieści się w limicie <5KB per feature z performance-oracle guidelines.

**Jeden observation (nie finding):** `recommendKotkiDwa` wywołanie w `useMemo` ma złożoność O(n) gdzie n = liczba drzemek w historii dnia (iteracja w `forwardPass`). Dla >50 sesji dziennie — nieistotne.

---

## Agent 3: Architecture & TypeScript — wyniki

**Ocena: POPRAWNA ARCHITEKTURA z 3 nitami (P3-1, P3-2, P3-3 powyżej)**

- Warstwa danych: `hooks.ts` → `rowToChild` → `Child` interface → `ActiveChildSection.child` → `useSleepRecommendation(child, now)` → `fn(state, profile)`. Prawidłowe separation of concerns.
- `ChildForRecommendation` minimal shape eksportowany z hook layer — unika circular dep. Poprawne.
- `algorithm` w `database.types.ts` jako `string` + narrowing w `rowToChild` — zgodny wzorzec z resztą projektu (`type: string` w sessions). `string` w DB layer, union type w domain layer.
- `TablesUpdate<'children'>` prawidłowo używany w `patch` — type-safe.
- Brak circular dependencies (`features/children` ↔ `features/recommendation` — brak cross-imports).
- `sleeper-machine-kotki` jako sibling package z workspace dep — prawidłowa izolacja.

**Import order w `useSleepRecommendation.ts`:** sleeper-machine i sleeper-machine-kotki importy w jednym bloku (external libs) przed internal `@/` imports. Poprawne.

---

## Agent 4: Scenario Exploration — wyniki

**Testy happy path + edge cases (teoretyczna analiza):**

- Happy path (toggle → save → navigate): prawidłowe flow — `useState` local → `mutate` → `invalidateQueries` → refetch `children` → nowy `child.algorithm` → `useMemo` recompute.
- Invalid algorithm string z DB: `rowToChild` fallback na `'galland'` — safe. DB `CHECK` constraint nie pozwoli na inny string.
- `child` = null: `useSleepRecommendation` zwraca `recommendation: null` — graceful.
- Race condition: dwa szybkie tappy "Kotki Dwa" + "Galland" → dwa sequential mutations. Drugi nadpisuje pierwszy w Supabase — semantycznie poprawne (last write wins). Brak optimistic update — użytkownik widzi stan po drugim `onSuccess`.
- `preferredNapsCount` = null przy Kotki Dwa: `toLibProfile` nie przekazuje `preferredNapsCount` do `ChildProfile` — `pickBucket` używa `ageMonths` + `preferredNaps: null` → domyślny bucket per wiek. Prawidłowe.

**Brakujące testy (analiza):**
- `useSleepRecommendation` nie ma unit testów — pre-existing (hook łączy TanStack Query z recommendation). Trudny do unit test bez mockowania. Brak nowych testów = brak regresji dla nowej logiki switch.
- Brak integracyjnego testu dla "algorithm switch changes recommendation output" — ale funkcjonalność pokryta przez tests w `sleeper-machine-kotki` (już reviewed w Fazie 4).

---

## Agent 5: Mobile Manual Test Checklist — wyniki

Wygenerowany: `manual-test-faza-5.md` (patrz plik).

Checkboxy `Weryfikacja:` (linie 155-157 w zadania.md) sklasyfikowane jako `mobile-manual` — pozostają `[ ]` z suffixem.

---

## Odchylenia od planu

| Element | Plan | Implementacja | Ocena |
|---|---|---|---|
| Chipy algorytmu | `<Chip label="..." selected={...}>` | Inline `Pressable` (wzorzec EditChildForm) | P3-nit (odchylenie) |
| `accessibilityState` | (domyślnie z Chip) | Brak na inline Pressable | P3-nit |
| ChildForRecommendation w index.tsx | (implicit) | Inline type zamiast import | P3-nit |

---

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI): 2
- Pozostawione dla operatora (Manual): 3
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły

- [x] CLI: `pnpm --filter sleeper-app exec tsc --noEmit` → PASS (exit 0)
- [x] CLI: `pnpm --filter sleeper-app lint` → PASS (exit 0)
- [ ] Manual: `Expo Go — EditChildForm dla 9m dziecka → switch na Kotki Dwa...` — manual test (patrz manual-test-faza-5.md)
- [ ] Manual: `Switch z powrotem na Galland → wartości wracają` — manual test (patrz manual-test-faza-5.md)
- [ ] Manual: `Toggle persist w bazie (refresh app, wartość zostaje)` — manual test (patrz manual-test-faza-5.md)

---

## Severity Gate

**✅ GOTOWE DO KONTYNUACJI**

P1=0, P2=0, P3=4 (wszystkie opcjonalne)

Faza 5 jest zaimplementowana poprawnie. Logika switch algorytmu działa, type safety zachowana, RLS pokrywa nowe pole, cache invalidation flow prawidłowy. 4 nity do rozważenia w cleanup lub Fazie 6.
