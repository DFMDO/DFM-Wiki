import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#e2273e',
          dark: '#b81f32'
        }
      }
    }
  },
  plugins: []
} satisfies Config
