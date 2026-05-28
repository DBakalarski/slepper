import { Check, Moon, Smartphone, Sun, type LucideIcon } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEffectiveTheme } from '@/features/settings/ThemeProvider';
import { useThemeStore, type ThemeMode } from '@/features/settings/useThemeStore';
import { COLORS } from '@/lib/colors';

// Tri-state bottom sheet do wyboru trybu motywu (System / Light / Dark).
// Decyzja Fazy 0: tri-state (nie binary toggle) — iOS-idiomatic, jasne ze
// "system" to opcja a nie default ukryty. Implementacja: RN `Modal` z
// `transparent` + `animationType="slide"` — KISS, bez nowych zaleznosci
// (`@gorhom/bottom-sheet` nie jest w projekcie, instalacja wymagalaby
// zatwierdzenia §8 a YAGNI dla pojedynczego sheeta).

interface ThemeModeBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface ModeOption {
  mode: ThemeMode;
  label: string;
  icon: LucideIcon;
}

const OPTIONS: readonly ModeOption[] = [
  { mode: 'system', label: 'Zgodnie z systemem', icon: Smartphone },
  { mode: 'light', label: 'Jasny', icon: Sun },
  { mode: 'dark', label: 'Ciemny', icon: Moon },
];

export function ThemeModeBottomSheet({ visible, onClose }: ThemeModeBottomSheetProps) {
  const currentMode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const effectiveTheme = useEffectiveTheme();
  const isDark = effectiveTheme === 'dark';

  function handleSelect(mode: ThemeMode) {
    setMode(mode);
    onClose();
  }

  // Kolor ikon (lucide nie czyta className cross-platform — pattern z Fazy 2).
  const iconColor = isDark ? COLORS.cream : COLORS.navy;
  const checkColor = isDark ? COLORS.cream : COLORS.navy;
  const mutedIconColor = isDark ? COLORS.purpleLight : COLORS.textMuted;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      {/* Backdrop — tap zamyka sheet. accessibilityLabel dla VoiceOver. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zamknij wybor motywu"
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end">
        {/* Stop-propagation: tap na sam sheet NIE powinien zamykac modala.
            accessible={false} — VoiceOver/TalkBack nie ogloszaja sztucznego
            "przycisku", uzytkownik widzi i czyta same opcje motywu (P3 Fazy 6). */}
        <Pressable accessible={false} onPress={() => {}}>
          <SafeAreaView edges={['bottom']} className="bg-cream dark:bg-dark-card rounded-t-card">
            <View className="px-6 pt-5 pb-3">
              <Text className="text-base font-semibold text-navy dark:text-cream">
                Tryb ciemny
              </Text>
              <Text className="mt-1 text-xs text-text-muted dark:text-cream/60">
                Wybierz tryb wyswietlania aplikacji
              </Text>
            </View>
            <View className="px-3 pb-2">
              {OPTIONS.map((opt) => {
                const isActive = opt.mode === currentMode;
                const Icon = opt.icon;
                return (
                  <Pressable
                    key={opt.mode}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: isActive }}
                    onPress={() => handleSelect(opt.mode)}
                    className="flex-row items-center px-3 py-4 rounded-card active:bg-white/40 dark:active:bg-dark-surface/60">
                    <View className="w-9 h-9 items-center justify-center rounded-pill bg-white dark:bg-dark-surface">
                      <Icon size={20} color={isActive ? iconColor : mutedIconColor} />
                    </View>
                    <Text className="ml-3 flex-1 text-base text-navy dark:text-cream">
                      {opt.label}
                    </Text>
                    {isActive ? <Check size={20} color={checkColor} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
