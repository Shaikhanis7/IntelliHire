// features/auth/types/auth.types.ts

export interface User {
  id: number;
  name: string;   // fallback to email if backend doesn't return name
  email: string;
  role: 'recruiter' | 'candidate' | 'admin';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token:  string;
  refresh_token: string;
  // NOTE: your backend login response does NOT include a user field.
  // user is parsed from the JWT token in authSlice.
  user?: User;
}

export interface AuthState {
  user:            User | null;
  token:           string | null;
  refreshToken:    string | null;
  isLoading:       boolean;
  isInitialized:   boolean;
  error:           string | null;
  isAuthenticated: boolean;
}