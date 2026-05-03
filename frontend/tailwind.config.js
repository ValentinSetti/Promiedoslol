/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'promiedos': {
          'light': '#4CAF50',
          'dark': '#2E7D32',
          'darker': '#1B5E20',
          'bg': '#1a3a1a',
          'card': '#234d23',
          'header': '#1e3d1e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}