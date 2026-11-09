import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    const variantClasses = {
      primary:
        'bg-[#0070f3] hover:bg-blue-600 text-white shadow-md shadow-blue-900/30 border border-blue-400/20 focus:ring-blue-500',
      secondary:
        'bg-[#21262d] hover:bg-[#30363d] text-slate-100 border border-[#30363d] focus:ring-slate-500',
      outline:
        'bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-500 focus:ring-slate-400',
      ghost:
        'bg-transparent hover:bg-slate-800/70 text-slate-300 hover:text-white border border-transparent focus:ring-slate-500',
      destructive:
        'bg-[#ea0029] hover:bg-rose-700 text-white shadow-md shadow-rose-950/40 border border-rose-500/30 focus:ring-rose-500',
      accent:
        'bg-[#10b981] hover:bg-emerald-600 text-white shadow-md shadow-emerald-950/30 border border-emerald-400/30 focus:ring-emerald-500',
    }[variant];

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-xs lg:text-sm gap-2',
      lg: 'px-5 py-2.5 text-sm lg:text-base gap-2.5',
      icon: 'p-2 w-9 h-9',
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
