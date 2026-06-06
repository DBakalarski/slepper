// Web PWA — no-op mock dla notifications.
// Push/local notifications wykluczone w scope PWA (patrz docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md
// sekcja "Granice scope'u"). Eksporty zachowują signatures sleeper-app żeby
// skopiowane kod importujący lib/notifications resolve'ował bez modyfikacji.
//
// Sygnatury (params + return types) MUSZA byc identyczne z sleeper-app/src/lib/notifications.ts.
// Jakakolwiek niezgodnosc wyjdzie jako blad TS w IU5 gdy hooks.ts/features sa kopiowane.

export function configureNotificationHandler(): void {
  // no-op (web PWA — brak local notifications w MVP)
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

// Prosi o uprawnienia. W web PWA zwracamy 'denied' bez sideeffectu — zaden
// kod produkcyjny w IU5+ nie powinien wolac tego helpera (kontroler scope-u
// decyduje czy w ogole renderowac UI sterujacy notyfikacjami).
export async function requestPermissions(): Promise<PermissionStatus> {
  return 'denied';
}

// Anuluje zaplanowana notyfikacje dla dziecka. No-op w web (nic nie jest
// zaplanowane — i tak Promise<void> dla zgodnosci API).
export async function cancelNapNotification(_childId: string): Promise<void> {
  // no-op
}

interface ScheduleNapNotificationInput {
  childId: string;
  childName: string;
  birthDate: Date;
  lastSleepEndAt: Date;
}

// Planuje notyfikacje "Drzemka za ~15min". W web PWA zwracamy null (jak
// implementacja mobile gdy target juz minal) bez planowania niczego.
export async function scheduleNapNotification(
  _input: ScheduleNapNotificationInput,
): Promise<string | null> {
  return null;
}
