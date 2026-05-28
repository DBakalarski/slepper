import type { ReactNode } from 'react';
import { View } from 'react-native';

export type CardVariant = 'default' | 'gradient';

interface CardProps {
  children: ReactNode;
  // `default` = bialy card z radius/cieniem. `gradient` = ciemne purple-light tlo
  // (decyzja Fazy 0: SKIP expo-linear-gradient, uzywamy solid bg-purple-light).
  variant?: CardVariant;
  className?: string;
}

// Bazowy wrapper karty zgodny z mockupami: rounded-card (20px), p-5, shadow-card.
// `gradient` zamienia bg na solid purple-light (uzywany na karcie aktywnego
// dziecka w Profilu).
export function Card({ children, variant = 'default', className = '' }: CardProps) {
  const base =
    variant === 'gradient'
      ? 'bg-purple-light dark:bg-dark-surface'
      : 'bg-white dark:bg-dark-card';
  return (
    <View className={`${base} rounded-card p-5 shadow-card ${className}`}>
      {children}
    </View>
  );
}
