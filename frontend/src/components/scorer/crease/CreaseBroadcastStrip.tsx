import React from 'react';
import { Target } from 'lucide-react';
import type { LiveScorerStateResponse } from '../../../types/cricket';

export interface CreaseBroadcastStripProps {
  scorerState: LiveScorerStateResponse;
}

export const CreaseBroadcastStrip: React.FC<CreaseBroadcastStripProps> = ({ scorerState }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#21262d] pb-4">
      <div>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
          Innings {scorerState.innings_number} • Live Match Engine
        </span>
        <div className="flex items-baseline gap-3">
          <span className="font-score text-4xl lg:text-5xl font-black text-white tabular-nums tracking-tight">
            {scorerState.total_runs}
            <span className="text-slate-400 text-3xl font-bold">/</span>
            {scorerState.total_wickets}
          </span>
          <span className="font-score text-base lg:text-lg font-bold text-slate-300 tabular-nums">
            ({scorerState.overs_display} ov)
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#12161f] border border-[#21262d] text-xs font-mono text-sky-400">
            <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">CRR</span>{' '}
            {scorerState.current_run_rate?.toFixed(2) ?? '0.00'}
          </div>
        </div>
      </div>

      {scorerState.target && (
        <div className="bg-[#12161f] px-4 py-2 rounded-xl border border-amber-500/30 text-left sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center sm:justify-end gap-1">
            <Target className="w-3 h-3 text-amber-400" /> Target {scorerState.target}
          </span>
          <p className="text-xs font-extrabold text-white mt-0.5 tabular-nums">
            Need <span className="text-amber-400 font-score text-sm">{scorerState.runs_needed}</span> runs from{' '}
            <span className="text-amber-400 font-score text-sm">{scorerState.balls_remaining}</span> balls
          </p>
          {scorerState.required_run_rate && (
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              RRR: {scorerState.required_run_rate.toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
