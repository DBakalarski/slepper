// Cross-platform confirm dialog. Na web `Alert.alert` w react-native-web jest
// no-op (callback `onPress` nigdy nie odpali), wiec destruktywne akcje (Usun
// sesje, Cofnij zaproszenie) ciche failuja. Wrapper uzywa `window.confirm`
// na web (blocking, zwraca bool) i `Alert.alert` na native (z Promise).
// (review Fazy 3 P2.1)

import { Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  readonly title: string;
  readonly message: string;
  readonly confirmText?: string;
  readonly cancelText?: string;
  readonly destructive?: boolean;
};

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Anuluj',
    destructive = false,
  } = options;

  if (Platform.OS === 'web') {
    // window.confirm jest synchroniczny, ale zwracamy Promise dla parytetu API.
    const ok = typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`);
    return Promise.resolve(ok);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
