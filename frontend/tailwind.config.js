/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // Veridian Design System Colors
      colors: {
        // Primary Surfaces
        'midnight-navy': '#0F172A',
        'deep-slate': '#1E293B',

        // Action Colors
        'veridian-emerald': '#10B981',
        'veridian-sky': '#3B82F6',

        // Feedback Colors
        'veridian-rose': '#F43F5E',
        'veridian-amber': '#F59E0B',

        // Typography
        'slate-caption': '#94A3B8',
      },

      // Veridian Font Stack
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // Veridian Spacing (8pt grid system)
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
      },

      // Veridian Border Radius
      borderRadius: {
        'container': '12px',
        'input': '8px',
      },

      // Minimum heights for touch targets (48px)
      minHeight: {
        'touch': '48px',
      },

      // Box Shadows
      boxShadow: {
        'card': '0 25px 60px rgba(0,0,0,0.5)',
        'elevated': '0 8px 32px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};
