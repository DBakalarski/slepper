// Domyslny czas przytrzymania (~1 s) wymagany do potwierdzenia akcji (R4).
export const HOLD_MS = 1_000;

export interface HoldController {
  // Rozpoczyna odliczanie. Po `holdMs` woła `onConfirm`. No-op gdy juz trwa.
  start: () => void;
  // Anuluje odliczanie przed czasem (puszczenie / disabled). Nie woła onConfirm.
  cancel: () => void;
  // True dopoki trwa odliczanie (do sterowania animacja progresu w komponencie).
  isHolding: () => boolean;
}

// Pure controller logiki hold-tap: jeden setTimeout, ktory po `holdMs` woła
// `onConfirm`. `cancel()` przed czasem czysci timeout (puszczenie anuluje).
// Wydzielone z komponentu (.ts, bez RN/reanimated), zeby przetestowac
// zachowanie (quick-tap / pelne przytrzymanie / cancel / cleanup) z fake timers
// w vitest node env bez renderera. Spojne z `createIdleDimmerController`.
export function createHoldController(onConfirm: () => void, holdMs: number): HoldController {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function start(): void {
    if (timeoutId !== null) return;
    timeoutId = setTimeout(() => {
      timeoutId = null;
      onConfirm();
    }, holdMs);
  }

  function isHolding(): boolean {
    return timeoutId !== null;
  }

  return { start, cancel, isHolding };
}
