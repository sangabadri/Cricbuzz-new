import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw, RotateCcw } from 'lucide-react';

export interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  public override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys ?? [];
      const currentKeys = this.props.resetKeys;
      const keysChanged =
        prevKeys.length !== currentKeys.length ||
        currentKeys.some((key, idx) => key !== prevKeys[idx]);

      if (keysChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  public resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public override render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, fallbackTitle, fallbackMessage } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback({
          error,
          errorInfo,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div className="max-w-2xl mx-auto my-12 p-6 lg:p-8 bg-[#161b22] border border-rose-500/30 rounded-2xl shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-[#ea0029]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-[#ff4d6d] text-[10px] font-black uppercase tracking-wider">
              <span>CRITICAL RENDER FAULT</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight">
              {fallbackTitle || 'Something went wrong'}
            </h2>
            <p className="text-slate-400 text-xs lg:text-sm max-w-md mx-auto leading-relaxed">
              {fallbackMessage ||
                'An unexpected runtime error interrupted the cricket dashboard. You can retry the operation, reload, or return to fixtures.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.resetErrorBoundary}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>

            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] active:scale-95 text-slate-200 font-bold text-xs rounded-xl border border-[#30363d] transition-all"
            >
              <Home className="w-3.5 h-3.5 text-sky-400" />
              <span>Return to Fixtures</span>
            </a>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#12161f] hover:bg-[#21262d] active:scale-95 text-slate-400 hover:text-white font-medium text-xs rounded-xl border border-[#21262d] transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>
          </div>

          {/* Technical Diagnostics */}
          <details className="mt-4 text-left border-t border-[#21262d] pt-4 group">
            <summary className="text-[11px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer select-none">
              ▸ Show Error Diagnostics
            </summary>
            <div className="mt-3 p-3.5 rounded-xl bg-[#0d1117] border border-[#21262d] text-rose-300 font-mono text-[11px] overflow-x-auto max-h-48 space-y-2">
              <div className="font-bold">{error.name}: {error.message}</div>
              {errorInfo?.componentStack && (
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap font-mono">
                  {errorInfo.componentStack.trim()}
                </pre>
              )}
            </div>
          </details>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
