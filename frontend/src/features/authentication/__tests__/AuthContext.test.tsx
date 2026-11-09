import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../../../app/router/ProtectedRoute';
import { cricketApi, getAccessToken } from '../../../lib/api/client';

vi.mock('../../../lib/api/client', async () => {
  const actual = await vi.importActual('../../../lib/api/client');
  return {
    ...actual,
    cricketApi: {
      ...actual.cricketApi,
      login: vi.fn(),
      register: vi.fn(),
      refreshToken: vi.fn(),
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

  it('renders with initial logged-out state when no token is present', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
    expect(screen.getByTestId('username')).toHaveTextContent('none');
  });

  it('successfully logs in, saves tokens, and updates user state', async () => {
    vi.mocked(cricketApi.login).mockResolvedValueOnce({
      access_token: 'mock-access-token-123',
      refresh_token: 'mock-refresh-token-456',
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
      expect(localStorage.getItem('cricbuzz_refresh_token')).toBe('mock-refresh-token-456');
      expect(getAccessToken()).toBe('mock-access-token-123');
    });
  });

  it('successfully registers, saves tokens, and updates user state', async () => {
    vi.mocked(cricketApi.register).mockResolvedValueOnce({
      access_token: 'new-access-token-789',
      refresh_token: 'new-refresh-token-101',
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
      expect(localStorage.getItem('cricbuzz_refresh_token')).toBe('new-refresh-token-101');
    });
  });

  it('logs out and clears access and refresh tokens', async () => {
    vi.mocked(cricketApi.login).mockResolvedValueOnce({
      access_token: 'mock-access-token-123',
      refresh_token: 'mock-refresh-token-456',
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
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in'));

    fireEvent.click(screen.getByText('Trigger Logout'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
      expect(localStorage.getItem('cricbuzz_refresh_token')).toBeNull();
      expect(getAccessToken()).toBeNull();
    });
  });

  it('redirects unauthenticated users in ProtectedRoute to login', async () => {
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
