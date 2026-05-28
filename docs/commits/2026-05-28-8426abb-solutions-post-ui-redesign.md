# 8426abb: docs(solutions): post-ui-redesign learnings (theme, queryKey, hitSlop)

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** post-autopilot cleanup (commit untracked z dev-compound)

## Co zostalo zrobione
- Zacommitowane 3 nowe rozwiazania w `docs/solutions/` wygenerowane przez `/dev-compound` po autopilocie ui-redesign
- Zacommitowany `runtime-errors/tz-safe-time-pattern.md` (zostal z poprzedniej sesji, byl untracked)
- Zaktualizowany `.claude/rules/learned-patterns.md`: 3 → 6 regul

## Zmienione pliki
- `docs/solutions/ui-bugs/2026-05-28-use-effective-theme-vs-use-color-scheme.md` (nowy)
- `docs/solutions/ui-bugs/2026-05-28-hitslop-vs-padding-for-touch-targets.md` (nowy)
- `docs/solutions/performance-issues/2026-05-28-usememo-querykey-refetch-loop.md` (nowy)
- `docs/solutions/runtime-errors/2026-05-27-tz-safe-time-pattern.md` (zaadoptowany — byl untracked)
- `.claude/rules/learned-patterns.md` — +3 reguly rule-worthy

## Powod / kontekst
Pliki powstaly autonomicznie podczas autopilota (compound step) ale pozostaly untracked. Bez commitu zginely by przy push lub byly mylacy w `git status`.

## Walidacja
- typecheck: n/a (tylko dokumentacja)
- test: n/a
- runtime: n/a
