import { addDays, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

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

// Minuty od polnocy (0..1439) w strefie aplikacji. TZ-safe — przez `format`
// na zoned date (NIE getHours na raw Date, ktory uzylby device tz).
export function minutesOfDayInAppTz(date: Date): number {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  const hours = Number(format(zoned, 'H'));
  const minutes = Number(format(zoned, 'm'));
  return hours * MIN_PER_HOUR + minutes;
}

// "9:30" z liczby minut od polnocy (0..1439). Czysta formatacja, bez tz.
export function formatClockMinutes(totalMinutes: number): string {
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / MIN_PER_HOUR);
  const minutes = wrapped % MIN_PER_HOUR;
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// "27.05.2026" w strefie aplikacji — krotka forma dla nagłowkow / pickerow.
export function formatDateShort(date: Date): string {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return format(zoned, 'dd.MM.yyyy');
}

// "27.05" (bez roku) — dla nagłowkow sekcji w grupowanej liscie historii.
export function formatDateNoYear(date: Date): string {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return format(zoned, 'dd.MM');
}

// Klucz dnia w app tz — "YYYY-MM-DD". Uzywane jako stabilny grouping key
// niezalezny od device tz (vs Date.toDateString ktore uzywa lokalnego tz).
export function dayKeyInAppTz(date: Date): string {
  return format(toZonedTime(date, APP_TIMEZONE), 'yyyy-MM-dd');
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
//
// Implementacja: format() zwraca date-string w app tz (np. "2026-05-27"),
// nastepnie fromZonedTime konwertuje "2026-05-27T00:00:00" w Europe/Warsaw na
// wlasciwy UTC instant. Dziala poprawnie niezaleznie od device tz.
export function startOfDayInAppTz(date: Date): Date {
  const dayKey = format(toZonedTime(date, APP_TIMEZONE), 'yyyy-MM-dd');
  return fromZonedTime(`${dayKey}T00:00:00`, APP_TIMEZONE);
}

// Koniec dnia w app tz = poczatek nastepnego dnia w app tz. Uzywaj addDays
// (nie `+ 24h`) zeby poprawnie obsluzyc DST (23/25h doby 2 razy/rok).
export function endOfDayInAppTz(date: Date): Date {
  return startOfDayInAppTz(addDays(date, 1));
}

// Parsuje string "YYYY-MM-DD" + "HH:MM" jako moment w app tz (Europe/Warsaw),
// nie w device tz. Zwraca null gdy format zly. Uzywane przez backdated modal.
export function parseAppTzDateTime(dateStr: string, timeStr: string): Date | null {
  const iso = `${dateStr}T${timeStr}:00`;
  const parsed = fromZonedTime(iso, APP_TIMEZONE);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

// Zwraca date-string YYYY-MM-DD reprezentujacy dzien w app tz dla zadanej daty.
// Uzywane do prefill backdated modal (dzisiejsza data w Warsaw, nie device tz).
export function todayDateInAppTz(now: Date = new Date()): string {
  return format(toZonedTime(now, APP_TIMEZONE), 'yyyy-MM-dd');
}

// Laczy dzien z `datePart` z godzina i minuta z `timePart` w jednym instant
// w strefie aplikacji. NIE uzywaj `setHours` na surowym Date — to operuje na
// device tz i daje zly wynik dla usera spoza Warsaw (patrz review-faza-3 P2-2).
//
// Implementacja: wycina dzien (YYYY-MM-DD) z `datePart` w app tz, wycina
// godzine (HH:mm) z `timePart` w app tz, sklada w ISO i konwertuje przez
// `fromZonedTime` na UTC instant. Pattern z `parseAppTzDateTime`.
export function combineDateAndTimeInAppTz(datePart: Date, timePart: Date): Date {
  const dayKey = format(toZonedTime(datePart, APP_TIMEZONE), 'yyyy-MM-dd');
  const timeKey = format(toZonedTime(timePart, APP_TIMEZONE), 'HH:mm');
  return fromZonedTime(`${dayKey}T${timeKey}:00`, APP_TIMEZONE);
}

// Przesuwa klucz dnia "YYYY-MM-DD" o `n` dni w strefie aplikacji.
// Uzywaj zamiast recznie dodawac ms do Date — addDays z date-fns poprawnie
// obsluguje DST (23/25h doby), a format w app tz daje stabilny string.
export function addDaysInAppTz(dayKey: string, n: number): string {
  const base = fromZonedTime(`${dayKey}T00:00:00`, APP_TIMEZONE);
  return format(toZonedTime(addDays(base, n), APP_TIMEZONE), 'yyyy-MM-dd');
}

// Tabela referencyjna okien aktywnosci wg wieku dziecka. Wartosci w minutach,
// uzywane do schedulowania powiadomienia "Drzemka za ~15min" (Faza 5).
// Zrodlo: typowe wartosci z poradnikow snu niemowlecego (np. Precious Little
// Sleep, baby sleep consultants). MVP — przyblizenie, do dostrojenia per dziecko
// pozniej.
//
// Granice wiekowe w pelnych miesiacach od daty urodzenia (1 miesiac = 30 dni
// dla uproszczenia, kalkulacji nie potrzebujemy z precyzja kalendarzowa).
const DAYS_PER_MONTH = 30;
const WAKE_WINDOW_0_3M_MIN = 75;
const WAKE_WINDOW_3_6M_MIN = 105;
const WAKE_WINDOW_6_9M_MIN = 150;
const WAKE_WINDOW_9_12M_MIN = 180;
const WAKE_WINDOW_12M_PLUS_MIN = 240;

export function targetWakeWindowMinutes(birthDate: Date, now: Date = new Date()): number {
  const ageMs = now.getTime() - birthDate.getTime();
  const ageDays = ageMs / (MS_PER_SECOND * SEC_PER_MINUTE * MIN_PER_HOUR * 24);
  const ageMonths = ageDays / DAYS_PER_MONTH;
  if (ageMonths < 3) return WAKE_WINDOW_0_3M_MIN;
  if (ageMonths < 6) return WAKE_WINDOW_3_6M_MIN;
  if (ageMonths < 9) return WAKE_WINDOW_6_9M_MIN;
  if (ageMonths < 12) return WAKE_WINDOW_9_12M_MIN;
  return WAKE_WINDOW_12M_PLUS_MIN;
}
