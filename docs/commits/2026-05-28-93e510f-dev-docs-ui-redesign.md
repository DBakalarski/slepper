# 93e510f: docs: inicjalizacja planu dla ui-redesign

**Data:** 2026-05-28
**Branch:** feature/ui-redesign
**Faza zadania:** n/a (inicjalizacja zadania)

## Co zostalo zrobione
- Utworzono nowy branch `feature/ui-redesign` (z `feature/mvp-sleep-tracker`)
- Wygenerowano strukture `docs/active/ui-redesign/` przez skill `/dev-docs @design.md`
- 3 pliki dokumentacji: plan strategiczny, kontekst, checklist zadan
- `design.md` (untracked) zacommitowany jako source-of-truth dla zadania

## Zmienione pliki
- `design.md` — nowy (source-of-truth, 250 linii, plan 7 faz UI redesign)
- `docs/active/ui-redesign/ui-redesign-plan.md` — cele, zakres, 7 faz, pliki krytyczne, dependencies, ryzyka, mierniki
- `docs/active/ui-redesign/ui-redesign-kontekst.md` — modyfikowane/nowe pliki, decyzje techniczne, designerski kontekst, zaleznosci faz, rekomendowane skille
- `docs/active/ui-redesign/ui-redesign-zadania.md` — checklist per faza, 5 decyzji-blokerow Fazy 0 z rekomendacjami

## Powod / kontekst
User uruchomil `/dev-docs @design.md` po wczesniejszej sesji designerskiej, w ktorej powstal `design.md` z planem redesignu trzech ekranow (Dzisiaj, Historia, Profil) + tab bar. Skill ma utworzyc trwala strukture zarzadzania zadaniem, ktora przetrwa resety kontekstu i pozwoli na kontynuacje przez `/dev-docs-execute`.

**Decyzje zakresowe** (z `design.md`, potwierdzone z userem 2026-05-27):
- Scope: 3 ekrany + tab bar, Statystyki out of scope
- Single-child first (brak dropdown switchera, brak sekcji "DZIECI")
- Dark mode manual override (system/light/dark) — wymaga migracji `darkMode: 'media' → 'class'`
- Bell + Przypomnienia visual only (placeholdery)

**Decyzje z dialogu skilla:**
- Slug: `ui-redesign` (wybor usera)
- 5 otwartych pytan z `design.md` wciagnietych jako blokery Fazy 0 (prefix `Decyzja:`)

**Brak `docs/plans/` i `docs/brainstorms/`** → sekcja "Zrodla" w obu plikach pokazuje `null` dla planu technicznego i requirements doc, `design.md` jako source-of-truth.

**Designerski kontekst:** `design.md` w root pelni role DESIGN.md projekt-wide. Brak `figma_spec` i screenow w repo (user wskazal screeny ustnie podczas sesji `/design`).

## Walidacja
- typecheck: n/a (brak zmian w kodzie aplikacji)
- test: n/a
- runtime: n/a — to commit dokumentacyjny

## Nastepny krok
`/dev-docs-execute docs/active/ui-redesign` — rozpoczecie Fazy 0 (decyzje + design system foundation).
