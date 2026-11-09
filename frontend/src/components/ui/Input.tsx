import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-slate-400 pointer-events-none shrink-0">{leftIcon}</span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-[#0d1117] border rounded-xl py-2 px-3 text-xs lg:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:bg-slate-900 ${
              leftIcon ? 'pl-9' : ''
            } ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-[#30363d] hover:border-slate-600'} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-400">{error}</p>}
        {!error && helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
