# ae180f0: feat(web): minimalny czas loadera ~1s od startu (koniec migania przy szybkim loadzie)

**Data:** 2026-06-26
**Branch:** main
**Faza zadania:** n/a (follow-up do b8061d1 — zgloszenie usera: "moze daj loader na min 1sek zeby tak nie migalo")

## Co zostalo zrobione
- Gdy auth + dane rozwiazuja sie blyskawicznie (np. z cache), loader pokazywal
  sie na ulamek sekundy i znikal -> "migniecie". Dodano minimalny czas
  widocznosci loadera ~1s, liczony od startu appki.
- `src/lib/use-min-loader-time.ts` (NOWY): hook `useMinElapsedSinceAppStart(ms)`
  + stala `MIN_LOADER_MS = 1000`. Znacznik `APP_START` na poziomie modulu
  (eval ~ montaz Reacta) — WSPOLDZIELONY miedzy miejscami pokazujacymi loader,
  zeby minimum liczylo sie od startu appki, nie od montazu komponentu
  (auth-loader w _layout i bootstrap-loader w TodayScreen to dwa rozne mounty
  tego samego wizualnie loadera). `setTimeout` z cleanup (coding-rules §13).
- `TodayScreen`: loader gdy `isBootstrapping || !minLoaderElapsed`.
- `(auth)/_layout`: signed_out trzyma loader do minimum (formularz logowania nie
  miga po szybkim auth-check); signed_in -> `Redirect` BEZ opoznienia.
- `(app)/_layout` auth-gate SWIADOMIE bez floora: floor tam blokowalby montaz
  `TodayScreen` i szeregowal pobieranie danych (loader + fetch). Na TodayScreen
  floor dziala RОWNOLEGLE z fetchem -> total = max(1s, czas_danych), bez kary.

## Zmienione pliki
- `src/lib/use-min-loader-time.ts` — NOWY, hook + stala min czasu
- `src/app/(app)/index.tsx` — warunek loadera rozszerzony o `!minLoaderElapsed`
- `src/app/(auth)/_layout.tsx` — floor dla signed_out, redirect bez opoznienia

## Powod / kontekst
Floor (dolny prog), nie ceiling: wolniejszy load i tak trzyma loader dluzej przez
`isBootstrapping` / `status==='loading'`. Floor dotyka tylko pierwszej ~1s zycia
appki (po niej `elapsed` zostaje true na stale, wiec nie wymusza loadera przy
pozniejszych re-renderach). Dopelnia UX startu z 0.8.0.

## Walidacja
- typecheck: PASS (`tsc --noEmit`)
- test: PASS (vitest, 32 pliki / 279 testow)
- build: PASS (`expo export` -> dist, 2.67 MB)
- runtime (signed-out): Playwright na dist — 0 bledow konsoli, sciezka konczy sie
  na /sign-in (loader schodzi po min-czasie, brak zawieszenia). Signed-in flow
  (TodayScreen) — do weryfikacji na urzadzeniu usera (`web:dev`).
