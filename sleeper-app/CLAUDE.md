@AGENTS.md

## Commit logging — OBOWIAZKOWE

Dla **kazdego** commitu w tym projekcie tworzysz osobny plik w `docs/commits/` (w katalogu root `sleeper/`, nie w `sleeper-app/`).

**Procedura przy commicie:**

1. Wykonaj `git commit` standardowo.
2. Odczytaj short hash: `git rev-parse --short HEAD`.
3. Utworz plik `docs/commits/YYYY-MM-DD-<short-hash>-<slug>.md` z opisem (format ponizej).
4. Zacommituj sam ten plik osobnym commitem: `docs(commits): log <short-hash>`.

**Format pliku:**

```markdown
# <short-hash>: <commit subject>

**Data:** YYYY-MM-DD
**Branch:** <branch>
**Faza zadania:** <faza-name lub "n/a">

## Co zostalo zrobione
- Punkt 1
- Punkt 2

## Zmienione pliki
- `path/to/file` — krotki opis zmiany

## Powod / kontekst
Dlaczego ta zmiana, jakie problemy rozwiazuje, jakie odchylenia od planu.

## Walidacja
- typecheck: PASS/FAIL
- test: PASS/FAIL/n/a
- runtime: jak zweryfikowano (np. "user testowal w Expo Go")
```

**Wyjatki:** brak. Jesli zapomnisz — uzupelnij retroaktywnie przed nastepnym commitem.

Plik `summary.md` w root jest w `.gitignore` — nie zostal stworzony przez Claude, nie commituj go.
