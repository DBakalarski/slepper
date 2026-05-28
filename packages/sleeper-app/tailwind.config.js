/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Faza 1 ui-redesign: 'media' -> 'class' (manual override z tri-state
  // System/Light/Dark). `ThemeProvider` (Faza 1) wstawia `className="dark"`
  // na root View na podstawie `useThemeStore`. Wszystkie istniejace `dark:*`
  // klasy dzialaja bez zmian, ale teraz driven by className zamiast Appearance.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta z mockupow MVP sleep-tracker
        cream: '#F5F0E8',
        navy: '#1E1B4B',
        orange: '#E08B6F',
        purple: '#7C6BAD',
        // Faza 0 ui-redesign — dodatkowe odcienie z mockupow Profilu/Dzisiaj.
        'purple-light': '#B8A8D9',
        'purple-soft': '#E8DEF7',
        success: '#5A8B6F',
        'success-soft': '#D7E5DC',
        'orange-soft': '#FBE8DD',
        'text-muted': '#6B6580',
        // Dark variants — utrzymujemy ten sam kontrast WCAG AA wzgledem tla.
        // Tlo dark = #0F0D26 (ciemniejszy navy), karty = navy, akcent = orange/purple bez zmian.
        'dark-bg': '#0F0D26',
        'dark-card': '#1E1B4B',
        'dark-surface': '#2A2660',
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      boxShadow: {
        // NativeWind v4 mapuje boxShadow na native shadow props (iOS) i
        // elevation (Android). Wartosc z mockupow — delikatny cien karty.
        card: '0 4px 12px rgba(30, 27, 75, 0.04)',
      },
      fontFamily: {
        // Aliasy dla domeny — system font + tabular nums dla timerow.
        // NativeWind v4 przeciaza tylko fontFamily; faktyczne PostScript names
        // ustawia <Text style={{ fontVariant: ['tabular-nums'] }}> w komponentach.
        display: ['System'],
        mono: ['System'],
      },
    },
  },
  plugins: [],
};
