# Review Fazy 3: Algorytm Kotki Dwa — migracja + gitignore

**Data:** 2026-05-29
**Branch:** `feature/fixy-i-kotki-dwa-algorytm`
**Commit Fazy 3:** `098c7f4`
**Reviewer:** dev-docs-review (5-perspektywowy)

---

## Wynik: CZYSTE

**P1=0, P2=0, P3=2**

Severity gate: ✅ **GOTOWE DO KONTYNUACJI** — 2 nity do rozważenia (nieblokujące).

---

## Pliki sprawdzone

- `packages/sleeper-app/supabase/migrations/0011_children_algorithm.sql` (NOWY)
- `packages/sleeper-app/src/lib/database.types.ts` (regen manual)
- `.gitignore` (root)

---

## Perspektywa 1: Security

### Findings

Brak P1, brak P2.

**Weryfikacja RLS:** Nowe pole `algorithm` podlega istniejącym politykom RLS na tabeli `children` zdefiniowanym w `0007_children_sessions.sql`:
- `children: family members can read` — `using (public.is_family_member(family_id))`
- `children: family members can update` — `using/with check (public.is_family_member(family_id))`

Pole `algorithm` nie wymaga osobnych policy-level guard'ów — RLS jest row-level, nie column-level. Tylko members tej samej rodziny mogą odczytać/zaktualizować rekord dziecka.

**Weryfikacja gitignore:** `data-book/` poprawnie wpisane w `.gitignore`. `git ls-files` potwierdza brak pliku w indeksie (`data-book/przewodnik_sen.pdf` nie jest tracked). `git status` nie pokazuje `data-book/` w żadnym trybie (clean, untracked, staged).

**PDF copyright:** PDF referencyjny (`przewodnik_sen.pdf`) istnieje lokalnie w `data-book/` ale nie jest commitowany — zgodnie z planem Fazy 3.

### Nit

🟡 [P3-nit] **.gitignore:23** — komentarz wymienia autorkę z nazwiskiem (`Marta Stam / Kotki Dwa`). Brak ryzyka technicznego, ale warto rozważyć anonimizację do `# Materialy referencyjne — copyright, nie do dystrybucji` jeśli repo stanie się kiedykolwiek publiczne.

---

## Perspektywa 2: Performance

### Findings

Brak P1, brak P2.

**Analiza nowego pola `text NOT NULL DEFAULT 'galland'`:**
- Rozmiar: `text` dla wartości `'galland'` (7 bajtów) / `'kotki_dwa'` (9 bajtów) — pomijalny.
- NOT NULL z DEFAULT: PostgreSQL przy `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT` z literalną wartością stałą (nie volatile) wypełnia istniejące wiersze in-place bez przepisywania tabeli (fast default, PostgreSQL ≥ 11). Brak blokady ACCESS EXCLUSIVE na dłużej niż chwilę.
- Index na `algorithm`: brak. Nie jest potrzebny — tabela `children` ma maksymalnie kilka wierszy per rodzina. Zapytania będą full-scan na małym zbiorze (nie jest ścieżką hot query).

---

## Perspektywa 3: Architecture & Code Quality

### Findings

Brak P1, brak P2.

**Wzorzec SQL:** Migracja `0011` stosuje ten sam wzorzec `check constraint na text` co `sessions.type` w `0007`:
```sql
type text not null check (type in ('nap', 'night_sleep'))
```
vs
```sql
algorithm text not null default 'galland' check (algorithm in ('galland', 'kotki_dwa'))
```
Spójne z istniejącą konwencją projektu (brak PostgreSQL ENUM — łatwiej dodać wartość bez DDL).

**Backward compatibility:** NOT NULL z DEFAULT 'galland' — bezpieczne dla istniejących wierszy. PostgreSQL 11+ fast default (metadata-only change, brak full table rewrite dla stałego defaultu).

**database.types.ts:** Pole `algorithm: string` (nie union) w `Row` — zgodne z decyzją z kontekstu (`algorithm` jako `string` w typach DB, węższy union `'galland' | 'kotki_dwa'` pojawi się w Fazie 5 w `features/children/hooks.ts`). Wzorzec zgodny z `sessions.type: string` w tym samym pliku.

**Brakujący komentarz nagłówkowy:** `0011_children_algorithm.sql` nie ma komentarza nagłówkowego w stylu `0010_child_preferences.sql` (tam 8 linii komentarza z uzasadnieniem decyzji). Minimalny plik — tylko 3 linie.

🟡 [P3-nit] **0011_children_algorithm.sql:1** — brak komentarza nagłówkowego. Wszystkie poprzednie migracje mają opis decyzji (`-- Migracja XXXX: ...`). Spójność projektu sugeruje dodanie 3-5 linii komentarza. Nieblokujące — funkcjonalność poprawna.

---

## Perspektywa 4: Scenario Exploration & Test Coverage

### Findings

Brak P1, brak P2.

**Scenariusze happy path:**
- Nowy INSERT do `children` bez podania `algorithm` → domyślnie `'galland'` (DEFAULT).
- INSERT z `algorithm='kotki_dwa'` → akceptowany przez CHECK.
- INSERT z `algorithm='nieznany'` → odrzucony przez CHECK (constraint violation).
- UPDATE `algorithm` → akceptowany przez RLS + CHECK.

**Boundary conditions:**
- Pole NOT NULL z DEFAULT — brak możliwości NULL po migracji. Stare wiersze backfillowane do `'galland'` przez PostgreSQL.
- CHECK constraint zamiast ENUM — dodanie nowego algorytmu w przyszłości = nowa migracja z nowym CHECK. Brak breaking change.

**Test coverage:** Brak unit testów dla migracji SQL — zgodnie z wzorcem projektu (migracje weryfikowane przez `supabase local up`, nie przez vitest). `database.types.ts` to generated/manual file — brak unit testów. Akceptowalne dla tej fazy.

**Weryfikacja CLI:** tsc EXIT 0, lint EXIT 0.

---

## Perspektywa 5: Mobile Manual Test Checklist

Checkboxy `Weryfikacja:` z Fazy 3:

1. `git status` po commit nie pokazuje `data-book/przewodnik_sen.pdf` — **CLI** (git)
2. `pnpm --filter sleeper-app exec tsc --noEmit` — **CLI** (tsc)
3. `Supabase local up → migracja przechodzi bez błędów` — **Manual operator** (wymaga lokalnej instancji Supabase)

Brak checkboxów mobile UI (📱, Expo Go, device) — Faza 3 jest czysto backendowa (migracja + gitignore).

---

## Bookkeeping checkboxów Weryfikacja:

- Odznaczone automatycznie (CLI/grep): 2
- Odznaczone na podstawie Agent 5 E2E: 0
- Pozostawione dla operatora (Manual): 1
- Niejasne (P3): 0
- Failujące (P2): 0

### Szczegóły

- [x] CLI: `git status` po commit nie pokazuje `data-book/przewodnik_sen.pdf` → PASS (komenda: `git status --short` + `git ls-files --error-unmatch data-book/przewodnik_sen.pdf` exit 1 = nie tracked)
- [x] CLI: `pnpm --filter sleeper-app exec tsc --noEmit` — 0 błędów → PASS (exit 0)
- [ ] Manual operator: `Supabase local up → migracja przechodzi bez błędów` — wymaga lokalnej instancji Supabase (uruchamiana przez usera)

---

## Skonsolidowane findings

| Severity | ID | Perspektywa | Plik | Opis |
|---|---|---|---|---|
| 🟡 P3-nit | ARCH-01 | Architecture | `0011_children_algorithm.sql:1` | Brak komentarza nagłówkowego — spójność z 0010 |
| 🟡 P3-nit | SEC-01 | Security | `.gitignore:23` | Komentarz wymienia nazwisko autorki — rozważyć przy publicznym repo |

---

## Podsumowanie

Faza 3 jest minimalna, correcta i spójna z wzorcami projektu. Migracja SQL jest bezpieczna (fast default PostgreSQL 11+, backward compatible), RLS chroni nowe pole automatycznie przez row-level policies. `data-book/` prawidłowo gitignorowany, PDF nie trafił do indeksu. Typy DB zaktualizowane zgodnie z decyzją (string → union w Fazie 5). CLI: tsc PASS, lint PASS.
