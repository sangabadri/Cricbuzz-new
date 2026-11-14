import React from 'react';
import { ArrowLeftRight, RotateCcw } from 'lucide-react';
import { BallBubble } from '../../common/BallBubble';
import type { LiveScorerStateResponse } from '../../../types/cricket';

export interface CreaseRecentRibbonProps {
  scorerState: LiveScorerStateResponse;
  onSwapStrike: () => void;
  onUndoBall: () => void;
  isUndoPending?: boolean;
  isSwapStrikePending?: boolean;
}

export const CreaseRecentRibbon: React.FC<CreaseRecentRibbonProps> = ({
  scorerState,
  onSwapStrike,
  onUndoBall,
  isUndoPending = false,
  isSwapStrikePending = false,
}) => {
  return (
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
  );
};
