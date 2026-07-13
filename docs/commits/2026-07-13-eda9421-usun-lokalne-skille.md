# eda9421: chore(claude): usun nieuzywane lokalne skille

**Data:** 2026-07-13
**Branch:** main
**Faza zadania:** n/a

## Co zostalo zrobione
- Zacommitowanie skasowania 69 plikow z `.claude/skills/*` (usuniecia byly
  juz w working tree — user skasowal katalogi wczesniej, poza ta sesja).

## Zmienione pliki
- `.claude/skills/{bugfix,code-quality,code-review,coolify-manager,dev-*,eas-build,expo-rn-testing,gemini,security,sentry-integration,supabase-dev-guidelines,tailwind-react-guidelines,ux-ui-guidelines,zroastuj-mnie}/` — usuniete w calosci

## Powod / kontekst
Lokalne skille projektowe zostaly zastapione przez pluginy i skille globalne
(superpowers, code-review, frontend-design itd.). Commit porzadkuje working
tree do stanu clean.

## Walidacja
- typecheck: n/a (tylko pliki .md/.sh w .claude/)
- test: n/a
- runtime: n/a
