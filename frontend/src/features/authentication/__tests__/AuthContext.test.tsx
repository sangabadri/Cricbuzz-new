import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../../../app/router/ProtectedRoute';
import { cricketApi, getAccessToken } from '../../../lib/api-client';

vi.mock('../../../lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api-client')>(
    '../../../lib/api-client'
  );
  return {
    ...actual,
    cricketApi: {
      ...actual.cricketApi,
      login: vi.fn(),
      register: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    },
  };
});

const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, login, register, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</div>
      <div data-testid="username">{user?.username || 'none'}</div>
      <button onClick={() => login({ username: 'test_user', password: 'password123' })}>
        Trigger Login
      </button>
      <button
        onClick={() =>
          register({ username: 'new_user', email: 'new@example.com', password: 'password123' })
        }
      >
        Trigger Register
      </button>
      <button onClick={logout}>Trigger Logout</button>
    </div>
  );
};

describe('AuthContext & Authentication Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders with initial logged-out state when no session cookie is present', async () => {
    vi.mocked(cricketApi.refreshToken).mockRejectedValueOnce(new Error('No session'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
      expect(screen.getByTestId('username')).toHaveTextContent('none');
    });
  });

  it('hydrates session on mount when httpOnly cookie session is active', async () => {
    vi.mocked(cricketApi.refreshToken).mockResolvedValueOnce({
      access_token: 'hydrated-access-token',
      refresh_token: 'cookie-handled-token',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 77,
        username: 'session_cookie_user',
        email: 'cookie@example.com',
        is_active: true,
        is_superuser: false,
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
      expect(screen.getByTestId('username')).toHaveTextContent('session_cookie_user');
      expect(getAccessToken()).toBe('hydrated-access-token');
      // Verify refresh tokens are NEVER stored in localStorage
      expect(localStorage.getItem('cricbuzz_refresh_token')).toBeNull();
    });
  });

  it('successfully logs in, keeps access token in memory, and never stores in localStorage', async () => {
    vi.mocked(cricketApi.refreshToken).mockRejectedValueOnce(new Error('No session'));
    vi.mocked(cricketApi.login).mockResolvedValueOnce({
      access_token: 'mock-access-token-123',
      refresh_token: 'cookie-refresh-456',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 42,
        username: 'test_user',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Trigger Login'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
      expect(screen.getByTestId('username')).toHaveTextContent('test_user');
      expect(getAccessToken()).toBe('mock-access-token-123');
      expect(localStorage.getItem('cricbuzz_refresh_token')).toBeNull();
    });
  });

  it('successfully registers and updates user state securely', async () => {
    vi.mocked(cricketApi.refreshToken).mockRejectedValueOnce(new Error('No session'));
    vi.mocked(cricketApi.register).mockResolvedValueOnce({
      access_token: 'new-access-token-789',
      refresh_token: 'cookie-refresh-101',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 99,
        username: 'new_user',
        email: 'new@example.com',
        is_active: true,
        is_superuser: false,
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Trigger Register'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
      expect(screen.getByTestId('username')).toHaveTextContent('new_user');
      expect(getAccessToken()).toBe('new-access-token-789');
      expect(localStorage.getItem('cricbuzz_refresh_token')).toBeNull();
    });
  });

  it('logs out via API, revokes session, and clears in-memory access token', async () => {
    vi.mocked(cricketApi.refreshToken).mockRejectedValueOnce(new Error('No session'));
    vi.mocked(cricketApi.login).mockResolvedValueOnce({
      access_token: 'mock-access-token-123',
      refresh_token: 'cookie-refresh-456',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 42,
        username: 'test_user',
        email: 'test@example.com',
        is_active: true,
        is_superuser: false,
      },
    });
    vi.mocked(cricketApi.logout).mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Trigger Login'));
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in'));

    fireEvent.click(screen.getByText('Trigger Logout'));
    await waitFor(() => {
      expect(cricketApi.logout).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
      expect(localStorage.getItem('cricbuzz_refresh_token')).toBeNull();
      expect(getAccessToken()).toBeNull();
    });
  });

  it('redirects unauthenticated users in ProtectedRoute to login', async () => {
    vi.mocked(cricketApi.refreshToken).mockRejectedValueOnce(new Error('No session'));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
      expect(screen.queryByText('Secret Dashboard Content')).not.toBeInTheDocument();
    });
  });
});
