/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/pages/**/*.html",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('flowbite/plugin')
  ],
}
