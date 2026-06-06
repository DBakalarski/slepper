#!/usr/bin/env bash
# Invariant test: web mock files NIE moga importowac expo-notifications.
# Powod: expo-notifications nie dziala na web (native-only); web ma no-op mock
# w lib/notifications.ts i schedule-nap-side-effects.ts. Regresja = zlamanie
# webu w runtime (Metro nie znajduje native modulu).
# (Faza 1 P3 — invariant check przed Faza 4 deploy.)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"

FILES=(
  "$SRC_DIR/lib/notifications.ts"
  "$SRC_DIR/features/sessions/schedule-nap-side-effects.ts"
)

FAILED=0
for FILE in "${FILES[@]}"; do
  if [[ ! -f "$FILE" ]]; then
    echo "FAIL: missing file $FILE"
    FAILED=1
    continue
  fi
  if grep -q "expo-notifications" "$FILE"; then
    echo "FAIL: $FILE imports expo-notifications (web mock should be no-op)"
    FAILED=1
  else
    echo "OK: $FILE — no expo-notifications import"
  fi
done

if [[ $FAILED -eq 1 ]]; then
  exit 1
fi

echo "All web-mock invariants pass."
