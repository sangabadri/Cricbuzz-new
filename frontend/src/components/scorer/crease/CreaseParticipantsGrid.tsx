import React from 'react';
import { UserCheck, Users } from 'lucide-react';
import type { LiveMatchResponse, LiveScorerStateResponse } from '../../../types/cricket';

export interface CreaseParticipantsGridProps {
  scorerState: LiveScorerStateResponse;
  onChangeBowler: () => void;
  liveTicker?: LiveMatchResponse;
}

export const CreaseParticipantsGrid: React.FC<CreaseParticipantsGridProps> = ({
  scorerState,
  onChangeBowler,
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
  );
};
