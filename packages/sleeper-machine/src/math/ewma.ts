export function ewmaWeighted(
  values: readonly number[],
  daysAgo: readonly number[],
  lambda = 0.85,
): number {
  if (values.length === 0) {
    throw new Error('ewmaWeighted: empty values array');
  }
  if (values.length !== daysAgo.length) {
    throw new Error(
      `ewmaWeighted: length mismatch (values=${values.length}, daysAgo=${daysAgo.length})`,
    );
  }
  if (lambda <= 0 || lambda > 1) {
    throw new Error(`ewmaWeighted: lambda must be in (0, 1], got ${lambda}`);
  }
  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i++) {
    const d = daysAgo[i]!;
    if (d < 0) {
      throw new Error(`ewmaWeighted: daysAgo must be ≥ 0, got ${d} at index ${i}`);
    }
    const weight = Math.pow(lambda, d);
    weightedSum += values[i]! * weight;
    weightSum += weight;
  }
  return weightedSum / weightSum;
}
