import { Modal, Pressable, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEAD_OPTIONS, usePushSettings } from './usePushSettings';

// Sheet ustawien powiadomien push (toggle per urzadzenie + wyprzedzenie).
// Wzorzec modala: ThemeModeBottomSheet (RN Modal transparent + slide,
// backdrop-close, stop-propagation; bez nowych zaleznosci).

interface NotificationsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsBottomSheet({
  visible,
  onClose,
}: NotificationsBottomSheetProps) {
  const settings = usePushSettings();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zamknij ustawienia powiadomien"
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end">
        <Pressable accessible={false} onPress={() => {}}>
          <SafeAreaView
            edges={['bottom']}
            className="bg-cream dark:bg-dark-card rounded-t-card">
            <View className="px-6 pt-5 pb-3">
              <Text className="text-base font-semibold text-navy dark:text-cream">
                Przypomnienia
              </Text>
              <Text className="mt-1 text-xs text-text-muted dark:text-cream/60">
                Push przed rekomendowanym snem — na tym urzadzeniu
              </Text>
            </View>

            {settings.support === 'needs-install' ? (
              <Text className="px-6 pb-6 text-sm text-text-muted dark:text-cream/60">
                Zainstaluj aplikacje na ekranie glownym (Udostepnij → Do ekranu
                poczatkowego), aby wlaczyc powiadomienia.
              </Text>
            ) : settings.support === 'unsupported' ? (
              <Text className="px-6 pb-6 text-sm text-text-muted dark:text-cream/60">
                Ta przegladarka nie wspiera powiadomien push.
              </Text>
            ) : (
              <View className="px-6 pb-6 gap-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-navy dark:text-cream">
                    Przypomnienie o snie
                  </Text>
                  <Switch
                    accessibilityLabel="Przypomnienie o snie"
                    value={settings.isEnabled}
                    disabled={settings.isLoading}
                    onValueChange={(value) =>
                      value ? settings.enable() : settings.disable()
                    }
                  />
                </View>

                {settings.permissionDenied ? (
                  <Text className="text-xs text-orange">
                    Brak zgody na powiadomienia. Wlacz je w Ustawienia iOS →
                    Powiadomienia → Sleeper i sprobuj ponownie.
                  </Text>
                ) : null}

                {settings.isEnabled ? (
                  <View className="gap-2">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Wyprzedzenie
                    </Text>
                    <View className="flex-row gap-2">
                      {LEAD_OPTIONS.map((minutes) => {
                        const isActive = minutes === settings.leadMinutes;
                        return (
                          <Pressable
                            key={minutes}
                            accessibilityRole="button"
                            accessibilityLabel={`${minutes} minut przed`}
                            accessibilityState={{ selected: isActive }}
                            onPress={() => settings.setLeadMinutes(minutes)}
                            className={`px-3 py-2 rounded-pill ${
                              isActive
                                ? 'bg-navy dark:bg-cream'
                                : 'bg-white dark:bg-dark-surface'
                            }`}>
                            <Text
                              className={`text-sm font-semibold ${
                                isActive
                                  ? 'text-cream dark:text-navy'
                                  : 'text-navy dark:text-cream'
                              }`}>
                              {minutes} min
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
