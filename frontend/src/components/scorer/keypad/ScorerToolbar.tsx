import React from 'react';
import { ArrowLeftRight, RotateCcw } from 'lucide-react';

export interface ScorerToolbarProps {
  onSwapStrike?: () => void;
  onUndo?: () => void;
  disabled?: boolean;
  isSwappingStrike?: boolean;
  isUndoing?: boolean;
}

export const ScorerToolbar: React.FC<ScorerToolbarProps> = ({
  onSwapStrike,
  onUndo,
  disabled = false,
  isSwappingStrike = false,
  isUndoing = false,
}) => {
  if (!onSwapStrike && !onUndo) return null;

  return (
    <div className="flex items-center justify-between pt-2 border-t border-[#21262d]">
      {onSwapStrike && (
        <button
          onClick={onSwapStrike}
          disabled={disabled || isSwappingStrike}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-[#12161f] hover:bg-[#21262d] border border-[#21262d] transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
          <span>Swap Strike</span>
          <span className="text-[9px] font-mono text-slate-500">[S]</span>
        </button>
      )}

      {onUndo && (
        <button
          onClick={onUndo}
          disabled={disabled || isUndoing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-[#12161f] hover:bg-[#21262d] border border-[#21262d] transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isUndoing ? 'animate-spin' : ''}`} />
          <span>Undo Last Ball</span>
          <span className="text-[9px] font-mono text-slate-500">[U]</span>
        </button>
      )}
    </div>
  );
};
