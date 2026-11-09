import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#21262d] mb-6">
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-slate-200 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-slate-400">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
