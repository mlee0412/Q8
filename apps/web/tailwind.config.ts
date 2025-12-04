import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'oklch(100% 0 0 / 0.08)',
          border: 'oklch(100% 0 0 / 0.15)',
        },
        neon: {
          primary: 'oklch(65% 0.2 260)', // Electric Purple
          accent: 'oklch(80% 0.3 140)',  // Cyber Green
        },
      },
      backdropBlur: {
        glass: '24px',
      },
      borderRadius: {
        xl: '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
