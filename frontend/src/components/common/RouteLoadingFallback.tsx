import React from 'react';

export const RouteLoadingFallback: React.FC = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] w-full items-center justify-center p-8"
    >
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
          aria-hidden="true"
        />
        <span className="text-sm font-medium">Loading view...</span>
      </div>
    </div>
  );
};
