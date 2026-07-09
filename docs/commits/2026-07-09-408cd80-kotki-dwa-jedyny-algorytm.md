# 408cd80: feat(web): kotki_dwa jako jedyny algorytm (usuniety przelacznik + korekta za drzemke)

**Data:** 2026-07-09
**Branch:** main
**Faza zadania:** n/a (bezposredni request usera)

## Co zostalo zrobione
- Usunieto wyswietlanie "Korekta za drzemke" z karty okna aktywnosci (tylko UI — obliczenie `nextSleepShiftMinutes` w `sleeper-machine-kotki` pozostaje nietkniete).
- Usunieto przelacznik wyboru algorytmu (Galland / Kotki Dwa) z formularza edycji dziecka oraz sciezke zapisu `algorithm` w hooku `useUpdateChild`.
- Kotki Dwa staje sie domyslnym i jedynym wybieralnym algorytmem: nowa migracja zmienia default kolumny i migruje istniejace wiersze `galland` -> `kotki_dwa`.
- Kod algorytmu Galland (`packages/sleeper-machine`) oraz galaz `isKotkiDwa` w `ActiveWindowCard` zachowane — Galland jest tylko nieosiagalny z UI.

## Zmienione pliki
- `packages/sleeper-web/src/components/ActiveWindowCard.tsx` — usuniete `correctionText` (obliczenie + render).
- `packages/sleeper-web/src/features/children/components/EditChildForm.tsx` — usuniete state `algorithm`, sekcja "Algorytm rekomendacji", pole w payloadzie `updateChild.mutate`.
- `packages/sleeper-web/src/features/children/hooks.ts` — usuniete `algorithm` z `UpdateChildInput` / destrukturyzacji / patcha; zaktualizowany komentarz przy `Child.algorithm`.
- `packages/sleeper-web/supabase/migrations/0014_default_kotki_dwa.sql` — `alter column algorithm set default 'kotki_dwa'` + `update ... where algorithm = 'galland'`.

## Powod / kontekst
User: "usun korekte za drzemke, usun mozliwosc zmiany algorytmu, zostaw defaultowo kotki-dwa, ale nie pokazuj tego w aplikacji". Decyzje doprecyzowane: (1) usuniecie korekty tylko na poziomie UI, (2) migracja wszystkich istniejacych dzieci na `kotki_dwa`, (3) kod Galland zostaje w repo. Poniewaz nie ma zadnego innego miejsca pokazujacego nazwe algorytmu, usuniecie przelacznika = algorytm niewidoczny w aplikacji.

## Walidacja
- typecheck: PASS (`pnpm web:build:check` — tsc web + oba pakiety algorytmow)
- lint: PASS
- test: PASS (vitest + static-invariants; brak testow referujacych usuniety kod)
- build: PASS (expo export web -> dist)
- runtime: nie testowano w przegladarce; migracja 0014 wymaga aplikacji do Supabase (source-of-truth w migrations/).
