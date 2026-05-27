import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Strefa czasowa UI. Baza trzyma UTC; formatowanie zawsze przez ten tz.
export const APP_TIMEZONE = 'Europe/Warsaw';

const MS_PER_SECOND = 1000;
const SEC_PER_MINUTE = 60;
const MIN_PER_HOUR = 60;

interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

function splitDuration(ms: number): DurationParts {
  const safeMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safeMs / MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / (SEC_PER_MINUTE * MIN_PER_HOUR));
  const minutes = Math.floor((totalSeconds % (SEC_PER_MINUTE * MIN_PER_HOUR)) / SEC_PER_MINUTE);
  const seconds = totalSeconds % SEC_PER_MINUTE;
  return { hours, minutes, seconds };
}

// "1g 43m" / "43m" / "0m" — format dla agregatow i okien aktywnosci.
// Dla < 1 minuty pokazujemy "0m" (nie sekundy — to nie timer).
export function formatDuration(ms: number): string {
  const { hours, minutes } = splitDuration(ms);
  if (hours === 0) return `${minutes}m`;
  return `${hours}g ${minutes}m`;
}

// "HH:MM:SS" — timer biezacej sesji.
export function formatTimer(ms: number): string {
  const { hours, minutes, seconds } = splitDuration(ms);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

// "09:30" w strefie Europe/Warsaw.
export function formatTime(date: Date): string {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return format(zoned, 'HH:mm');
}

// "09:30 → 11:13" lub "09:30 → trwa" gdy end_at jest null.
export function formatRange(start: Date, end: Date | null): string {
  const left = formatTime(start);
  const right = end ? formatTime(end) : 'trwa';
  return `${left} → ${right}`;
}

// Polska deklinacja: 1 -> formy[0] (drzemka), 2-4 -> formy[1] (drzemki),
// 0/5+/12-14 -> formy[2] (drzemek). Specjalny przypadek: 1 dokladnie => [0],
// inaczej liczby konczace sie na 1 (np. 21, 31) tez [0] dla niektorych
// rzeczownikow — w PL liczebniki kolejne typu "21 drzemek" uzywaja formy
// dopelniacza, ale dla MVP idziemy z prostym wzorem ktory dziala dla 1-99.
export function pluralizePL(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  if (abs === 1) return forms[0];
  const lastTwo = abs % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return forms[2];
  const last = abs % 10;
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

// Wycina date do poczatku dnia (00:00) w strefie aplikacji.
// Uzywane do filtrowania sesji "dzisiaj" niezaleznie od UTC drift.
export function startOfDayInAppTz(date: Date): Date {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  zoned.setHours(0, 0, 0, 0);
  // toZonedTime daje Date z UTC reprezentujacy tamten moment w lokalnym tz.
  // setHours dzialal na tym lokalnym Date — wynik to start dnia w app tz.
  return zoned;
}
