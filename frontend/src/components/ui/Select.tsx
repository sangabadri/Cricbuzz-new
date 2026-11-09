import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-bold text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={`w-full bg-[#0d1117] border rounded-xl py-2 pl-3 pr-8 text-xs lg:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:bg-slate-900 ${
              error ? 'border-rose-500 focus:ring-rose-500' : 'border-[#30363d] hover:border-slate-600'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-[#161b22] text-slate-500">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#161b22] text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
