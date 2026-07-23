import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Read-only popup z pelna trescia notatki sesji.
// Wzorzec modala: NotificationsBottomSheet / ThemeModeBottomSheet (RN Modal
// transparent + slide, backdrop-close, stop-propagation; bez nowych zaleznosci).
// Edycja notatki nadal przez wejscie w sesje — ten popup jest tylko do odczytu.

interface SessionNotePopupProps {
  visible: boolean;
  onClose: () => void;
  // Pelna tresc notatki (juz zwalidowana jako niepusta przez callera).
  note: string;
  // Kontekst — ktorej sesji dotyczy notatka (np. "Sen nocny · 20:10 — trwa").
  headerLabel: string;
}

export function SessionNotePopup({
  visible,
  onClose,
  note,
  headerLabel,
}: SessionNotePopupProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zamknij notatke"
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end">
        <Pressable accessible={false} onPress={() => {}}>
          <SafeAreaView
            edges={['bottom']}
            className="bg-cream dark:bg-dark-card rounded-t-card">
            <View className="px-6 pt-5 pb-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-cream/60">
                Notatka
              </Text>
              <Text className="mt-1 text-base font-semibold text-navy dark:text-cream">
                {headerLabel}
              </Text>
            </View>
            <ScrollView
              className="max-h-80 px-6 pb-6 pt-2"
              contentContainerClassName="pb-2">
              <Text className="text-base leading-relaxed text-navy dark:text-cream">
                {note}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
