import { useEffect, useState } from 'react';

// Znacznik startu appki (eval tego modulu ~ moment montazu Reacta). Modul-level,
// wiec WSPOLDZIELONY miedzy miejscami pokazujacymi <AppLoader> — minimalny czas
// liczy sie od startu appki, nie od montazu konkretnego komponentu (auth-loader
// i bootstrap-loader to dwa rozne mounty tego samego wizualnie loadera).
const APP_START = Date.now();

// Domyslny minimalny czas widocznosci loadera startowego.
export const MIN_LOADER_MS = 1000;

// Zwraca true gdy od startu appki uplynelo >= `ms`. Sluzy do trzymania loadera
// startowego minimum X ms — eliminuje "migniecie", gdy auth + dane rozwiazuja
// sie bardzo szybko (np. z cache). To FLOOR, nie ceiling: wolniejszy load i tak
// trzyma loader dluzej (przez wlasny warunek isLoading w miejscu uzycia).
export function useMinElapsedSinceAppStart(ms: number = MIN_LOADER_MS): boolean {
  const [elapsed, setElapsed] = useState(() => Date.now() - APP_START >= ms);

  useEffect(() => {
    if (elapsed) return;
    const remaining = ms - (Date.now() - APP_START);
    if (remaining <= 0) {
      setElapsed(true);
      return;
    }
    const timer = setTimeout(() => setElapsed(true), remaining);
    return () => clearTimeout(timer);
  }, [elapsed, ms]);

  return elapsed;
}
