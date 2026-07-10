import type { SleepSession } from '@/features/sessions/hooks';

// Rekomendacja moze zwrocic `nextSleepAt: null` w dwoch rozlacznych sytuacjach:
// 1. Sen nocny w toku, pobudka juz za nami (dziecko spi na noc) — kaskada
//    kotwicy z silnika swiadomie zwraca pusty lancuch (global-constraints:
//    "plan jest pusty i nextSleepAt === null — to POPRAWNE, dziecko spi na
//    noc").
// 2. Prawdziwy cold start — brak historii i brak preferred_wake_time, algorytm
//    nie ma z czego wyznaczyc kotwicy.
// Karta musi rozroznic te dwa stany, zeby nie pokazywac mylacego "Brak
// kotwicy" gdy dziecko po prostu spi (review Taska 5).
export function hasActiveNightSession(sessions: readonly SleepSession[]): boolean {
  return sessions.some((s) => s.type === 'night_sleep' && s.end_at === null);
}

// Sygnal "czy pobudka 07:00 jest defaultem silnika" — tani do wyprowadzenia
// bez zmiany kontraktu Recommendation: silnik uzywa defaultu 7:00 wylacznie
// gdy brak preferred_wake_time ORAZ brak zakonczonej dzis sesji nocnej
// (patrz sleeper-machine-kotki/src/recommender.ts#findRealMorningWake —
// realny koniec nocy z dzis rano ma zawsze priorytet nad targetWakeTime/default).
export function hasCompletedNightSessionToday(sessions: readonly SleepSession[]): boolean {
  return sessions.some((s) => s.type === 'night_sleep' && s.end_at !== null);
}

// Tekst zastepujacy "Nastepny sen" gdy `nextSleepAt === null`.
export function nextSleepEmptyCopy(sessions: readonly SleepSession[]): string {
  return hasActiveNightSession(sessions)
    ? 'Dziecko śpi (sen nocny) — plan pojawi się po zakończeniu snu.'
    : 'Brak kotwicy — dodaj sesję snu nocnego lub ustaw godzinę pobudki.';
}
