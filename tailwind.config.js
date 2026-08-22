/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf7ef",
          100: "#f8e7cb",
          200: "#eecb92",
          300: "#e0a955",
          400: "#c98a32",
          500: "#a26b1e",
          600: "#7c5015",
          700: "#5a3a0f",
          800: "#3a2609",
          900: "#1f1405",
        },
        forest: {
          500: "#2b5d3a",
          700: "#1a3a24",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        bangla: ['"Noto Serif Bengali"', "serif"],
      },
    },
  },
  plugins: [],
};
