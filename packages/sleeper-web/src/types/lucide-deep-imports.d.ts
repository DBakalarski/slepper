// Ambient typy dla deep-importow ikon `lucide-react/dist/esm/icons/<kebab>`.
// lucide-react eksponuje typy tylko przez glowny barrel (`lucide-react`), wiec
// deep-importy (uzywane w `@/lib/icons` dla tree-shakingu) sa bez typow.
// Kazdy plik ikony default-eksportuje komponent typu `LucideIcon`.
declare module 'lucide-react/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react';

  const icon: LucideIcon;
  export default icon;
}
