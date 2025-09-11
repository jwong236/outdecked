/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom component classes for consistent glass-morphism design
    },
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.glass-panel': {
          '@apply bg-white/10 backdrop-blur-sm rounded-lg shadow-md text-white': {},
        },
        '.glass-card': {
          '@apply bg-white/10 backdrop-blur-sm rounded-lg shadow-md text-white p-4': {},
        },
        '.glass-button': {
          '@apply bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors duration-150': {},
        },
        '.glass-input': {
          '@apply bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20': {},
        }
      })
    }
  ],
}
