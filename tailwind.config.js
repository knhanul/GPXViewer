/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        ink: {
          900: '#0F1419',
          800: '#161B22',
          700: '#1A1F26',
          600: '#22282F'
        },
        accent: {
          DEFAULT: '#F97316',
          soft: '#FB923C'
        },
        trail: {
          start: '#22D3EE',
          end: '#F97316'
        }
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(249, 115, 22, 0.45)'
      }
    }
  },
  plugins: []
}
