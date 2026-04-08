// features/auth/services/auth.service.ts
//
// Change from previous version:
//   extractErrorMessage() reads the FastAPI { detail } and re-throws as a
//   plain Error — so the slice catch blocks get a real err.message string
//   instead of an AxiosError whose .response is undefined after being caught.
//
// The slice reads:
//   err?.response?.data?.detail ?? err?.response?.data?.message ?? 'fallback'
//
// That chain works for AxiosError objects — so we keep it compatible by
// NOT catching in the service for login/register. Instead we let the raw
// AxiosError propagate to the slice where the chain already handles it.
//
// BUT — the problem is axios throws its own generic message like:
//   "Request failed with status code 401"
// which contains none of the keywords AuthPage checks for.
//
// Fix: intercept in the service, extract the FastAPI detail string,
// attach it as err.message so the slice's fallback chain finds it,
// then re-throw. The slice catch still works the same way.

import axios, { AxiosError } from 'axios';
import { env } from '../../../config/env';
import { API_ENDPOINTS } from '../../../config/constants';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types/auth.types';

// ── Error helper ──────────────────────────────────────────────────────────────
// Extracts the FastAPI `detail` string and throws it as a plain Error.
// This means the slice catch block gets: err.message = "Invalid email or password."
// instead of: err.message = "Request failed with status code 401"
//
// Keyword coverage for AuthPage:
//
//  Login errors:
//    "Invalid email or password."              → 'invalid'    ✓
//    "No account found with this email…"       → 'not found'  ✓
//    "Network error…"                          → 'network'    ✓
//
//  Signup errors:
//    "An account with this email already…"     → 'already'    ✓
//    "Network error…"                          → 'network'    ✓

function throwReadable(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ detail: string | Array<{ msg: string }> }>;

    // FastAPI validation error (422) → array of {msg}
    const detail = axiosErr.response?.data?.detail;
    if (typeof detail === 'string' && detail) {
      throw new Error(detail);
    }
    if (Array.isArray(detail) && detail[0]?.msg) {
      throw new Error(detail[0].msg);
    }

    // No response → network failure
    if (!axiosErr.response) {
      throw new Error('Network error. Please check your connection.');
    }

    // Fallback with status
    throw new Error(`Request failed (${axiosErr.response.status})`);
  }

  // Non-axios error — pass through
  if (err instanceof Error) throw err;
  throw new Error('An unexpected error occurred.');
}

// ─────────────────────────────────────────────────────────────────────────────

export const authService = {
  // ── Login ──────────────────────────────────────────────────────────────────
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const res = await axios.post(
        `${env.API_URL}${API_ENDPOINTS.AUTH.LOGIN}`,
        credentials
      );
      return res.data;
    } catch (err) {
      throwReadable(err);  // re-throws as plain Error with FastAPI detail message
    }
  },

  // ── Register (candidate) ───────────────────────────────────────────────────
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const res = await axios.post(
        `${env.API_URL}${API_ENDPOINTS.AUTH.REGISTER}`,
        credentials
      );
      return res.data;
    } catch (err) {
      throwReadable(err);
    }
  },

  // ── Refresh token ──────────────────────────────────────────────────────────
  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const res = await axios.post(
        `${env.API_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
        { refresh_token: refreshToken }
      );
      return res.data;
    } catch (err) {
      throwReadable(err);
    }
  },

  // ── Get current user ───────────────────────────────────────────────────────
  async getMe(token: string): Promise<User> {
    try {
      const res = await axios.get(
        `${env.API_URL}${API_ENDPOINTS.AUTH.ME}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;
      return {
        id:    data.id,
        email: data.email,
        role:  data.role,
        name:  data.name ?? data.email,
      };
    } catch (err) {
      throwReadable(err);
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(token: string): Promise<void> {
    try {
      await axios.post(
        `${env.API_URL}${API_ENDPOINTS.AUTH.LOGOUT}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      throwReadable(err);
    }
  },
};