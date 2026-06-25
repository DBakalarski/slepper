import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHoldController, HOLD_MS } from '../hold-controller';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_SRC = readFileSync(
  path.resolve(__dirname, '../HoldToConfirmButton.tsx'),
  'utf-8',
);
const CONTROLLER_SRC = readFileSync(
  path.resolve(__dirname, '../hold-controller.ts'),
  'utf-8',
);

describe('createHoldController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('szybki press (start -> cancel < holdMs) NIE woła onConfirm', () => {
    const onConfirm = vi.fn();
    const ctrl = createHoldController(onConfirm, HOLD_MS);

    ctrl.start();
    vi.advanceTimersByTime(HOLD_MS - 1);
    ctrl.cancel();

    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('pelne przytrzymanie (uplyw holdMs) woła onConfirm raz', () => {
    const onConfirm = vi.fn();
    const ctrl = createHoldController(onConfirm, HOLD_MS);

    ctrl.start();
    expect(onConfirm).not.toHaveBeenCalled();

    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(onConfirm).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancel czysci timeout i resetuje stan (kolejny start liczy od zera)', () => {
    const onConfirm = vi.fn();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const ctrl = createHoldController(onConfirm, HOLD_MS);

    ctrl.start();
    expect(ctrl.isHolding()).toBe(true);

    ctrl.cancel();
    expect(clearSpy).toHaveBeenCalled();
    expect(ctrl.isHolding()).toBe(false);

    // Po cancel licznik nie dochodzi do konca.
    vi.advanceTimersByTime(HOLD_MS);
    expect(onConfirm).not.toHaveBeenCalled();

    // Kolejny start liczy pelny holdMs od nowa.
    ctrl.start();
    vi.advanceTimersByTime(HOLD_MS);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('podwojny start bez cancel nie dubluje odliczania (onConfirm raz)', () => {
    const onConfirm = vi.fn();
    const ctrl = createHoldController(onConfirm, HOLD_MS);

    ctrl.start();
    ctrl.start();

    vi.advanceTimersByTime(HOLD_MS);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('HoldToConfirmButton static invariants', () => {
  it('eksponuje stala HOLD_MS rowna 1 s (zero magic numbers)', () => {
    expect(HOLD_MS).toBe(1_000);
    expect(CONTROLLER_SRC).toMatch(/HOLD_MS\s*=\s*1_000/);
  });

  it('disabled nie startuje odliczania (early return w handlePressIn)', () => {
    expect(COMPONENT_SRC).toMatch(/function handlePressIn[\s\S]*?if \(disabled\) return;/);
  });

  it('onPressOut anuluje i resetuje fill (cancel + resetFill)', () => {
    expect(COMPONENT_SRC).toMatch(/onPressOut=\{handlePressOut\}/);
    expect(COMPONENT_SRC).toMatch(/function handlePressOut[\s\S]*?cancel\(\)/);
    expect(COMPONENT_SRC).toMatch(/function handlePressOut[\s\S]*?resetFill\(\)/);
  });

  it('sprzata timeout w useEffect return (controller.cancel)', () => {
    expect(COMPONENT_SRC).toMatch(/return\s*\(\)\s*=>\s*controller\.cancel\(\)/);
    expect(CONTROLLER_SRC).toMatch(/clearTimeout\(/);
  });

  it('uzywa Animated z react-native (nie reanimated) dla deterministycznego cancel', () => {
    expect(COMPONENT_SRC).toMatch(/from 'react-native'/);
    expect(COMPONENT_SRC).not.toMatch(/react-native-reanimated/);
    expect(COMPONENT_SRC).toMatch(/\.stopAnimation\(\)/);
  });

  it('a11y: accessibilityRole button + state disabled/busy', () => {
    expect(COMPONENT_SRC).toMatch(/accessibilityRole="button"/);
    expect(COMPONENT_SRC).toMatch(/accessibilityState=\{\{ disabled, busy: disabled \}\}/);
  });
});
