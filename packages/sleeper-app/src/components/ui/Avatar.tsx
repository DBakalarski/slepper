import { Image } from 'expo-image';
import { Text, View } from 'react-native';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  // Imie dziecka — pierwszy znak (uppercase) renderowany jako fallback bez `image`.
  name: string;
  // Tlo kolka. Akceptuje surowe HEX (np. `child.avatar_color` z bazy) lub
  // Tailwind className w `bgClassName` (jedno z dwoch — `color` ma priorytet).
  color?: string;
  // Tailwind className zamiennie z `color` (np. "bg-purple"). `color` HEX
  // pokrywa wiekszosc case'ow z bazy danych; className dla statycznych miejsc.
  bgClassName?: string;
  size?: AvatarSize;
  // Opcjonalny obraz — kolko pelni role kontenera, `Image` overlay.
  image?: string;
  // Opcjonalna obwodka (np. karta dziecka w Profilu z border-2 border-white).
  ringClassName?: string;
}

const SIZE_TO_CLASSES: Record<AvatarSize, { wrapper: string; text: string }> = {
  sm: { wrapper: 'w-9 h-9', text: 'text-sm' },
  md: { wrapper: 'w-12 h-12', text: 'text-base' },
  lg: { wrapper: 'w-20 h-20', text: 'text-2xl' },
};

// Kolko z inicjalem (lub obrazem). Renderuje pierwszy znak `name` uppercase,
// kolor z `color` HEX (priorytet) lub `bgClassName`. Dla accessibility role
// to "image" z labelem `name` — VoiceOver/TalkBack czytaja imie zamiast literki.
export function Avatar({
  name,
  color,
  bgClassName,
  size = 'md',
  image,
  ringClassName,
}: AvatarProps) {
  const sizing = SIZE_TO_CLASSES[size];
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const ring = ringClassName ?? '';
  const bg = color ? undefined : bgClassName ?? 'bg-purple';

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      className={`${sizing.wrapper} items-center justify-center rounded-pill overflow-hidden ${bg ?? ''} ${ring}`}
      style={color ? { backgroundColor: color } : undefined}>
      {image ? (
        <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <Text className={`${sizing.text} font-semibold text-cream`}>{initial}</Text>
      )}
    </View>
  );
}
