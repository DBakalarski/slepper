// Centralna paleta HEX dla miejsc, w ktorych nie mozemy uzyc Tailwind className
// (lucide-react-native ikony, ActivityIndicator color prop, SVG fill/stroke).
// Wartosci zsynchronizowane z `tailwind.config.js` — zmiana tutaj wymaga
// odpowiadajacej zmiany w tailwind config (jeden zrodlo prawdy per kanal,
// niestety RN nie pozwala na deep import tokenow tailwinda bez build stepu).
//
// Decyzja Fazy 6 ui-redesign: wyciagniete po zliczeniu >50 wystapien HEX
// literals przez fazy 0-5. Lokalizacja w `src/lib/` bo `lib/` to "zero-deps
// utilities" obok `time.ts`, `colors.ts` (kontekst Fazy 6 plan: src/lib/colors.ts).
export const COLORS = {
  navy: '#1E1B4B',
  cream: '#F5F0E8',
  orange: '#E08B6F',
  purple: '#7C6BAD',
  purpleLight: '#B8A8D9',
  textMuted: '#6B6580',
} as const;
