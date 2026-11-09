import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { LoginCredentials, RegisterCredentials, User } from '../../../types/auth';
import { cricketApi, setAccessToken } from '../../../lib/api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem('cricbuzz_refresh_token');
    setUser(null);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const data = await cricketApi.login(credentials);
    setAccessToken(data.access_token);
    localStorage.setItem('cricbuzz_refresh_token', data.refresh_token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const data = await cricketApi.register(credentials);
    setAccessToken(data.access_token);
    localStorage.setItem('cricbuzz_refresh_token', data.refresh_token);
    setUser(data.user);
  }, []);

  // Hydrate session on load using refresh token
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const storedRefresh = localStorage.getItem('cricbuzz_refresh_token');
      if (!storedRefresh) {
        if (mounted) setIsLoading(false);
        return;
      }
      try {
        const data = await cricketApi.refreshToken(storedRefresh);
        if (mounted) {
          setAccessToken(data.access_token);
          localStorage.setItem('cricbuzz_refresh_token', data.refresh_token);
          setUser(data.user);
        }
      } catch {
        if (mounted) {
          logout();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
