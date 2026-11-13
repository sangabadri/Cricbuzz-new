import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { LoginCredentials, RegisterCredentials, User } from '../../../types/auth';
import { cricketApi, setAccessToken } from '../../../lib/api-client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      await cricketApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const data = await cricketApi.login(credentials);
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const data = await cricketApi.register(credentials);
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

  // Hydrate session on load using httpOnly cookie refresh exchange
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const data = await cricketApi.refreshToken();
        if (mounted) {
          setAccessToken(data.access_token);
          setUser(data.user);
        }
      } catch {
        if (mounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    hydrate();
    return () => {
      mounted = false;
    };
  }, []);

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
