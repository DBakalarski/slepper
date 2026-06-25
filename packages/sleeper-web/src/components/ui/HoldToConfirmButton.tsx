import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { createHoldController, HOLD_MS, type HoldController } from './hold-controller';

interface HoldToConfirmButtonProps {
  // Wolane raz po pelnym przytrzymaniu (holdMs). Puszczenie wczesniej anuluje.
  onConfirm: () => void;
  // Etykieta w stanie spoczynku (np. "Zakoncz sen").
  label: string;
  // Etykieta gdy `disabled` (np. "Zapisuje..."). Default: `label`.
  holdingLabel?: string;
  // Blokuje odliczanie i animacje (np. trwajaca mutacja). Default: false.
  disabled?: boolean;
  // Czas przytrzymania w ms. Default: HOLD_MS (1000).
  holdMs?: number;
}

// CTA wymagajacy przytrzymania ~1 s (R4): chroni przed przypadkowym
// zakonczeniem sesji po ciemku. `onPressIn` startuje liniowy fill tla +
// odliczanie; `onPressOut` (lub `disabled`) anuluje i natychmiast resetuje fill
// do zera. Dotarcie do konca woła `onConfirm`.
//
// Logika timera w pure `createHoldController` (testowalna fake timers). Fill
// uzywa `Animated` z react-native (NIE reanimated) — `Animated.timing(...).stop()`
// daje natychmiastowy, deterministyczny reset przy cancel mid-animation na
// react-native-web (reanimated `withTiming` cancel jest mniej przewidywalny).
export function HoldToConfirmButton({
  onConfirm,
  label,
  holdingLabel,
  disabled = false,
  holdMs = HOLD_MS,
}: HoldToConfirmButtonProps): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;
  const controllerRef = useRef<HoldController | null>(null);

  useEffect(() => {
    const controller = createHoldController(onConfirm, holdMs);
    controllerRef.current = controller;
    return () => controller.cancel();
  }, [onConfirm, holdMs]);

  function resetFill(): void {
    progress.stopAnimation();
    progress.setValue(0);
  }

  function handlePressIn(): void {
    if (disabled) return;
    controllerRef.current?.start();
    Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      useNativeDriver: false,
    }).start();
  }

  function handlePressOut(): void {
    controllerRef.current?.cancel();
    resetFill();
  }

  const widthPct = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} — przytrzymaj aby potwierdzic`}
      accessibilityState={{ disabled, busy: disabled }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      className={`relative items-center justify-center overflow-hidden rounded-2xl px-6 py-5 ${
        disabled ? 'bg-orange/50' : 'bg-orange'
      }`}>
      <Animated.View
        pointerEvents="none"
        style={{ width: widthPct }}
        className="absolute inset-y-0 left-0 bg-black/25"
      />
      <View pointerEvents="none">
        <Text className="text-lg font-semibold text-cream">
          {disabled ? (holdingLabel ?? label) : label}
        </Text>
      </View>
    </Pressable>
  );
}
