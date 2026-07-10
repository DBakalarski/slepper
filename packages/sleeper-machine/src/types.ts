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
  // Twardy override liczby drzemek na dzien (0-5, integer). Gdy podane,
  // recommend() pomija baseline wieku + adaptacje historii i uzywa tej wartosci.
  readonly preferredNapsCount?: number;
  // Twardy override godziny rozpoczecia nocnego snu. Gdy podane i wszystkie
  // drzemki dnia sa zrobione, nextSleepAt = dzis o tej godzinie.
  readonly preferredBedtime?: TimeOfDay;
};

// Sesja snu w toku (brak `end` — jeszcze nie zakończona). Używana przez Kotki Dwa
// do re-kotwiczenia łańcucha planu (patrz `sleeper-machine-kotki/src/chain.ts`).
// OPCJONALNE, non-breaking — Galland (`recommend()`) to pole ignoruje.
export type ActiveSleepSession = {
  readonly start: DateTime;
  readonly type: SleepType;
};

export type State = {
  readonly now: DateTime;
  readonly history: readonly SleepSession[];
  readonly activeSession?: ActiveSleepSession;
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
  // Kotki Dwa: re-kotwiczony łańcuch pozostałego planu na dziś; po clampie
  // pierwszego wpisu do `now` późne wpisy mogą przekraczać północ — UI
  // przycina je do końca doby.
  readonly remainingNapsToday: readonly PlanEntry[];
  // Przesunięcie najbliższego snu względem idealnego planu, w minutach ze znakiem:
  // dodatnie = wcześniej niż plan (np. krótsza drzemka), ujemne = później.
  // `null` gdy nieobliczalne lub algorytm tego nie wspiera (Galland zawsze null —
  // nie ma stałego planu-baseline; pojęcie dotyczy wyłącznie Kotki Dwa).
  readonly nextSleepShiftMinutes: number | null;
  readonly confidence: Confidence;
  readonly warnings: readonly string[];
};
