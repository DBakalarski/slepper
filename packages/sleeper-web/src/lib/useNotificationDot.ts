// Mock hook: status kropki notyfikacji obok ikony bell w HomeHeader.
// Decyzja Fazy 0: mock=true (matchuje screen #1, no `expo-notifications` flow
// w tej rundzie). Realne podpiecie pod expo-notifications dojdzie poza scope'em
// redesignu (osobne zadanie).
export function useNotificationDot(): boolean {
  return true;
}
