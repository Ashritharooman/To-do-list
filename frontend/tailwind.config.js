/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['DM Sans', 'sans-serif'], body: ['Manrope', 'sans-serif'] },
      colors: { ink: '#17212b', cream: '#f6f5ef', coral: '#ef6f61', mint: '#dcefe6', sun: '#f5c873' }
    }
  },
  plugins: []
}
