// features/auth/slices/authSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types/auth.types';
import { authService }   from '../services/auth.service';
import { APP_CONSTANTS } from '../../../config/constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

const clearStorage = () => {
  localStorage.removeItem(APP_CONSTANTS.TOKEN_KEY);
  localStorage.removeItem(APP_CONSTANTS.REFRESH_TOKEN_KEY);
  localStorage.removeItem(APP_CONSTANTS.USER_KEY);
};

/**
 * Parse user info directly from the JWT access token payload.
 * Your backend encodes: { sub (email), id, role, type, exp }
 * No extra /me call needed.
 */
const parseUserFromToken = (token: string): User | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.id || !payload?.sub || !payload?.role) return null;
    return {
      id:    payload.id,
      email: payload.sub,   // 'sub' is the email
      role:  payload.role,
      name:  payload.name ?? payload.sub, // backend has no name in token, fallback to email
    };
  } catch {
    return null;
  }
};

/**
 * Check if a JWT token is expired.
 */
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// ── Initial state ─────────────────────────────────────────────────────────────

const storedToken = localStorage.getItem(APP_CONSTANTS.TOKEN_KEY);

// Parse user from token immediately — no async needed on first render
const storedUser = storedToken && !isTokenExpired(storedToken)
  ? parseUserFromToken(storedToken)
  : null;

const initialState: AuthState = {
  user:            storedUser,
  token:           storedToken,
  refreshToken:    localStorage.getItem(APP_CONSTANTS.REFRESH_TOKEN_KEY),
  isLoading:       false,
  isInitialized:   false,
  error:           null,
  isAuthenticated: !!storedUser,
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      // Parse user from the access token — login response has no user field
      const user = parseUserFromToken(response.access_token);
      if (!user) return rejectWithValue('Invalid token received');

      localStorage.setItem(APP_CONSTANTS.TOKEN_KEY,         response.access_token);
      localStorage.setItem(APP_CONSTANTS.REFRESH_TOKEN_KEY, response.refresh_token);
      localStorage.setItem(APP_CONSTANTS.USER_KEY,          JSON.stringify(user));

      return { ...response, user };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.detail ?? err?.response?.data?.message ?? 'Login failed'
      );
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.register(credentials);
      const user = parseUserFromToken(response.access_token);
      if (!user) return rejectWithValue('Invalid token received');

      localStorage.setItem(APP_CONSTANTS.TOKEN_KEY,         response.access_token);
      localStorage.setItem(APP_CONSTANTS.REFRESH_TOKEN_KEY, response.refresh_token);
      localStorage.setItem(APP_CONSTANTS.USER_KEY,          JSON.stringify(user));

      return { ...response, user };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.detail ?? err?.response?.data?.message ?? 'Registration failed'
      );
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    if (state.auth.token) {
      try {
        await authService.logout(state.auth.token);
      } catch {
        // ignore API errors — always clear local state
      }
    }
    clearStorage();
  }
);

/**
 * Called once on app start.
 * - No token → isInitialized = true, not authenticated
 * - Token expired → try refresh, else clear
 * - Token valid → parse user from token directly (no /me call needed)
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    const token        = localStorage.getItem(APP_CONSTANTS.TOKEN_KEY);
    const refreshToken = localStorage.getItem(APP_CONSTANTS.REFRESH_TOKEN_KEY);

    // No token at all
    if (!token) return null;

    // Token still valid — parse user from it directly
    if (!isTokenExpired(token)) {
      const user = parseUserFromToken(token);
      if (user) return { token, refreshToken, user };
    }

    // Token expired — try to refresh
    if (refreshToken && !isTokenExpired(refreshToken)) {
      try {
        const response = await authService.refreshToken(refreshToken);
        const newToken = response.access_token;
        const user     = parseUserFromToken(newToken);
        if (!user) throw new Error('Bad token');

        localStorage.setItem(APP_CONSTANTS.TOKEN_KEY, newToken);
        localStorage.setItem(APP_CONSTANTS.USER_KEY,  JSON.stringify(user));
        return { token: newToken, refreshToken, user };
      } catch {
        clearStorage();
        return rejectWithValue('Session expired');
      }
    }

    // Both expired
    clearStorage();
    return null;
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token           = action.payload.token;
      state.user            = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem(APP_CONSTANTS.TOKEN_KEY, action.payload.token);
      localStorage.setItem(APP_CONSTANTS.USER_KEY,  JSON.stringify(action.payload.user));
    },
  },
  extraReducers: (builder) => {

    // ── login ─────────────────────────────────────────────────────────────
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading       = false;
        state.isAuthenticated = true;
        state.isInitialized   = true;
        state.token           = action.payload.access_token;
        state.refreshToken    = action.payload.refresh_token;
        state.user            = action.payload.user;
        state.error           = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string ?? 'Login failed';
      });

    // ── register ──────────────────────────────────────────────────────────
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error     = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading       = false;
        state.isAuthenticated = true;
        state.isInitialized   = true;
        state.token           = action.payload.access_token;
        state.refreshToken    = action.payload.refresh_token;
        state.user            = action.payload.user;
        state.error           = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error     = action.payload as string ?? 'Registration failed';
      });

    // ── logout ────────────────────────────────────────────────────────────
    builder.addCase(logout.fulfilled, (state) => {
      state.user            = null;
      state.token           = null;
      state.refreshToken    = null;
      state.isAuthenticated = false;
      state.isInitialized   = true;
    });

    // ── initializeAuth ────────────────────────────────────────────────────
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isInitialized = true;
        if (action.payload) {
          state.token           = action.payload.token;
          state.refreshToken    = action.payload.refreshToken ?? state.refreshToken;
          state.user            = action.payload.user;
          state.isAuthenticated = true;
        } else {
          // No token or both expired — clear
          state.user            = null;
          state.token           = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isInitialized   = true;
        state.user            = null;
        state.token           = null;
        state.refreshToken    = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;