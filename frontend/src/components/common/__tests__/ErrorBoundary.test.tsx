import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ErrorBoundary } from '../ErrorBoundary';

function Bomb({
  shouldThrow = true,
  message = 'Simulated crash',
}: {
  shouldThrow?: boolean;
  message?: string;
}) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Safe Child Component</div>;
}

describe('ErrorBoundary Component', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress React boundary console.error outputs during intentional crash tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children normally when no exception is thrown', () => {
    render(
      <ErrorBoundary>
        <div>Smooth Play Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Smooth Play Content')).toBeInTheDocument();
    expect(screen.queryByText(/critical render fault/i)).not.toBeInTheDocument();
  });

  it('catches uncaught throw during render and renders default athletic fallback UI', () => {
    render(
      <ErrorBoundary>
        <Bomb message="Uncaught boundary failure" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /an unexpected runtime error interrupted the cricket dashboard/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /return to fixtures/i }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('button', { name: /reload page/i }),
    ).toBeInTheDocument();
  });

  it('renders custom fallbackTitle and fallbackMessage when provided', () => {
    render(
      <ErrorBoundary
        fallbackTitle="Match Center Stream Fault"
        fallbackMessage="Broadcast feed connection lost during crease rendering."
      >
        <Bomb />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Match Center Stream Fault' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Broadcast feed connection lost during crease rendering.',
      ),
    ).toBeInTheDocument();
  });

  it('triggers onError callback with error object and componentStack information', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Bomb message="Diagnostic stack error" />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [caughtError, errorInfo] = onError.mock.calls[0];
    expect(caughtError).toBeInstanceOf(Error);
    expect(caughtError.message).toBe('Diagnostic stack error');
    expect(errorInfo).toBeDefined();
    expect(typeof errorInfo.componentStack).toBe('string');
  });

  it('recovers when "Try Again" is clicked and error condition is cleared', () => {
    const onReset = vi.fn();

    function RecoverableParent() {
      const [hasError, setHasError] = useState(true);

      return (
        <ErrorBoundary
          onReset={() => {
            onReset();
            setHasError(false);
          }}
        >
          {hasError ? (
            <Bomb message="Temporary glitch" />
          ) : (
            <div>Restored Healthy View</div>
          )}
        </ErrorBoundary>
      );
    }

    render(<RecoverableParent />);

    expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
    expect(screen.queryByText('Restored Healthy View')).not.toBeInTheDocument();

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainBtn);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Restored Healthy View')).toBeInTheDocument();
    expect(screen.queryByText('CRITICAL RENDER FAULT')).not.toBeInTheDocument();
  });

  it('automatically recovers when resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['match-123']}>
        <Bomb shouldThrow={true} message="Initial Match Crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();

    // Rerender with the SAME resetKey and healthy child -> boundary still holds error state
    rerender(
      <ErrorBoundary resetKeys={['match-123']}>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('CRITICAL RENDER FAULT')).toBeInTheDocument();
    expect(screen.queryByText('Safe Child Component')).not.toBeInTheDocument();

    // Rerender with CHANGED resetKey -> boundary automatically recovers
    rerender(
      <ErrorBoundary resetKeys={['match-456']}>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.queryByText('CRITICAL RENDER FAULT')).not.toBeInTheDocument();
    expect(screen.getByText('Safe Child Component')).toBeInTheDocument();
  });

  it('renders custom fallback render prop function receiving error and reset method', () => {
    const customFallback = vi.fn(
      ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
        <div data-testid="custom-prop-fallback">
          <span>Custom Message: {error.message}</span>
          <button type="button" onClick={resetErrorBoundary}>
            Custom Reset Button
          </button>
        </div>
      ),
    );

    function StatefulTest() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary
          fallback={customFallback}
          onReset={() => setShouldThrow(false)}
        >
          <Bomb shouldThrow={shouldThrow} message="Prop render exception" />
        </ErrorBoundary>
      );
    }

    render(<StatefulTest />);

    expect(screen.getByTestId('custom-prop-fallback')).toBeInTheDocument();
    expect(
      screen.getByText('Custom Message: Prop render exception'),
    ).toBeInTheDocument();
    expect(customFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        resetErrorBoundary: expect.any(Function),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /custom reset button/i }));

    expect(screen.queryByTestId('custom-prop-fallback')).not.toBeInTheDocument();
    expect(screen.getByText('Safe Child Component')).toBeInTheDocument();
  });

  it('renders static ReactNode fallback when fallback is not a function', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="static-node">Static Error Widget</div>}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('static-node')).toBeInTheDocument();
    expect(screen.getByText('Static Error Widget')).toBeInTheDocument();
    expect(screen.queryByText('CRITICAL RENDER FAULT')).not.toBeInTheDocument();
  });

  it('renders collapsible diagnostics section containing error message and stack trace', () => {
    render(
      <ErrorBoundary>
        <Bomb message="Diagnostic details verification" />
      </ErrorBoundary>,
    );

    const diagnosticsDetails = screen.getByText('▸ Show Error Diagnostics');
    expect(diagnosticsDetails).toBeInTheDocument();
    expect(
      screen.getByText(/Error: Diagnostic details verification/),
    ).toBeInTheDocument();
  });

  it('triggers window.location.reload when "Reload Page" button is clicked', () => {
    const originalLocation = window.location;
    const reloadMock = vi.fn();

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: reloadMock,
      },
    });

    render(
      <ErrorBoundary>
        <Bomb message="Reload test" />
      </ErrorBoundary>,
    );

    const reloadBtn = screen.getByRole('button', { name: /reload page/i });
    fireEvent.click(reloadBtn);

    expect(reloadMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('isolates route crashes and unmounts error state when route keys change during navigation', () => {
    function RouteApp() {
      return (
        <MemoryRouter initialEntries={['/matches/1']}>
          <nav>
            <Link to="/">Fixtures</Link>
            <Link to="/matches/1">Match 1</Link>
          </nav>
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary key="fixtures" fallbackTitle="Fixtures Feed Error">
                  <div data-testid="fixtures-page">Fixtures List</div>
                </ErrorBoundary>
              }
            />
            <Route
              path="/matches/:id"
              element={
                <ErrorBoundary key="match-center" fallbackTitle="Match Center Error">
                  <Bomb message="Corrupted match data" />
                </ErrorBoundary>
              }
            />
          </Routes>
        </MemoryRouter>
      );
    }

    render(<RouteApp />);

    expect(screen.getByText('Match Center Error')).toBeInTheDocument();
    expect(screen.queryByTestId('fixtures-page')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Fixtures' }));

    expect(screen.getByTestId('fixtures-page')).toBeInTheDocument();
    expect(screen.queryByText('Match Center Error')).not.toBeInTheDocument();
    expect(screen.queryByText('Fixtures Feed Error')).not.toBeInTheDocument();
  });
});
