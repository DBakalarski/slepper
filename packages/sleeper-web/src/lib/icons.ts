// Centralny barrel ikon — deep importy z `lucide-react` (web-only).
//
// Powod: import z `lucide-react-native` (lub barrel `lucide-react`) wciaga do
// bundla WSZYSTKIE ~1500 ikon (~1.3 MB, ~20% calego bundla), bo Metro NIE
// tree-shake'uje barreli. Deep importy per-ikona (`lucide-react/dist/esm/
// icons/<kebab>`) bundla wylacznie faktycznie uzywane ikony (~16) — kilkadziesiat
// KB zamiast 1.3 MB.
//
// Reguly: nowa ikona => dodaj tu jeden `export { default as X }` z deep-importem,
// nigdy nie importuj bezposrednio z `lucide-react` / `lucide-react-native` w kodzie
// aplikacji.

export { default as BarChart3 } from 'lucide-react/dist/esm/icons/bar-chart-3';
export { default as Bell } from 'lucide-react/dist/esm/icons/bell';
export { default as Calendar } from 'lucide-react/dist/esm/icons/calendar';
export { default as Check } from 'lucide-react/dist/esm/icons/check';
export { default as ChevronDown } from 'lucide-react/dist/esm/icons/chevron-down';
export { default as ChevronLeft } from 'lucide-react/dist/esm/icons/chevron-left';
export { default as ChevronRight } from 'lucide-react/dist/esm/icons/chevron-right';
export { default as FileText } from 'lucide-react/dist/esm/icons/file-text';
export { default as Home } from 'lucide-react/dist/esm/icons/home';
export { default as List } from 'lucide-react/dist/esm/icons/list';
export { default as Moon } from 'lucide-react/dist/esm/icons/moon';
export { default as Plus } from 'lucide-react/dist/esm/icons/plus';
export { default as Settings } from 'lucide-react/dist/esm/icons/settings';
export { default as Smartphone } from 'lucide-react/dist/esm/icons/smartphone';
export { default as Sun } from 'lucide-react/dist/esm/icons/sun';
export { default as Upload } from 'lucide-react/dist/esm/icons/upload';
export { default as User } from 'lucide-react/dist/esm/icons/user';

// Typ — import type jest wymazywany w buildzie (zero kosztu runtime/bundla).
export type { LucideIcon } from 'lucide-react';
