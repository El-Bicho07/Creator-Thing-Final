/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#070A0F',
          900: '#0B0F17',
          850: '#111722',
          800: '#17202F',
          700: '#222E42',
          600: '#32425B',
          500: '#475C7E',
        },
        lime: {
          accent: '#A3E635',
          bright: '#BEF264',
          glow: '#65A30D',
          dark: '#3F6212',
          muted: '#1E2C10',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-lime': '0 0 20px -3px rgba(163, 230, 53, 0.25)',
        'glow-subtle': '0 0 15px -3px rgba(163, 230, 53, 0.12)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
      }
    },
  },
  plugins: [],
}
