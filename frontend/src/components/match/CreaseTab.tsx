import React from 'react';
import { Activity, Users } from 'lucide-react';
import type { LiveBatter, LiveMatchResponse } from '../../types/cricket';
import { BallBubble } from '../common/BallBubble';

export interface CreaseTabProps {
  ticker: LiveMatchResponse;
  className?: string;
}

const formatStrikeRate = (batter?: LiveBatter | null): string => {
  if (!batter) return '0.0';
  if (batter.strike_rate !== undefined && batter.strike_rate !== null) {
    return batter.strike_rate.toFixed(1);
  }
  if (batter.balls > 0) {
    return ((batter.runs / batter.balls) * 100).toFixed(1);
  }
  return '0.0';
};

export const CreaseTab: React.FC<CreaseTabProps> = ({ ticker, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {/* Batters at Crease Box */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 lg:p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-[#21262d] pb-2.5">
          <Users className="w-3.5 h-3.5 text-sky-400" />
          Batters at the Crease
        </h3>

        <div className="space-y-2.5">
          {/* Striker */}
          <div className="p-3.5 rounded-xl bg-[#12161f] border-2 border-blue-500/70 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">
                  {ticker.striker?.name || 'Striker'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  🏏 ON STRIKE
                </span>
              </div>
              <span className="bg-[#161b22] px-2 py-0.5 rounded font-mono font-bold text-sky-400 text-xs border border-[#21262d]">
                SR: {formatStrikeRate(ticker.striker)}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-2">
                <span className="font-score text-3xl font-black text-white tabular-nums">
                  {ticker.striker?.runs ?? 0}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  ({ticker.striker?.balls ?? 0}b)
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <span className="text-sky-400 font-semibold">{ticker.striker?.fours ?? 0}x4</span>
                <span className="text-emerald-400 font-bold">{ticker.striker?.sixes ?? 0}x6</span>
              </div>
            </div>
          </div>

          {/* Non-Striker */}
          <div className="p-3.5 rounded-xl bg-[#12161f] border border-[#21262d] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200 text-sm">
                  {ticker.non_striker?.name || 'Non-striker'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono uppercase bg-[#161b22] px-2 py-0.5 rounded border border-[#21262d]">
                  NON-STRIKER
                </span>
              </div>
              <span className="bg-[#161b22] px-2 py-0.5 rounded font-mono font-bold text-slate-300 text-xs border border-[#21262d]">
                SR: {formatStrikeRate(ticker.non_striker)}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-2">
                <span className="font-score text-2xl font-black text-slate-200 tabular-nums">
                  {ticker.non_striker?.runs ?? 0}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  ({ticker.non_striker?.balls ?? 0}b)
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <span className="text-sky-400/80 font-semibold">{ticker.non_striker?.fours ?? 0}x4</span>
                <span className="text-emerald-400/80 font-bold">{ticker.non_striker?.sixes ?? 0}x6</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Bowler Figures */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 lg:p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-[#21262d] pb-2.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          Active Bowler & Over Breakdown
        </h3>

        <div className="p-3.5 rounded-xl bg-[#12161f] border border-[#21262d] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                {ticker.current_bowler?.name || 'Bowler'}
              </span>
              <span className="text-[10px] text-sky-400 uppercase font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                BOWLING
              </span>
            </div>

            {/* 5-Metric Bowler Ribbon: O, M, R, W, ECON */}
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              <div>
                O: <strong className="text-white font-mono">{ticker.current_bowler?.overs?.completed_overs ?? 0}.{ticker.current_bowler?.overs?.balls ?? 0}</strong>
              </div>
              <div>
                M: <strong className="text-slate-300 font-mono">{ticker.current_bowler?.maidens ?? 0}</strong>
              </div>
              <div>
                R: <strong className="text-white font-mono">{ticker.current_bowler?.runs ?? 0}</strong>
              </div>
              <div>
                W: <strong className="text-rose-400 font-score font-bold text-base">{ticker.current_bowler?.wickets ?? 0}</strong>
              </div>
              <div className="border-l border-[#21262d] pl-3">
                ECON: <strong className="text-sky-400 font-mono">{ticker.current_bowler?.economy ? ticker.current_bowler.economy.toFixed(2) : '-'}</strong>
              </div>
            </div>
          </div>

          {/* Over Progress Balls */}
          <div className="pt-2 border-t border-[#21262d]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Current Over Deliveries:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {ticker.current_over_balls.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Starting new over...</span>
              ) : (
                ticker.current_over_balls.map((b, idx) => (
                  <BallBubble key={idx} ball={b} size="md" />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
