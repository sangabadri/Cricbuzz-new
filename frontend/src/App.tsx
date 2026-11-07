import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Home } from './pages/Home';
import { MatchCenter } from './pages/MatchCenter';
import { ScorerConsole } from './pages/ScorerConsole';
import { SetupWizard } from './pages/SetupWizard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2000,
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1 pb-16">
              <ErrorBoundary fallbackTitle="Application Error">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ErrorBoundary key="fixtures" fallbackTitle="Fixtures Feed Error">
                        <Home />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/matches/:id"
                    element={
                      <ErrorBoundary key="match-center" fallbackTitle="Match Center Error">
                        <MatchCenter />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/matches/:id/score"
                    element={
                      <ErrorBoundary key="scorer" fallbackTitle="Scorer Console Error">
                        <ScorerConsole />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/setup"
                    element={
                      <ErrorBoundary key="setup" fallbackTitle="Setup Wizard Error">
                        <SetupWizard />
                      </ErrorBoundary>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
