import React from 'react';
import { ArrowLeftRight, RotateCcw, Target, UserCheck, Users } from 'lucide-react';
import { BallBubble } from '../common/BallBubble';
import type { LiveMatchResponse, LiveScorerStateResponse } from '../../types/cricket';

export interface CreaseHudProps {
  scorerState: LiveScorerStateResponse;
  onSwapStrike: () => void;
  onChangeBowler: () => void;
  onUndoBall: () => void;
  isUndoPending?: boolean;
  isSwapStrikePending?: boolean;
  liveTicker?: LiveMatchResponse;
}

export const CreaseHud: React.FC<CreaseHudProps> = ({
  scorerState,
  onSwapStrike,
  onChangeBowler,
  onUndoBall,
  isUndoPending = false,
  isSwapStrikePending = false,
  liveTicker,
}) => {
  const strikerSr =
    scorerState.striker_balls && scorerState.striker_balls > 0
      ? (((scorerState.striker_runs ?? 0) / scorerState.striker_balls) * 100).toFixed(1)
      : '0.0';

  const nonStrikerSr =
    scorerState.non_striker_balls && scorerState.non_striker_balls > 0
      ? (((scorerState.non_striker_runs ?? 0) / scorerState.non_striker_balls) * 100).toFixed(1)
      : '0.0';

  const isTickerMatchingInnings =
    !liveTicker?.current_innings_number ||
    liveTicker.current_innings_number === scorerState.innings_number;

  const isStrikerTickerMatch =
    isTickerMatchingInnings &&
    liveTicker?.striker &&
    liveTicker.striker.player_id === scorerState.striker_id;
  const isNonStrikerTickerMatch =
    isTickerMatchingInnings &&
    liveTicker?.non_striker &&
    liveTicker.non_striker.player_id === scorerState.non_striker_id;
  const isBowlerTickerMatch =
    isTickerMatchingInnings &&
    liveTicker?.current_bowler &&
    liveTicker.current_bowler.player_id === scorerState.current_bowler_id;

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 shadow-xl space-y-5">
      {/* Top Broadcast Score & Status Strip */}
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

      {/* Crease Positions: Striker, Non-Striker, Bowler Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Striker Card */}
        <div className="p-4 rounded-xl bg-[#12161f] border-2 border-blue-500/70 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-500/20">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              🏏 On Strike
            </span>
            <span className="text-[10px] font-mono text-slate-400">SR: {strikerSr}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="pr-2">
              <h4 className="font-extrabold text-white text-base truncate">
                {scorerState.striker_name || 'Striker'}
              </h4>
              <div className="flex flex-col text-[11px] text-slate-400 font-mono">
                <span>{scorerState.striker_balls ?? 0} balls faced</span>
                {isStrikerTickerMatch && (
                  <span className="text-[10px] text-slate-500">
                    {liveTicker.striker!.fours}×4, {liveTicker.striker!.sixes}×6
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="font-score text-3xl font-black text-white tabular-nums">
                {scorerState.striker_runs ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">runs</span>
            </div>
          </div>
        </div>

        {/* Non-Striker Card */}
        <div className="p-4 rounded-xl bg-[#12161f] border border-[#21262d] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#21262d]">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <UserCheck className="w-3 h-3 text-slate-400" />
              Non-Striker
            </span>
            <span className="text-[10px] font-mono text-slate-500">SR: {nonStrikerSr}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="pr-2">
              <h4 className="font-bold text-slate-200 text-base truncate">
                {scorerState.non_striker_name || 'Non-Striker'}
              </h4>
              <div className="flex flex-col text-[11px] text-slate-400 font-mono">
                <span>{scorerState.non_striker_balls ?? 0} balls faced</span>
                {isNonStrikerTickerMatch && (
                  <span className="text-[10px] text-slate-500">
                    {liveTicker.non_striker!.fours}×4, {liveTicker.non_striker!.sixes}×6
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="font-score text-2xl font-black text-slate-300 tabular-nums">
                {scorerState.non_striker_runs ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">runs</span>
            </div>
          </div>
        </div>

        {/* Bowler Card */}
        <div className="p-4 rounded-xl bg-[#12161f] border border-[#21262d] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#21262d]">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Active Bowler
            </span>
            <button
              onClick={onChangeBowler}
              className="text-[10px] font-bold uppercase text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3 h-3" /> Change
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="pr-2">
              <h4 className="font-bold text-white text-base truncate">
                {scorerState.current_bowler_name || 'Bowler'}
              </h4>
              <div className="flex flex-col text-[11px] text-slate-400 font-mono">
                <span>{scorerState.current_bowler_overs ?? '0.0'} ov</span>
                {isBowlerTickerMatch && (
                  <span className="text-[10px] text-slate-500">
                    Econ: {liveTicker.current_bowler!.economy != null ? liveTicker.current_bowler!.economy.toFixed(2) : '-'} • {liveTicker.current_bowler!.maidens}m
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="font-score text-2xl font-black text-rose-400 tabular-nums">
                {scorerState.current_bowler_wickets ?? 0}
                <span className="text-slate-400 text-lg font-bold">/</span>
                <span className="text-white">{scorerState.current_bowler_runs ?? 0}</span>
              </span>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">fig</span>
            </div>
          </div>
        </div>
      </div>

      {/* Over Progression Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Recent:
          </span>
          {scorerState.current_over_balls.length === 0 ? (
            <span className="text-xs text-slate-500 italic">Starting new over...</span>
          ) : (
            scorerState.current_over_balls.map((b, i) => (
              <BallBubble key={i} ball={b} size="sm" animate={i === scorerState.current_over_balls.length - 1} />
            ))
          )}
        </div>

        {/* Quick adjustments */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSwapStrike}
            disabled={isSwapStrikePending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12161f] hover:bg-[#21262d] active:scale-95 text-slate-200 text-xs font-bold rounded-lg border border-[#21262d] transition-all disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeftRight className="w-3 h-3 text-sky-400" />
            Swap Strike
          </button>

          <button
            onClick={onUndoBall}
            disabled={isUndoPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12161f] hover:bg-[#21262d] active:scale-95 text-slate-200 text-xs font-bold rounded-lg border border-[#21262d] transition-all disabled:opacity-40 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            Undo
          </button>
        </div>
      </div>
    </div>
  );
};
