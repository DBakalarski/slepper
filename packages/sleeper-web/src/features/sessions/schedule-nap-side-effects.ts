// Web PWA — no-op mock dla schedule-nap-side-effects.
//
// Push/local notifications wykluczone w scope PWA (patrz
// docs/plans/2026-06-05-001-feat-sleeper-web-pwa-plan.md sekcja "Granice scope'u").
// Eksporty zachowują signatures sleeper-app żeby skopiowany `hooks.ts`
// (useStartSession/useEndSession/useUpdateSession/useDeleteSession) resolve'ował
// bez modyfikacji importów.
//
// Sygnatury (params + return types) MUSZA byc identyczne z
// sleeper-app/src/features/sessions/schedule-nap-side-effects.ts. Jakakolwiek
// niezgodnosc wyjdzie jako blad TS gdy hooks.ts jest kopiowany 1:1.
//
// CELOWO bez importow z @/lib/notifications — to-be-no-op-anyway, a brak
// importu trzyma graf zaleznosci minimalny i ulatwia bundlerowi tree-shake.

// Schedule notyfikacja po zakonczeniu sesji LUB po update/delete ostatniej sesji.
// Web: no-op, ignorujemy oba argumenty (są w sygnaturze dla parity z sleeper-app).
export async function rescheduleNapNotification(
  _childId: string,
  _lastSleepEndAt: Date | null,
): Promise<void> {
  // no-op
}

// Anuluj notyfikacje po starcie sesji. Web: no-op.
export async function cancelNapNotificationSafe(_childId: string): Promise<void> {
  // no-op
}

// Po mutacji ktora mogla zmienic ktora sesja jest "ostatnia zakonczona" —
// rescheduluj notyfikacje. Web: no-op.
export async function rescheduleFromLastEnded(_childId: string): Promise<void> {
  // no-op
}
