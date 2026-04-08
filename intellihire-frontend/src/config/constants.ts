// config/constants.ts

export const DATE_FORMATS = {
  DISPLAY:  'MMM dd, yyyy',
  API:      'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME:     'HH:mm',
  FULL:     'EEEE, MMMM dd, yyyy',
} as const;

export const APP_CONSTANTS = {
  TOKEN_KEY:         'token',
  REFRESH_TOKEN_KEY: 'refreshToken',
  USER_KEY:          'user',
  THEME_KEY:         'theme',
} as const;

export const ROLES = {
  ADMIN:     'admin',
  RECRUITER: 'recruiter',
  VIEWER:    'viewer',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 10,
  PAGE_SIZES:    [10, 20, 50, 100],
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN:    '/auth/login',
    REGISTER: '/auth/register/candidate',
    REFRESH:  '/auth/refresh',  // ← fixed: was '/refresh'
    LOGOUT:   '/auth/logout',   // ← fixed: was '/logout'
    ME:       '/auth/me',       // ← fixed: was '/me'
  },
} as const;