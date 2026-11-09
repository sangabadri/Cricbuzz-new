import React from 'react';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-800/60 border border-slate-700/30 ${className}`}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="pt-2 flex items-center justify-between border-t border-[#21262d]">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
};
