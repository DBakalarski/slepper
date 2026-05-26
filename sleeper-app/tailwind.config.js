/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Paleta z mockupow MVP sleep-tracker
        cream: '#F5F0E8',
        navy: '#1E1B4B',
        orange: '#E08B6F',
        purple: '#7C6BAD',
      },
    },
  },
  plugins: [],
};
