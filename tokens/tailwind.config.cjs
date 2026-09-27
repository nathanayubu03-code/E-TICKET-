// e-Ticket RDC · design tokens pour Tailwind CSS v3.
// Les couleurs sémantiques lisent les variables --et-* définies dans theme.css (blocs :root et .dark).
// Pour Tailwind v4, importer directement tokens/theme.css.

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ciel: { 300: '#8CC4FF', 500: '#1E8FFF', 700: '#0050A6' },
        braise: { 300: '#FF7A86', 600: '#C8102E', 700: '#B00E28' },
        soleil: { 400: '#FFD21F' },
        nuit: { 600: '#4A4436', 700: '#2E2A21', 800: '#1A1813', 900: '#14120E', 950: '#0D0C0A' },
        ivoire: { 25: '#FFFDF7', 50: '#FBF5E6', 200: '#F1E6CC' },
        sable: { 400: '#D9CAA6' },
        taupe: { 300: '#B9AE98', 600: '#5C5446' },
        alerte: { 500: '#F08A00' },
        op: { airtel: '#E40000', mpesa: '#007A3D', orange: '#FF7900', afrimoney: '#5A2D82' },

        fond: 'var(--et-fond)',
        surface: { DEFAULT: 'var(--et-surface)', 2: 'var(--et-surface-2)' },
        encre: { DEFAULT: 'var(--et-encre)', douce: 'var(--et-encre-douce)' },
        trait: 'var(--et-trait)',
        champ: 'var(--et-champ)',
        lien: 'var(--et-lien)',
        focus: 'var(--et-focus)',
        action: { DEFAULT: '#FFD21F', sur: '#14120E', contour: 'var(--et-contour-action)' },
        danger: { DEFAULT: 'var(--et-danger)', doux: 'var(--et-danger-doux)' },
        succes: { 400: '#34C26E', 700: '#0B7A3E', DEFAULT: 'var(--et-succes)', doux: 'var(--et-succes-doux)', plein: 'var(--et-succes-plein)', 'sur-plein': 'var(--et-sur-succes-plein)' },
        info: { DEFAULT: 'var(--et-info)', doux: 'var(--et-info-doux)' },
        attention: { DEFAULT: 'var(--et-attention)', doux: 'var(--et-attention-doux)' },
        desactive: 'var(--et-desactive)',
      },
      fontFamily: {
        affiche: ['Anybody', '"Arial Narrow"', 'sans-serif'],
        texte: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'affiche-2xl': ['52px', { lineHeight: '0.9' }],
        'affiche-xl': ['40px', { lineHeight: '0.95' }],
        'affiche-lg': ['32px', { lineHeight: '1' }],
        'affiche-md': ['24px', { lineHeight: '1.1' }],
        titre: ['20px', { lineHeight: '1.3' }],
        'corps-lg': ['17px', { lineHeight: '1.45' }],
        corps: ['16px', { lineHeight: '1.5' }],
        petit: ['14px', { lineHeight: '1.4' }],
        micro: ['13px', { lineHeight: '1.3' }],
      },
      spacing: { tap: '48px' },
      minHeight: { tap: '48px' },
      minWidth: { tap: '48px' },
      borderRadius: { xs: '6px', sm: '10px', md: '14px', lg: '16px', billet: '20px' },
      boxShadow: {
        'affiche-sm': '3px 3px 0 var(--et-ombre)',
        affiche: '5px 5px 0 var(--et-ombre)',
      },
      keyframes: {
        'kuba-souffle': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        'billet-arrive': {
          '0%': { opacity: '0', transform: 'translateY(40px) rotate(-3deg) scale(0.94)' },
          '60%': { opacity: '1', transform: 'translateY(-6px) rotate(1deg) scale(1.01)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        squelette: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
      },
      animation: {
        'kuba-souffle': 'kuba-souffle 9s ease-in-out infinite',
        'billet-arrive': 'billet-arrive 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        squelette: 'squelette 1.6s ease-in-out infinite',
      },
    },
  },
};
