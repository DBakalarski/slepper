import { Minutes } from './types.js';
import type { AgeMonths, Hours } from './types.js';

export type WakeWindowsInput = {
  readonly totalSleep: Hours;
  readonly longestSleep: Hours;
  readonly napsToday: number;
  readonly ageMonths: AgeMonths;
};

const LAST_WINDOW_WEIGHT = 1.3;

export function deriveWakeWindows(input: WakeWindowsInput): Minutes[] {
  const naps = Math.max(0, input.napsToday);
  const totalAwakeMin = Math.max(0, (24 - input.totalSleep) * 60);

  const numWindows = naps + 1;
  const weights: number[] = [];
  for (let i = 0; i < naps; i++) weights.push(1.0);
  weights.push(LAST_WINDOW_WEIGHT);
  const weightSum = weights.reduce((s, w) => s + w, 0);

  const windows: Minutes[] = [];
  for (let i = 0; i < numWindows; i++) {
    windows.push(Minutes(totalAwakeMin * (weights[i]! / weightSum)));
  }
  return windows;
}
