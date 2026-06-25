import { useEffect, useState } from 'react';

// Po tylu ms bezczynnosci zawartosc ekranu sesji przygasa (auto-dim, R2).
export const IDLE_DIM_MS = 20_000;

export interface IdleDimmer {
  isDimmed: boolean;
  // Resetuje licznik bezczynnosci i rozjasnia ekran. Wolany przy kazdej
  // interakcji (tap overlaya wybudzania, dotkniecie CTA).
  wake: () => void;
}

export interface IdleDimmerController {
  // Rozjasnia (isDimmed -> false) i restartuje licznik bezczynnosci.
  wake: () => void;
  // Zatrzymuje licznik (clearTimeout) — wolane w cleanup hooka.
  stop: () => void;
}

// Pure controller logiki auto-dim: trzyma jeden setTimeout, ktory po
// `timeoutMs` woła `onDimmedChange(true)`. `wake()` ustawia false i restartuje
// odliczanie. Wydzielone z hooka, zeby przetestowac zachowanie (start/timeout/
// reset/cleanup) z fake timers bez renderera (vitest node env nie ma jsdom).
export function createIdleDimmerController(
  onDimmedChange: (isDimmed: boolean) => void,
  timeoutMs: number,
): IdleDimmerController {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function clear(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function schedule(): void {
    clear();
    timeoutId = setTimeout(() => onDimmedChange(true), timeoutMs);
  }

  function wake(): void {
    onDimmedChange(false);
    schedule();
  }

  function stop(): void {
    clear();
  }

  schedule();

  return { wake, stop };
}

// Auto-dim ekranu sesji: po `timeoutMs` bezczynnosci `isDimmed` -> true.
// `wake()` natychmiast rozjasnia i restartuje licznik (kolejne przygaszenie
// dopiero po pelnym `timeoutMs`). Logika timera w pure controllerze; hook to
// cienki wrapper trzymajacy `isDimmed` jako React state.
//
// Cleanup: controller.stop() (clearTimeout) w `useEffect` return — bez
// wyciekow / setState po unmount (coding-rules §13).
export function useIdleDimmer(timeoutMs: number = IDLE_DIM_MS): IdleDimmer {
  const [isDimmed, setIsDimmed] = useState(false);
  const [controller, setController] = useState<IdleDimmerController | null>(null);

  useEffect(() => {
    const ctrl = createIdleDimmerController(setIsDimmed, timeoutMs);
    setController(ctrl);
    return () => ctrl.stop();
  }, [timeoutMs]);

  return { isDimmed, wake: () => controller?.wake() };
}
