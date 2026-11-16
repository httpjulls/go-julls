/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'), surface: v('surface'), elevated: v('elevated'), line: v('line'),
        pink: v('pink'), pinkv: v('pinkv'), pinks: v('pinks'), pinkp: v('pinkp'),
        accent: v('accent'), // rosa usado como TEXTO (ajustado por tema p/ contraste)
        ink: v('ink'), muted: v('muted'), warn: v('warn'), onpink: v('onpink'),
      },
      fontFamily: { sans: ['"Inter Variable"', 'system-ui', 'sans-serif'] },
      screens: { tab: '768px' },
    },
  },
  plugins: [],
};
