/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{tsx,ts}', './src/**/*.{tsx,ts}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f0f0f',
          card: '#1a1a1a',
          elevated: '#252525',
        },
        border: '#2a2a2a',
        text: {
          primary: '#f0f0f0',
          secondary: '#9a9a9a',
          muted: '#555555',
        },
        accent: {
          DEFAULT: '#6366f1',
          press: '#4f52d8',
        },
        success: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
