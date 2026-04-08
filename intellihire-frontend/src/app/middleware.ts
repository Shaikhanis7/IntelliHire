import type { Middleware } from '@reduxjs/toolkit';
// import { logout } from '../features/auth/slices/authSlice';

export const authMiddleware: Middleware = () => (next) => (action: unknown) => {
  // Check if action has a type property
  if (action && typeof action === 'object' && 'type' in action) {
    if (action.type === 'auth/logout/fulfilled') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }
  return next(action);
};

export const loggerMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  if (import.meta.env.DEV) {
    // Type guard to safely access action properties
    if (action && typeof action === 'object' && 'type' in action) {
      console.group(action.type);
      if ('payload' in action) {
        console.log('Payload:', action.payload);
      }
      console.log('Next State:', store.getState());
      console.groupEnd();
    }
  }
  return next(action);
};