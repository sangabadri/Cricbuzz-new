import React from 'react';
import { ArrowLeftRight, RotateCcw, Skull } from 'lucide-react';
import type { ExtraType, LiveCurrentOverBall } from '../../types/cricket';
import { BallBubble } from '../common/BallBubble';

export interface DeliveryKeypadProps {
  onRuns: (runs: number) => void;
  onExtra: (extraType: ExtraType, extrasCount?: number) => void;
  onOpenWicketModal: () => void;
  disabled?: boolean;
  currentOverBalls?: (LiveCurrentOverBall | string)[];
  onSwapStrike?: () => void;
  onUndo?: () => void;
  isUndoing?: boolean;
  isSwappingStrike?: boolean;
}

export const DeliveryKeypad: React.FC<DeliveryKeypadProps> = ({
  onRuns,
  onExtra,
  onOpenWicketModal,
  disabled = false,
  currentOverBalls = [],
  onSwapStrike,
  onUndo,
  isUndoing = false,
  isSwappingStrike = false,
}) => {
  // Count legal balls in current over to show 6 slots
  const legalBallsCount = currentOverBalls.filter((b) => {
    if (typeof b === 'object' && b !== null) {
      return !b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'noball');
    }
    const s = String(b);
    return !s.includes('Wd') && !s.includes('Nb');
  }).length;

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 shadow-xl space-y-5">
      {/* Header with 6-Ball Over Progress Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ea0029] animate-pulse" />
            <span>Delivery Action Deck</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Tactile touch buttons or hotkeys <span className="font-mono text-sky-400">[0-6, W, N, K, U]</span>
          </p>
        </div>

        {/* Live Over Progression Slots */}
        <div className="flex items-center gap-2 bg-[#12161f] px-3 py-1.5 rounded-xl border border-[#21262d]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            This Over:
          </span>
          {currentOverBalls.length === 0 ? (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((slot) => (
                <span
                  key={slot}
                  className="w-6 h-6 rounded-full border border-dashed border-slate-700/60 flex items-center justify-center text-[10px] text-slate-600 font-mono"
                >
                  {slot}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentOverBalls.map((b, idx) => (
                <BallBubble
                  key={idx}
                  ball={b}
                  size="sm"
                  animate={idx === currentOverBalls.length - 1}
                />
              ))}
              {/* Fill remaining legal ball slots up to 6 */}
              {Array.from({ length: Math.max(0, 6 - legalBallsCount) }).map((_, i) => (
                <span
                  key={`rem-${i}`}
                  className="w-6 h-6 rounded-full border border-dashed border-slate-700/60 flex items-center justify-center text-[10px] text-slate-600 font-mono"
                >
                  {legalBallsCount + i + 1}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Numerical Run Action Buttons (0-6) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {[0, 1, 2, 3, 4, 6].map((run) => (
          <button
            key={run}
            onClick={() => onRuns(run)}
            disabled={disabled}
            className={`h-20 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${
              run === 0
                ? 'bg-[#12161f] hover:bg-[#21262d] text-slate-200 border-[#21262d] shadow-sm'
                : run === 4
                ? 'bg-[#0284c7] hover:bg-sky-500 text-white border-[#38bdf8] shadow-md shadow-sky-950/40 ring-1 ring-[#0284c7]/40'
                : run === 6
                ? 'bg-[#10b981] hover:bg-emerald-500 text-white border-[#34d399] shadow-md shadow-emerald-950/40 ring-1 ring-[#10b981]/40'
                : 'bg-[#21262d] hover:bg-[#30363d] text-white border-[#30363d]'
            }`}
          >
            <span className="font-score text-3xl lg:text-4xl font-black tabular-nums leading-none">{run}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-1 opacity-80">
              {run === 0 ? 'Dot' : run === 4 ? 'Boundary' : run === 6 ? 'Maximum' : 'Runs'}
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5 opacity-60">
              [{run}]
            </span>
          </button>
        ))}
      </div>

      {/* Extras & Wicket Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        <button
          onClick={() => onExtra('wide', 1)}
          disabled={disabled}
          className="py-3 px-3 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 active:scale-95 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5"
        >
          <span>+1 Wide</span>
          <span className="text-[9px] font-mono text-amber-400/70">[W]</span>
        </button>

        <button
          onClick={() => onExtra('noball', 1)}
          disabled={disabled}
          className="py-3 px-3 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 active:scale-95 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5"
        >
          <span>+1 No Ball</span>
          <span className="text-[9px] font-mono text-amber-400/70">[N]</span>
        </button>

        <button
          onClick={() => onExtra('leg-bye', 1)}
          disabled={disabled}
          className="py-3 px-3 rounded-xl bg-[#12161f] hover:bg-[#21262d] active:scale-95 text-slate-300 border border-[#21262d] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5"
        >
          <span>+1 Leg Bye</span>
          <span className="text-[9px] font-mono text-slate-500">[L]</span>
        </button>

        <button
          onClick={() => onExtra('bye', 1)}
          disabled={disabled}
          className="py-3 px-3 rounded-xl bg-[#12161f] hover:bg-[#21262d] active:scale-95 text-slate-300 border border-[#21262d] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5"
        >
          <span>+1 Bye</span>
          <span className="text-[9px] font-mono text-slate-500">[B]</span>
        </button>

        <button
          onClick={onOpenWicketModal}
          disabled={disabled}
          className="col-span-2 sm:col-span-1 py-3 px-3 rounded-xl bg-[#ea0029] hover:bg-rose-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-[#ea0029]/40 border border-[#f43f5e] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Skull className="w-4 h-4 text-white" />
          <span>OUT / WICKET</span>
          <span className="text-[9px] font-mono text-rose-200">[K]</span>
        </button>
      </div>

      {/* Scorer Correction Toolbar: Swap Strike & Undo */}
      {(onSwapStrike || onUndo) && (
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
      )}
    </div>
  );
};
