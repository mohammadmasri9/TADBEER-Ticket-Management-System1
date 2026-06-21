/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ooredoo-red': '#ED1C24',
        'ooredoo-red-dark': '#C41A20',
        'ooredoo-dark': '#414042',
        'ooredoo-grey': '#808285',
        'ooredoo-grey-light': '#A6A9AC',
        'ooredoo-grey-lighter': '#E6E7E8',
        'ooredoo-bg': '#F5F5F5',
        'ooredoo-blue': '#6C9BF5',
        'ooredoo-orange': '#FFA500',
        'ooredoo-green': '#00B140',
      },
      fontFamily: {
        'ooredoo': ['Arial', 'sans-serif'],
        'futura': ['Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
