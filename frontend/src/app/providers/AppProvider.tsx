import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../components/common/Toast';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { AuthProvider } from '../../features/authentication/context/AuthContext';

// oxlint-disable-next-line react/only-export-components
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2000,
      refetchOnWindowFocus: true,
    },
  },
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary fallbackTitle="Application Error">
              {children}
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
