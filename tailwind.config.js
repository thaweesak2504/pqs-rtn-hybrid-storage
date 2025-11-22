/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./example/**/*.{js,ts,jsx,tsx,html}", // เพิ่ม path นี้เพื่อให้ Tailwind สแกนหา class ในโฟลเดอร์ example
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Kanit', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        'kanit': ['Kanit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'th-sarabun': ['TH Sarabun New', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      screens: {
        // Desktop-first breakpoints
        'desktop': '1024px',   // Minimum desktop
        'hd': '1280px',        // HD resolution
        'fhd': '1440px',       // Full HD resolution
        '2k': '1920px',        // 2K resolution
        '4k': '2560px',        // 4K resolution
        '8k': '3840px',        // 8K resolution
      },
      maxWidth: {
        '8xl': '88rem',    // 1408px
        '9xl': '96rem',    // 1536px
        '10xl': '104rem',  // 1664px
        '11xl': '112rem',  // 1792px
        '12xl': '120rem',  // 1920px
      },
      colors: {
        'github': {
          'bg-primary': 'var(--github-bg-primary)',
          'bg-secondary': 'var(--github-bg-secondary)',
          'bg-tertiary': 'var(--github-bg-tertiary)',
          'bg-hover': 'var(--github-bg-hover)',
          'bg-active': 'var(--github-bg-active)',
          'bg-muted': 'var(--github-bg-muted)',
          'border-primary': 'var(--github-border-primary)',
          'border-secondary': 'var(--github-border-secondary)',
          'border-active': 'var(--github-border-active)',
          'text-primary': 'var(--github-text-primary)',
          'text-secondary': 'var(--github-text-secondary)',
          'text-tertiary': 'var(--github-text-tertiary)',
          'accent-primary': 'var(--github-accent-primary)',
          'accent-secondary': 'var(--github-accent-secondary)',
          'accent-primary-hover': 'var(--github-accent-primary-hover)',
          'accent-secondary-hover': 'var(--github-accent-secondary-hover)',
          'accent-muted': 'var(--github-accent-muted)',
          'accent-success': 'var(--github-accent-success)',
          'accent-danger': 'var(--github-accent-danger)',
          'accent-warning': 'var(--github-accent-warning)',
          'accent-info': 'var(--github-accent-info)',
          'accent-purple': 'var(--github-accent-purple)',
          'accent-orange': 'var(--github-accent-orange)',
          'accent-pink': 'var(--github-accent-pink)',
          'accent-indigo': 'var(--github-accent-indigo)',
        },
      },
      boxShadow: {
        'github-small': 'var(--github-shadow-small)',
        'github-medium': 'var(--github-shadow-medium)',
        'github-large': 'var(--github-shadow-large)',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease-out both',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          'from': { opacity: '0', transform: 'translateY(2px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
