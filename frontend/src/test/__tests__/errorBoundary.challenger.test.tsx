import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// Helper throwing components
function CrashTrigger({
  shouldCrash = true,
  errorToThrow = new Error('Empirical Challenger Fault'),
}: {
  shouldCrash?: boolean;
  errorToThrow?: unknown;
}) {
  if (shouldCrash) {
    throw errorToThrow;
  }
  return <div data-testid="healthy-view">Operational Content</div>;
}

describe('Challenger Empirical ErrorBoundary Stress Suite', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress expected React boundary error outputs in test log
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Adversarial Throwable Types', () => {
    it('catches and displays standard Error with custom message', () => {
      render(
        <ErrorBoundary fallbackTitle="Standard Error Caught">
          <CrashTrigger errorToThrow={new Error('Specific domain crash')} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Standard Error Caught')).toBeInTheDocument();
      expect(screen.getByText(/Specific domain crash/)).toBeInTheDocument();
    });

    it('catches and displays TypeError and preserves error.name', () => {
      render(
        <ErrorBoundary>
          <CrashTrigger
            errorToThrow={new TypeError('Cannot read properties of null (reading "score")')}
          />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(
        screen.getByText(/TypeError: Cannot read properties of null/),
      ).toBeInTheDocument();
    });

    it('catches custom Error subclass instances with deep inheritance', () => {
      class CricketDataCorruptedError extends Error {
        public readonly code = 'CRICKET_DATA_CORRUPT';
        constructor(msg: string) {
          super(msg);
          this.name = 'CricketDataCorruptedError';
        }
      }

      render(
        <ErrorBoundary>
          <CrashTrigger
            errorToThrow={new CricketDataCorruptedError('Malformed ball-by-ball array')}
          />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(
        screen.getByText(/CricketDataCorruptedError: Malformed ball-by-ball array/),
      ).toBeInTheDocument();
    });

    it('handles Error with empty message gracefully without crashing', () => {
      render(
        <ErrorBoundary>
          <CrashTrigger errorToThrow={new Error('')} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Retry Loop & Persistent Fault Resilience', () => {
    it('remains resilient when "Try Again" is clicked but the fault persists', () => {
      let attempts = 0;
      const onReset = vi.fn();

      function PersistentCrashingParent() {
        return (
          <ErrorBoundary onReset={onReset}>
            <CrashTrigger
              shouldCrash={true}
              errorToThrow={new Error(`Persistent crash attempt ${++attempts}`)}
            />
          </ErrorBoundary>
        );
      }

      render(<PersistentCrashingParent />);

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(screen.getByText(/Persistent crash attempt/)).toBeInTheDocument();

      // Click "Try Again" 3 successive times
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onReset).toHaveBeenCalledTimes(1);
      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onReset).toHaveBeenCalledTimes(2);
      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(onReset).toHaveBeenCalledTimes(3);
      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(screen.queryByTestId('healthy-view')).not.toBeInTheDocument();
    });

    it('supports multiple sequential crash-and-recover cycles', () => {
      function FlappingComponent() {
        const [crash, setCrash] = useState(false);
        const [counter, setCounter] = useState(0);

        return (
          <div>
            <button
              data-testid="trigger-crash-btn"
              onClick={() => {
                setCounter((c) => c + 1);
                setCrash(true);
              }}
            >
              Trigger Crash
            </button>
            <ErrorBoundary onReset={() => setCrash(false)}>
              {crash ? (
                <CrashTrigger
                  shouldCrash={true}
                  errorToThrow={new Error(`Cycle ${counter} Crash`)}
                />
              ) : (
                <div data-testid="flapping-healthy">Cycle {counter} Healthy</div>
              )}
            </ErrorBoundary>
          </div>
        );
      }

      render(<FlappingComponent />);

      // Initial: Healthy cycle 0
      expect(screen.getByTestId('flapping-healthy')).toHaveTextContent('Cycle 0 Healthy');

      // Crash cycle 1
      fireEvent.click(screen.getByTestId('trigger-crash-btn'));
      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(screen.getByText(/Cycle 1 Crash/)).toBeInTheDocument();

      // Recover cycle 1
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(screen.getByTestId('flapping-healthy')).toHaveTextContent('Cycle 1 Healthy');
      expect(screen.queryByText('CRITICAL RENDER FAULT')).not.toBeInTheDocument();

      // Crash cycle 2
      fireEvent.click(screen.getByTestId('trigger-crash-btn'));
      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(screen.getByText(/Cycle 2 Crash/)).toBeInTheDocument();

      // Recover cycle 2
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(screen.getByTestId('flapping-healthy')).toHaveTextContent('Cycle 2 Healthy');
    });
  });

  describe('resetKeys Mutation & Edge Case Stress', () => {
    it('detects value change in mixed-type resetKeys array', () => {
      let resetCalled = false;

      const { rerender } = render(
        <ErrorBoundary
          resetKeys={[101, 'match-active', true, null]}
          onReset={() => {
            resetCalled = true;
          }}
        >
          <CrashTrigger shouldCrash={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

      // Rerender with changed key value at index 1 ('match-active' -> 'match-completed')
      rerender(
        <ErrorBoundary
          resetKeys={[101, 'match-completed', true, null]}
          onReset={() => {
            resetCalled = true;
          }}
        >
          <CrashTrigger shouldCrash={false} />
        </ErrorBoundary>,
      );

      expect(resetCalled).toBe(true);
      expect(screen.getByTestId('healthy-view')).toBeInTheDocument();
      expect(screen.queryByText('CRITICAL RENDER FAULT')).not.toBeInTheDocument();
    });

    it('detects array element reordering as a key change', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['alpha', 'beta']}>
          <CrashTrigger shouldCrash={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

      // Rerender with reversed keys: ['beta', 'alpha']
      rerender(
        <ErrorBoundary resetKeys={['beta', 'alpha']}>
          <CrashTrigger shouldCrash={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId('healthy-view')).toBeInTheDocument();
    });

    it('detects array length expansion (additional key)', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['match-1']}>
          <CrashTrigger shouldCrash={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

      // Expand keys from 1 to 2 elements
      rerender(
        <ErrorBoundary resetKeys={['match-1', 'tab-scorecard']}>
          <CrashTrigger shouldCrash={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId('healthy-view')).toBeInTheDocument();
    });

    it('detects array length reduction (removed key)', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['match-1', 'tab-scorecard']}>
          <CrashTrigger shouldCrash={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

      // Shrink keys from 2 to 1 element
      rerender(
        <ErrorBoundary resetKeys={['match-1']}>
          <CrashTrigger shouldCrash={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId('healthy-view')).toBeInTheDocument();
    });

    it('does NOT reset when resetKeys remains identical across unrelated parent rerenders', () => {
      const onReset = vi.fn();

      const { rerender } = render(
        <ErrorBoundary resetKeys={['fixed-key', 42]} onReset={onReset}>
          <CrashTrigger shouldCrash={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

      // Rerender with identical keys
      rerender(
        <ErrorBoundary resetKeys={['fixed-key', 42]} onReset={onReset}>
          <CrashTrigger shouldCrash={false} />
        </ErrorBoundary>,
      );

      // Should STILL show error fallback because keys did not change
      expect(onReset).not.toHaveBeenCalled();
      expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
      expect(screen.queryByTestId('healthy-view')).not.toBeInTheDocument();
    });
  });

  describe('Nested Error Boundaries & Isolation', () => {
    it('confines route crash to inner boundary without crashing outer layout boundary', () => {
      render(
        <ErrorBoundary fallbackTitle="Outer Application Fault">
          <div data-testid="outer-shell">
            <header data-testid="outer-header">Global Navigation Bar</header>
            <main>
              <ErrorBoundary fallbackTitle="Inner Route Fault">
                <CrashTrigger
                  shouldCrash={true}
                  errorToThrow={new Error('Crash in Match Center Tab')}
                />
              </ErrorBoundary>
            </main>
          </div>
        </ErrorBoundary>,
      );

      // Global navigation is still healthy
      expect(screen.getByTestId('outer-header')).toHaveTextContent('Global Navigation Bar');
      // Outer fallback is NOT rendered
      expect(screen.queryByText('Outer Application Fault')).not.toBeInTheDocument();
      // Inner fallback IS rendered
      expect(screen.getByText('Inner Route Fault')).toBeInTheDocument();
      expect(screen.getByText(/Crash in Match Center Tab/)).toBeInTheDocument();
    });

    it('outer boundary catches if error occurs outside inner boundary', () => {
      render(
        <ErrorBoundary fallbackTitle="Outer Application Fault">
          <CrashTrigger
            shouldCrash={true}
            errorToThrow={new Error('Header crash outside route')}
          />
          <ErrorBoundary fallbackTitle="Inner Route Fault">
            <div data-testid="inner-content">Route content</div>
          </ErrorBoundary>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Outer Application Fault')).toBeInTheDocument();
      expect(screen.queryByText('Inner Route Fault')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inner-content')).not.toBeInTheDocument();
    });
  });

  describe('App Route Navigation Isolation Stress Test', () => {
    it('demonstrates that un-keyed route ErrorBoundaries (as configured in App.tsx) retain error state across route navigation', () => {
      // Exactly mimics App.tsx where routes have <ErrorBoundary fallbackTitle="..."> without keys or resetKeys
      function AppWithoutRouteKeys() {
        return (
          <MemoryRouter initialEntries={['/crash']}>
            <ErrorBoundary fallbackTitle="Global App Boundary">
              <nav data-testid="app-navbar">
                <Link to="/">Home Link</Link>
                <Link to="/crash">Crash Link</Link>
              </nav>
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary fallbackTitle="Home Route Boundary">
                      <div data-testid="home-page">Welcome to Cricbuzz Home</div>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crash"
                  element={
                    <ErrorBoundary fallbackTitle="Crashing Route Boundary">
                      <CrashTrigger
                        shouldCrash={true}
                        errorToThrow={new Error('Match ID Not Found Crash')}
                      />
                    </ErrorBoundary>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </MemoryRouter>
        );
      }

      render(<AppWithoutRouteKeys />);

      // On /crash: Navbar is visible, Crashing Route Boundary is displayed
      expect(screen.getByTestId('app-navbar')).toBeInTheDocument();
      expect(screen.getByText('Crashing Route Boundary')).toBeInTheDocument();

      // Navigate to / (Home)
      fireEvent.click(screen.getByRole('link', { name: 'Home Link' }));

      // EMPIRICAL FINDING: Because ErrorBoundary has no key or resetKeys tied to location/route,
      // React preserves the component instance in its errored state!
      // Instead of home-page, the boundary displays Home Route Boundary with the previous error!
      expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
      expect(screen.getByText('Home Route Boundary')).toBeInTheDocument();
    });

    it('proves that adding a unique key to each route ErrorBoundary completely resolves navigation isolation', () => {
      // Proves the required mitigation: keys on ErrorBoundary per route
      function AppWithRouteKeys() {
        return (
          <MemoryRouter initialEntries={['/crash']}>
            <ErrorBoundary fallbackTitle="Global App Boundary">
              <nav data-testid="app-navbar">
                <Link to="/">Home Link</Link>
                <Link to="/crash">Crash Link</Link>
              </nav>
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary key="home" fallbackTitle="Home Route Boundary">
                      <div data-testid="home-page">Welcome to Cricbuzz Home</div>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crash"
                  element={
                    <ErrorBoundary key="crash" fallbackTitle="Crashing Route Boundary">
                      <CrashTrigger
                        shouldCrash={true}
                        errorToThrow={new Error('Match ID Not Found Crash')}
                      />
                    </ErrorBoundary>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </MemoryRouter>
        );
      }

      render(<AppWithRouteKeys />);

      // On /crash: Crashing Route Boundary is displayed
      expect(screen.getByText('Crashing Route Boundary')).toBeInTheDocument();

      // Navigate to / (Home)
      fireEvent.click(screen.getByRole('link', { name: 'Home Link' }));

      // With keys: Clean unmount & remount, home page renders perfectly!
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
      expect(screen.queryByText('Crashing Route Boundary')).not.toBeInTheDocument();
      expect(screen.queryByText('Home Route Boundary')).not.toBeInTheDocument();
    });
  });

  describe('Custom Fallback Render Prop Integration', () => {
    it('passes error, errorInfo, and resetErrorBoundary to render prop', () => {
      let capturedProps: unknown = null;

      render(
        <ErrorBoundary
          fallback={(props) => {
            capturedProps = props;
            return (
              <div data-testid="prop-fallback">
                <button type="button" onClick={props.resetErrorBoundary}>
                  Reset
                </button>
              </div>
            );
          }}
        >
          <CrashTrigger
            shouldCrash={true}
            errorToThrow={new RangeError('Out of bounds index')}
          />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId('prop-fallback')).toBeInTheDocument();
      expect(capturedProps).toBeDefined();

      const props = capturedProps as {
        error: Error;
        errorInfo: { componentStack?: string } | null;
        resetErrorBoundary: () => void;
      };

      expect(props.error).toBeInstanceOf(RangeError);
      expect(props.error.message).toBe('Out of bounds index');
      expect(typeof props.resetErrorBoundary).toBe('function');
      expect(props.errorInfo).not.toBeNull();
      expect(typeof props.errorInfo?.componentStack).toBe('string');
    });
  });
});
