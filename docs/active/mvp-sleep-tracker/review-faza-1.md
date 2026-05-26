# Review Fazy 1 — Auth + model rodziny

**Data:** 2026-05-26
**Branch:** feature/mvp-sleep-tracker
**Commity objęte review:** `35ae857` (kod) + `b2a64a9` (types regen + cleanup)

## Statystyki

- Plików sprawdzonych: 13 (3 migracje SQL + 10 TS/TSX)
- 🔴 [P1-blocking]: **3** (1 security + 2 scenario, częściowo nakładające się)
- 🟠 [P2-important]: **14** (3 security + 3 perf + 5 TS/arch + 3 scenario)
- 🟡 [P3-nit]: ~15
- 📱 Manual checklist: wygenerowany → `manual-test-faza-1.md`

**Verdict severity gate:** ⛔ **BLOKUJE** — 3 P1, w tym fundamentalna luka security (pre-claim invitation exploit).

---

## P1 — Blocking

### P1.1 Pre-claim invitation exploit (privilege escalation)
**Pliki:** `supabase/migrations/0004_triggers.sql:5-44` + `supabase/migrations/0003_rls.sql:69-76`

Atakujący Alice rejestruje konto → ma swoją rodzinę. Alice wykonuje `INSERT INTO family_invitations(email='bob@example.com', invited_by=alice)` — RLS pozwala bo Alice jest członkiem swojej rodziny. Bob (właściciel emaila) później robi sign-up — trigger `handle_new_user` znajduje najstarsze pending invitation matching email i wpisuje Boba jako `member` w rodzinie Alice **bez consent**. Alice (owner) widzi dane Boba (Faza 2+: dzieci, sesje snu).

Powiązane: jeśli legalny partner Boba też wyśle invitation po Alice, FIFO (`order by created_at asc`) wybiera Alice.

**Fix (rekomendowany):** Explicit consent step.
- Trigger NIE auto-acceptuje. Po sign-up user widzi listę pending invitations matching jego email i klika "Dołącz".
- Nowy RPC `accept_invitation(invitation_id)` SECURITY DEFINER, sprawdza `lower(auth.users.email) = lower(invitations.email)`.
- Domyślnie po sign-up tworzy się pusta rodzina (jak teraz), ale invitation NIE jest acceptowany automatycznie.

### P1.2 Partner z istniejącym kontem nigdy nie dołączy do rodziny
**Pliki:** `supabase/migrations/0004_triggers.sql` (brak gałęzi "existing user"), `src/features/family/api.ts` (brak `useAcceptInvitation`), `src/app/(app)/profile.tsx` (brak UI pending-for-me)

Trigger odpala się WYŁĄCZNIE po `INSERT INTO auth.users`. Jeśli partner istnieje wcześniej (zarejestrował się sam) — Owner wpisuje jego email, invitation siedzi `accepted_at=null` na zawsze. UI komunikuje "Po sign-up uzyje tego emaila" co jest mylące i niedziałające.

**Fix:** Naprawiany tą samą zmianą co P1.1 — `accept_invitation` RPC + UI po sign-in pokazujące dostępne invitations dla `auth.email()`.

### P1.3 Brak fallbacku gdy trigger zfailuje — ślepy zaułek
**Pliki:** `src/app/(app)/profile.tsx:171-174`

Jeśli trigger `handle_new_user` zfailuje (transient DB error, admin-API insert pomijający trigger, etc.), `useCurrentFamily` zwraca null → profile pokazuje `"Brak rodziny. Skontaktuj sie z supportem."`. Solo dev = brak supportu. Sleeper jest cegłą.

**Fix:** RPC `ensure_family()` (SECURITY DEFINER) wywoływane po sign-in jeśli brak membership, ALBO przycisk "Stwórz rodzinę" z mutacją zamiast statycznego tekstu.

---

## P2 — Important

### Security

- 🟠 **[P2-security] migrations/0001_families.sql:21** — Brak globalnego unique na pending invitations (per-family OK, ale dwie rodziny mogą zaprosić ten sam email równolegle, trigger picks FIFO). Powiązane z P1.1 — likwidowane przez consent flow.

- 🟠 **[P2-security] migrations/0004_triggers.sql:5** — Trigger fires na auth.users insert niezależnie od `email_confirmed_at`. Account-squatting risk: atakujący "rezerwuje" email ofiary (sign-up bez confirmation), Supabase rejestruje user, trigger tworzy rodzinę, ofiara nie może już założyć konta. Likwidowane przez consent flow (P1) + ewentualnie zmiana triggera na `AFTER UPDATE OF email_confirmed_at`.

- 🟠 **[P2-security] migrations/0003_rls.sql:16-36** — UPDATE policy na `families` bez column-level restriction. Owner może zmodyfikować PK `id` (osierocia rodzinę przez zmianę). Niska realność, defense-in-depth.
  **Fix:** `revoke update (id, created_at) on public.families from authenticated` lub dedykowany RPC do zmiany nazwy.

### Performance / re-renders

- 🟠 **[P2-perf] src/features/auth/AuthProvider.tsx:45-51** — Context `value` tworzony świeży przy każdym renderze. Każde refresh tokena (~co 1h w tle) propaguje nową referencję, cały subtree re-renderuje.
  **Fix:** `useMemo` na value object.

- 🟠 **[P2-perf] src/app/(auth)/sign-in.tsx:26-40 + sign-up.tsx:44-62** — `handleSubmit` robi `await + setState` bez cancel/unmount guard. Race przy szybkiej nawigacji.
  **Fix:** użyj `useMutation` (jak `useInviteMember`) — TanStack Query automatycznie cancel'uje. Alternatywnie `useRef<boolean>` flag.

- 🟠 **[P2-perf] src/features/family/api.ts:37-79** — `useCurrentFamily` robi 3 sekwencyjne queries (membership → family → members). Można skleić w 1 z PostgREST embed: `from('family_members').select('role, family:families!inner(id, name, members:family_members(...))')`. Mniej round-trips, queryFn schudnie z 44 LOC do ~20.

### Architecture / TS

- 🟠 **[P2-arch] src/features/family/api.ts** — Plik nazwany `api.ts` zawiera wyłącznie hooki Reacta. Myląca nazwa.
  **Fix:** rename na `hooks.ts` (zero refaktoru, tylko mv + update imports).

- 🟠 **[P2-arch] src/features/auth/AuthProvider.tsx:27-31** — `supabase.auth.getSession()` bez `.catch()`. Jeśli rzuci (AsyncStorage corruption), `status` zostaje `'loading'` forever → app zawisa na splash.
  **Fix:** dodać `.catch(() => { if (!cancelled) setStatus('signed_out'); })`.

- 🟠 **[P2-arch] src/features/auth/AuthProvider.tsx:10-15** — `AuthContextValue` nie wykorzystuje discriminated union mimo że `status` jest właściwą flagą. Konsumenci muszą wszędzie `?.`. Zalecane:
  ```ts
  type AuthContextValue =
    | { status: 'loading'; session: null; user: null }
    | { status: 'signed_out'; session: null; user: null }
    | { status: 'signed_in'; session: Session; user: User };
  ```

- 🟠 **[P2-arch] src/app/(app)/profile.tsx:53** — `message.toLowerCase().includes('duplicate')` to sprzężenie z tekstem Postgres. PostgrestError ma stabilne pole `code` ('23505' = unique violation).
  **Fix:** sprawdzaj `error.code === '23505'` zamiast string-match.

- 🟠 **[P2-arch] src/app/(app)/profile.tsx (211 LOC)** — Komponent miesza: user identity card, family list, invite form, pending invitations, sign-out. Bliski progu 300 LOC, łatwo go przekroczy w Fazie 2+.
  **Fix:** wyciągnąć `FamilyMembersList`, `InviteMemberForm`, `PendingInvitationsList` do `features/family/components/`.

### Scenario / coverage

- 🟠 **[P2-scenario] migrations/0004_triggers.sql** — Race: dwóch ownerów zaprasza ten sam email w tym samym czasie. UNIQUE jest per-family (`family_invitations_open_per_family_email_idx`), nie globalny. Trigger FIFO. UI nie informuje przegranego ownera o "wiszącym" invitation.

- 🟠 **[P2-scenario] src/app/(app)/profile.tsx:79-81** — `handleSignOut` nie czyści TanStack Query cache. Stary user data residual w pamięci. Mała realność na osobistym telefonie, ale przy wspólnym urządzeniu — wyciek danych w cache.
  **Fix:** w `AuthProvider.onAuthStateChange` handle `'SIGNED_OUT'` → `queryClient.clear()`.

- 🟠 **[P2-scenario] src/app/(auth)/sign-up.tsx:55-62** — Sign-up redirect do `/` zanim trigger ukończył tworzenie rodziny. `useCurrentFamily` może wyrenderować "Brak rodziny" flash.
  **Fix:** `useCurrentFamily` z `retry: 3` + delay, lub refetch po `_event === 'SIGNED_IN'`.

---

## P3 — Nit (skrócone)

- 🟡 `supabase.ts:13` — `console.warn` zamiast `throw` mimo komentarza "Fail-fast"
- 🟡 `family/api.ts:85` — `parseRole` cicho fallback do `'member'` przy nieoczekiwanej wartości (lepiej `console.warn` + Zod w Fazie 2+)
- 🟡 `sign-in.tsx + sign-up.tsx` — `translateAuthError` zduplikowany (2 użycia = ekstrakcja zasadna)
- 🟡 `sign-up.tsx:17 + profile.tsx:16` — `EMAIL_REGEX` zduplikowany
- 🟡 `sign-in.tsx:39 + sign-up.tsx:61` — `router.replace('/')` redundantne (AuthLayout robi redirect)
- 🟡 `sign-up.tsx:121 vs sign-in.tsx:91` — niespójność `disabled={submitting}` vs `disabled={!canSubmit}`
- 🟡 `profile.tsx:79-81` — `handleSignOut` bez catch i UI feedbacka
- 🟡 `sign-in.tsx`, `sign-up.tsx` — brak `useRef` cancel flag w handleSubmit
- 🟡 `sign-up.tsx:18` — `MIN_PASSWORD = 6` zbyt słabe (rekomendacja: ≥8 + zxcvbn)
- 🟡 `lib/supabase.ts:20` — AsyncStorage vs expo-secure-store dla refresh tokena
- 🟡 `sign-up.tsx:148-149` — komunikat "Konto z tym emailem juz istnieje" leakuje istnienie konta (user enumeration)
- 🟡 `family/api.ts:141-158` — `useRevokeInvitation` brak `.eq('family_id', familyId)` jako belt-and-suspenders
- 🟡 `profile.tsx:204` — `member.user_id.slice(0, 8)` zamiast emaila partnera (limit RLS — `auth.users` niedostępny z klienta)
- 🟡 `profile.tsx` — `Alert.alert` revoke bez per-item loading state
- 🟡 `family_invitations` schema — brak `accepted_by` user_id (audyt niemożliwy)

---

## Co jest zrobione DOBRZE

- Strict type safety: zero `any`, zero `!`, zero rzutowań
- `AuthStatus` jako union (zgodne z coding-rules.md §10)
- Hook rules: brak warunkowych hooków
- Cleanup w `AuthProvider` z `cancelled` flag
- Import grouping konsekwentny (third-party → `@/` → relative)
- Naming: `handle*`, `is*`, kebab-case files
- `invalidateQueries` po mutacji (rule projektowa: nie patchuj cache ręcznie)
- `useCurrentFamily` poprawnie unika niedefiniowanego klucza (`userId ?? 'anonymous'` + `enabled`)
- `parseRole` helper (zawężenie z gen-types `string` do union)

---

## Test coverage

- Pliki testowe znalezione: 0
- Konfiguracja Jest/Vitest: brak
- Plan wymagał testów dla Fazy 1: NIE (explicit "testy: brak setupu" w CLAUDE.md)
- **Decyzja projektu:** brak testów dla Fazy 0/1 zgodne z `CLAUDE.md` (project-specific override coding-rules.md §2)
- Manual verification taski #41-#42 w `mvp-sleep-tracker-zadania.md` są niezaznaczone → pending

---

## Bookkeeping checkboxów Weryfikacja:

- Weryfikacja: sign-up dwóch userów + invite → `[ ]` — manual test (patrz `manual-test-faza-1.md`)
- Weryfikacja: user A NIE widzi family usera B → `[ ]` — manual test (patrz `manual-test-faza-1.md`)

Oba checkboxy mobile-manual, pozostawione `[ ]` z suffixem. User wykonuje na urządzeniu i sam odznacza.

---

## Rekomendacja kolejności napraw

**Priorytet 1 (BLOKUJE merge i Fazę 2):**
1. P1.1 + P1.2 (jedna zmiana — explicit consent flow): nowy RPC `accept_invitation`, modyfikacja triggera (nie auto-accept), UI ekran "Dołącz do rodziny X" po sign-in jeśli są pending dla auth.email()
2. P1.3 (jedna zmiana): RPC `ensure_family` LUB przycisk "Stwórz rodzinę" w fallbacku

**Priorytet 2 (przed mergem, low effort, high value):**
3. P2-arch: dodać `.catch` w `getSession` (5 min)
4. P2-arch: rename `api.ts` → `hooks.ts` (2 min)
5. P2-arch: discriminated union w `AuthContextValue` (15 min)
6. P2-perf: `useMemo` na context value (5 min)
7. P2-arch: `error.code === '23505'` zamiast string-match (10 min)
8. P2-scenario: `queryClient.clear()` na SIGNED_OUT (5 min)

**Priorytet 3 (można w Fazie 2+):**
9. P2-perf: PostgREST embed w `useCurrentFamily` (15 min)
10. P2-perf: cancel guard w handleSubmit (15 min)
11. P2-arch: ekstrakcja komponentów z `ProfileScreen` (30 min)
12. P2-scenario: refetch po SIGNED_IN dla `useCurrentFamily` (10 min)
13. P2-security: column-level restriction na UPDATE families (5 min)
14. P3 batch (10-15 min): EMAIL_REGEX/translateAuthError extraction, error.code, password min length

**Effort summary:** P1 ~2-3h, P2 high-value ~45min, P2 reszta ~1h, P3 ~15min.
