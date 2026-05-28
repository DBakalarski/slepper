export type Minutes = number & { readonly __brand: 'Minutes' };
export type Hours = number & { readonly __brand: 'Hours' };
export type AgeMonths = number & { readonly __brand: 'AgeMonths' };
export type AgeYears = number & { readonly __brand: 'AgeYears' };

export const Minutes = (n: number): Minutes => n as Minutes;
export const Hours = (n: number): Hours => n as Hours;
export const AgeMonths = (n: number): AgeMonths => n as AgeMonths;
export const AgeYears = (n: number): AgeYears => n as AgeYears;

export const minutesToHours = (m: Minutes): Hours => Hours(m / 60);
export const hoursToMinutes = (h: Hours): Minutes => Minutes(h * 60);
export const monthsToYears = (m: AgeMonths): AgeYears => AgeYears(m / 12);

export type DateTime = Date;

export type TimeOfDay = {
  readonly hour: number;
  readonly minute: number;
};

export type SleepType = 'NIGHT' | 'NAP';

export type SleepSession = {
  readonly start: DateTime;
  readonly end: DateTime;
  readonly type: SleepType;
};

export type ChildProfile = {
  readonly dateOfBirth: Date;
  readonly targetWakeTime?: TimeOfDay;
};

export type State = {
  readonly now: DateTime;
  readonly history: readonly SleepSession[];
};

export type Confidence = 'low' | 'medium' | 'high';

export type PlanEntry = {
  readonly plannedStart: DateTime;
  readonly plannedEnd?: DateTime;
  readonly type: SleepType;
};

export type Recommendation = {
  readonly nextSleepAt: DateTime | null;
  readonly currentWakeWindowDuration: Minutes;
  readonly remainingNapsToday: readonly PlanEntry[];
  readonly confidence: Confidence;
  readonly warnings: readonly string[];
};
