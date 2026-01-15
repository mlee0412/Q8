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
      /* ============================================
         Typography Scale
         ============================================ */
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        'base': ['0.875rem', { lineHeight: '1.5rem' }], // 14px
        'lg': ['1rem', { lineHeight: '1.5rem' }],       // 16px
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        '2xl': ['1.375rem', { lineHeight: '1.875rem' }],// 22px
      },

      /* ============================================
         Spacing Scale (4px base)
         ============================================ */
      spacing: {
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
      },

      /* ============================================
         Border Radius
         ============================================ */
      borderRadius: {
        'sm': '0.5rem',   // 8px
        'md': '0.75rem',  // 12px
        'lg': '1rem',     // 16px
        'xl': '1.5rem',   // 24px
      },

      /* ============================================
         Colors
         ============================================ */
      colors: {
        // Surface colors
        surface: {
          1: 'oklch(12% 0.01 260)',
          2: 'oklch(16% 0.015 260)',
          3: 'oklch(100% 0 0 / 0.08)',
          4: 'oklch(100% 0 0 / 0.12)',
        },
        // Border colors
        border: {
          subtle: 'oklch(100% 0 0 / 0.08)',
          strong: 'oklch(100% 0 0 / 0.2)',
          accent: 'oklch(65% 0.2 260 / 0.5)',
        },
        // Legacy glass tokens (backward compatibility)
        glass: {
          bg: 'oklch(100% 0 0 / 0.08)',
          border: 'oklch(100% 0 0 / 0.15)',
        },
        // Neon accents
        neon: {
          primary: 'oklch(65% 0.2 260)',  // Electric Purple
          accent: 'oklch(80% 0.3 140)',   // Cyber Green
        },
        // Text colors
        text: {
          primary: 'oklch(98% 0 0)',
          secondary: 'oklch(75% 0 0)',
          muted: 'oklch(55% 0 0)',
        },
        // State colors
        success: 'oklch(70% 0.2 145)',
        warning: 'oklch(75% 0.18 75)',
        danger: 'oklch(60% 0.25 25)',
        info: 'oklch(70% 0.15 230)',
      },

      /* ============================================
         Box Shadow (Elevation Tiers)
         ============================================ */
      boxShadow: {
        '1': '0 1px 2px oklch(0% 0 0 / 0.1)',
        '2': '0 4px 12px oklch(0% 0 0 / 0.15)',
        '3': '0 8px 30px oklch(0% 0 0 / 0.2)',
        'focus': '0 0 0 2px oklch(65% 0.2 260 / 0.5)',
        'neon': '0 0 20px oklch(65% 0.2 260 / 0.5)',
      },

      /* ============================================
         Backdrop Blur
         ============================================ */
      backdropBlur: {
        glass: '24px',
      },

      /* ============================================
         Animation
         ============================================ */
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      /* ============================================
         Grid
         ============================================ */
      gridTemplateColumns: {
        'bento': 'repeat(4, minmax(0, 1fr))',
      },
      gridAutoRows: {
        'bento': 'minmax(160px, auto)',
      },

      /* ============================================
         Transitions
         ============================================ */
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
