// features/landing/tokens/tokens.ts
// Shared design tokens — Blue Professional theme
// Cool white base · deep navy · cobalt accents · Fraunces + DM Sans

export const C = {
  // Backgrounds
  bg:           '#f0f4fa',
  bgAlt:        '#e8eef7',
  bgCard:       '#ffffff',
  bgCardHov:    '#f5f8fe',
  surface:      '#f4f7fc',
  surfaceDeep:  '#e4ecf7',

  // Borders
  border:       'rgba(15,30,80,0.09)',
  borderMid:    'rgba(15,30,80,0.16)',
  borderHov:    'rgba(37,99,235,0.35)',

  // Blue accent (replaces gold)
  gold:         '#2563eb',
  goldLight:    '#3b82f6',
  goldDeep:     '#1d4ed8',
  goldDim:      'rgba(37,99,235,0.09)',
  goldDimHov:   'rgba(37,99,235,0.16)',
  gradGold:     'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',

  // Teal accent
  teal:         '#0d9488',
  tealLight:    '#14b8a6',
  tealDim:      'rgba(13,148,136,0.08)',

  // Indigo accent
  indigo:       '#4f46e5',
  indigoDim:    'rgba(79,70,229,0.08)',
  indigoLight:  '#818cf8',

  // Amber accent
  amber:        '#d97706',
  amberDim:     'rgba(217,119,6,0.09)',

  // Dark panel (used for CTA / feature panel)
  panel:        '#0a1628',
  panelMid:     '#0f2044',
  panelBorder:  'rgba(255,255,255,0.07)',
  panelText:    '#e2e8f0',
  panelMuted:   '#94a3b8',
  panelFaint:   '#1e3a5f',

  // Text
  text:         '#0a1628',
  textMid:      '#1e3a5f',
  textMuted:    '#4b6a9b',
  textFaint:    '#94a3b8',
  white:        '#ffffff',

  // Gradients
  gradHero:     'linear-gradient(155deg, #f0f4fa 0%, #e4edf9 50%, #edf2fb 100%)',
  gradCard:     'linear-gradient(145deg, rgba(37,99,235,0.04) 0%, rgba(255,255,255,0.95) 100%)',

  // Shadows
  shadow:       '0 1px 3px rgba(10,22,40,0.06), 0 8px 24px rgba(10,22,40,0.07)',
  shadowHov:    '0 4px 6px rgba(10,22,40,0.04), 0 20px 48px rgba(10,22,40,0.12)',
  shadowGold:   '0 6px 28px rgba(37,99,235,0.28)',
};

export const FONTS = {
  display: "'Fraunces', Georgia, serif",
  body:    "'DM Sans', system-ui, sans-serif",
};

export const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.55, delay: i * 0.08 },
  }),
};

export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: (i = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};