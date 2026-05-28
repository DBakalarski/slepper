import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { APP_TIMEZONE } from '@/lib/time';

// Helper formatujacy wiek dziecka + date urodzenia w polskim formacie dla
// karty Profil. Reguly:
//   < 12 tygodni  -> "X tygodni" (z polska deklinacja)
//   < 24 miesiace -> "X miesiecy" / "miesiac" / "miesiace"
//   >= 24 miesiace -> "X lat" / "rok" / "lata"
// Data urodzenia: "DD MMM YYYY" gdzie MMM = polski skrocony miesiac
// ("sty", "lut", "mar", ..., "gru").
//
// TZ-safe: parsujemy `birthDate` przez `toZonedTime` w app tz (Europe/Warsaw),
// liczymy wiek na bazie UTC ms (rozne nie odzwierciedlaja DST — kazda doba ma
// 24h jako jednostka miary, "ile minelo od urodzenia"). NIE uzywamy
// `setHours`/`getDate` na surowym Date (lamie sie dla usera w innej tz).

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;
const WEEKS_THRESHOLD = 12;
const MONTHS_THRESHOLD = 24;

const PL_MONTHS_SHORT: readonly string[] = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paz', 'lis', 'gru',
];

function parseBirthDate(birthDate: Date | string): Date {
  if (birthDate instanceof Date) return birthDate;
  // ISO 'YYYY-MM-DD' lub pelny ISO — `new Date` parsuje oba poprawnie.
  return new Date(birthDate);
}

// Polski liczebnik dla "tygodni": 1 -> "tydzien", 2-4 -> "tygodnie",
// 0/5+/12-14 -> "tygodni". Zgodne z `pluralizePL` w lib/time.ts ale lokalne
// (nie ciagniemy depencji posrednio).
function weeksLabel(n: number): string {
  const abs = Math.abs(n);
  if (abs === 1) return 'tydzien';
  const lastTwo = abs % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return 'tygodni';
  const last = abs % 10;
  if (last >= 2 && last <= 4) return 'tygodnie';
  return 'tygodni';
}

function monthsLabel(n: number): string {
  const abs = Math.abs(n);
  if (abs === 1) return 'miesiac';
  const lastTwo = abs % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return 'miesiecy';
  const last = abs % 10;
  if (last >= 2 && last <= 4) return 'miesiace';
  return 'miesiecy';
}

function yearsLabel(n: number): string {
  const abs = Math.abs(n);
  if (abs === 1) return 'rok';
  const lastTwo = abs % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return 'lat';
  const last = abs % 10;
  if (last >= 2 && last <= 4) return 'lata';
  return 'lat';
}

function formatAgePart(birth: Date, now: Date): string {
  const diffMs = now.getTime() - birth.getTime();
  const safeMs = Math.max(0, diffMs);
  const days = Math.floor(safeMs / MS_PER_DAY);
  const weeks = Math.floor(days / DAYS_PER_WEEK);
  const months = Math.floor(days / DAYS_PER_MONTH);

  if (weeks < WEEKS_THRESHOLD) {
    // Nowo narodzone: tygodnie (bardziej zrozumiale niz "0 miesiecy").
    return `${weeks} ${weeksLabel(weeks)}`;
  }
  if (months < MONTHS_THRESHOLD) {
    return `${months} ${monthsLabel(months)}`;
  }
  const years = Math.floor(months / MONTHS_PER_YEAR);
  return `${years} ${yearsLabel(years)}`;
}

function formatBirthDate(birth: Date): string {
  // Format w app tz — uzytkownik widzi date w Warsaw bez wzgledu na device tz.
  // Po `toZonedTime` data jest juz "wyciagnieta" do strefy aplikacji — uzywamy
  // `format` z date-fns (zwykly, bez timeZone opcji — pattern z lib/time.ts).
  const zoned = toZonedTime(birth, APP_TIMEZONE);
  const day = format(zoned, 'd');
  const monthIndex = Number(format(zoned, 'M')) - 1;
  const year = format(zoned, 'yyyy');
  const monthShort = PL_MONTHS_SHORT[monthIndex] ?? '';
  return `${day} ${monthShort}. ${year}`;
}

// "21 miesiecy · ur. 12 sie. 2024" dla 21-miesiecznego dziecka.
// `now` opcjonalny — domyslnie biezacy moment (pure, latwo testowac).
export function formatChildAge(birthDate: Date | string, now: Date = new Date()): string {
  const birth = parseBirthDate(birthDate);
  return `${formatAgePart(birth, now)} · ur. ${formatBirthDate(birth)}`;
}
