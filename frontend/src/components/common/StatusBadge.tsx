import React from 'react';
import { Award, Clock, Flame, Radio } from 'lucide-react';
import type { MatchStatus } from '../../types/cricket';

export interface StatusBadgeProps {
  status: MatchStatus;
  className?: string;
  showDotOnly?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  showDotOnly = false,
}) => {
  switch (status) {
    case 'live':
      if (showDotOnly) {
        return (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea0029] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ea0029]"></span>
          </span>
        );
      }
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#ea0029]/15 text-[#ff4d6d] border border-[#ea0029]/40 rounded ${className}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea0029] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ea0029]"></span>
          </span>
          <Radio className="w-3 h-3 text-[#ea0029]" />
          LIVE
        </span>
      );
    case 'innings_break':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-400" />
          INNINGS BREAK
        </span>
      );
    case 'completed':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full ${className}`}
        >
          <Award className="w-3 h-3 text-emerald-400" />
          FINISHED
        </span>
      );
    case 'toss_done':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-full ${className}`}
        >
          <Flame className="w-3 h-3 text-sky-400" />
          TOSS DONE
        </span>
      );
    case 'abandoned':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-slate-700/30 text-slate-400 border border-slate-600/30 rounded-full ${className}`}
        >
          ABANDONED
        </span>
      );
    case 'scheduled':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 rounded-full ${className}`}
        >
          UPCOMING
        </span>
      );
  }
};
