import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { targetWakeWindowMinutes } from '@/lib/time';

// Faza 5: lokalne powiadomienia "Drzemka za ~15 min".
//
// Architektura:
// - Tylko lokalne notyfikacje (scheduled). Brak push, brak server-side.
// - 1 notyfikacja per dziecko, ID persistowane w AsyncStorage pod kluczem
//   `nap-notif-${childId}`. Przed planowaniem nowej anulujemy poprzednia.
// - Permission request: idempotentny, mozna wolac wielokrotnie. iOS pokazuje
//   prompt tylko za pierwszym razem; pozniej zwraca aktualny status.
// - Czas: planujemy na `endAt + targetWakeWindow - 15 min`. Jesli wynik jest
//   w przeszlosci (np. user dawno skonczyl sesje), nie planujemy.

const NOTIF_LEAD_TIME_MIN = 15;
const STORAGE_KEY_PREFIX = 'nap-notif-';

function storageKey(childId: string): string {
  return `${STORAGE_KEY_PREFIX}${childId}`;
}

// Konfiguracja jak system obsluguje notyfikacje gdy app w foreground.
// Dla MVP: pokazujemy banner + dzwiek nawet gdy app otwarta.
// Wolac RAZ przy starcie app (z root layoutu).
let handlerConfigured = false;

export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: () => {
      // SDK 54: ten callback musi byc sync i zwracac obiekt z 4 polami.
      return Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      });
    },
  });
  handlerConfigured = true;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

// Prosi o uprawnienia. Idempotentne — przy kolejnych wywolaniach zwraca
// aktualny status bez ponownego promptu (zgodnie z iOS/Android semantyka).
//
// Android: od API 33 wymaga POST_NOTIFICATIONS runtime permission, expo-
// notifications obsluguje to przez requestPermissionsAsync.
export async function requestPermissions(): Promise<PermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (!current.canAskAgain) {
    // User wczesniej odmowil "Don't ask again" — system nie pokaze promptu.
    return current.status === 'denied' ? 'denied' : 'undetermined';
  }
  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  if (result.status === 'granted') {
    // Android: setup default channel (wymagane od API 26). iOS ignoruje.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Drzemki',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
    return 'granted';
  }
  return result.status === 'denied' ? 'denied' : 'undetermined';
}

// Anuluje zaplanowana notyfikacje dla dziecka (jesli byla). Bezpieczne wolac
// gdy nic nie bylo zaplanowane — getItem zwroci null.
export async function cancelNapNotification(childId: string): Promise<void> {
  const id = await AsyncStorage.getItem(storageKey(childId));
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Notyfikacja mogla zostac usunieta przez system (np. po triggerze).
      // Cichy fallback — i tak czyscimy storage.
    }
    await AsyncStorage.removeItem(storageKey(childId));
  }
}

interface ScheduleNapNotificationInput {
  childId: string;
  childName: string;
  birthDate: Date;
  lastSleepEndAt: Date;
}

// Planuje notyfikacje "Drzemka za ~15min". Wymaga aby permissions byly
// granted (caller sprawdza). Sam zarzadza poprzednia notyfikacja —
// anuluje przed zaplanowaniem nowej.
//
// Zwraca scheduled notification ID lub null gdy target juz minal.
export async function scheduleNapNotification({
  childId,
  childName,
  birthDate,
  lastSleepEndAt,
}: ScheduleNapNotificationInput): Promise<string | null> {
  // Zawsze anuluj poprzednia, niezaleznie od tego czy zaplanujemy nowa.
  await cancelNapNotification(childId);

  const wakeWindowMin = targetWakeWindowMinutes(birthDate, new Date());
  const targetEnd = new Date(
    lastSleepEndAt.getTime() + (wakeWindowMin - NOTIF_LEAD_TIME_MIN) * 60 * 1000,
  );

  const msUntilTarget = targetEnd.getTime() - Date.now();
  if (msUntilTarget <= 0) {
    // User zakonczyl sesje dawno temu, target juz minal — nie schedulujemy.
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Drzemka ${childName} za ~${NOTIF_LEAD_TIME_MIN} min`,
      body: `Konczy sie okno aktywnosci (${wakeWindowMin} min).`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: targetEnd,
    },
  });

  await AsyncStorage.setItem(storageKey(childId), id);
  return id;
}
