import { median } from './math/statistics.js';

export type NapDecision = {
  readonly naps: number;
  readonly transitionWarning: boolean;
};

// Minimum samples needed to trust transition detection. Below this we fall back
// to round(adapted) — 1-2 days of nap-count data give too much false-positive
// transition (e.g. user logged only nights → observed = [0], baseline = 2 →
// median−baseline = 2 but it's a logging gap, not a real schedule change).
const TRANSITION_MIN_SAMPLES = 3;

export function decideNapsToday(
  adaptedNaps: number,
  baselineNaps: number,
  observed7d: readonly number[],
): NapDecision {
  if (observed7d.length < TRANSITION_MIN_SAMPLES) {
    return { naps: Math.max(0, Math.round(adaptedNaps)), transitionWarning: false };
  }
  const med = median(observed7d);
  const baselineRounded = Math.round(baselineNaps);
  if (Math.abs(med - baselineRounded) >= 1) {
    return { naps: Math.max(0, Math.round(med)), transitionWarning: true };
  }
  return { naps: Math.max(0, Math.round(adaptedNaps)), transitionWarning: false };
}
