import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createIdleDimmerController, IDLE_DIM_MS } from '../useIdleDimmer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(path.resolve(__dirname, '../useIdleDimmer.ts'), 'utf-8');

describe('createIdleDimmerController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('przygasza dopiero po uplywie timeoutMs', () => {
    const onChange = vi.fn();
    createIdleDimmerController(onChange, IDLE_DIM_MS);

    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(IDLE_DIM_MS - 1);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('wake() rozjasnia i restartuje licznik (kolejne przygaszenie po pelnym timeoutMs)', () => {
    const onChange = vi.fn();
    const ctrl = createIdleDimmerController(onChange, IDLE_DIM_MS);

    vi.advanceTimersByTime(IDLE_DIM_MS);
    expect(onChange).toHaveBeenLastCalledWith(true);

    ctrl.wake();
    expect(onChange).toHaveBeenLastCalledWith(false);

    // Po wake licznik wystartowal od zera — niepelny czas nie przygasza.
    vi.advanceTimersByTime(IDLE_DIM_MS - 1);
    expect(onChange).toHaveBeenLastCalledWith(false);

    // Dopiero pelny timeoutMs od wake() przygasza ponownie.
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('stop() czysci timeout — brak przygaszenia po zatrzymaniu', () => {
    const onChange = vi.fn();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const ctrl = createIdleDimmerController(onChange, IDLE_DIM_MS);

    ctrl.stop();
    expect(clearSpy).toHaveBeenCalled();

    vi.advanceTimersByTime(IDLE_DIM_MS * 2);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('useIdleDimmer static invariants', () => {
  it('eksponuje stala IDLE_DIM_MS rowna 20 s (zero magic numbers)', () => {
    expect(IDLE_DIM_MS).toBe(20_000);
    expect(SRC).toMatch(/IDLE_DIM_MS\s*=\s*20_000/);
  });

  it('sprzata timeout w useEffect return (controller.stop / clearTimeout)', () => {
    expect(SRC).toMatch(/return\s*\(\)\s*=>\s*ctrl\.stop\(\)/);
    expect(SRC).toMatch(/clearTimeout\(/);
  });

  it('nie uzywa native-only API', () => {
    expect(SRC).not.toMatch(/Alert\.alert/);
    expect(SRC).not.toMatch(/expo-notifications/);
  });
});
