// features/auth/types/auth.types.ts

export interface User {
  id: number;
  name: string;
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
  user?: User;   // present on candidate register; absent on plain login (parsed from JWT)
}

export interface AuthState {
  user:            User | null;   // always has name once populated
  token:           string | null;
  refreshToken:    string | null;
  isLoading:       boolean;
  isInitialized:   boolean;
  error:           string | null;
  isAuthenticated: boolean;
}