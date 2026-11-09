import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variantClasses = {
    default: 'bg-slate-800 text-slate-200 border-slate-700',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    destructive: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    outline: 'bg-transparent text-slate-300 border-slate-700',
  }[variant];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-bold tracking-wider',
    md: 'text-xs px-2.5 py-1 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border uppercase ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
