export type MatchUserRole = 'owner' | 'scorer' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface MatchAccess {
  user_id: number;
  username: string;
  role: MatchUserRole;
  granted_by?: number;
  created_at?: string;
}
