/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'media' = bazujemy na systemowym ColorScheme (iOS Display & Brightness,
  // Android Dark theme). NativeWind v4 czyta Appearance API natywnie.
  // 'class' wymagaloby manualnego togglera UI — out of scope dla MVP.
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Paleta z mockupow MVP sleep-tracker
        cream: '#F5F0E8',
        navy: '#1E1B4B',
        orange: '#E08B6F',
        purple: '#7C6BAD',
        // Dark variants — utrzymujemy ten sam kontrast WCAG AA wzgledem tla.
        // Tlo dark = #0F0D26 (ciemniejszy navy), karty = navy, akcent = orange/purple bez zmian.
        'dark-bg': '#0F0D26',
        'dark-card': '#1E1B4B',
        'dark-surface': '#2A2660',
      },
    },
  },
  plugins: [],
};
