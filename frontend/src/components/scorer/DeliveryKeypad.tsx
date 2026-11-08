import React, { useState } from 'react';
import { ArrowLeftRight, RotateCcw, Skull, X } from 'lucide-react';
import type { ExtraType, LiveCurrentOverBall } from '../../types/cricket';
import { BallBubble } from '../common/BallBubble';

export interface DeliveryKeypadProps {
  onRuns: (runs: number) => void;
  onExtra: (extraType: ExtraType, extrasCount?: number, runs?: number) => void;
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
  const [selectedModifier, setSelectedModifier] = useState<ExtraType | null>(null);

  // Count legal balls in current over to show 6 slots
  const legalBallsCount = currentOverBalls.filter((b) => {
    if (typeof b === 'object' && b !== null) {
      return !b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'noball');
    }
    const s = String(b);
    return !s.includes('Wd') && !s.includes('Nb');
  }).length;

  const handleModifierClick = (extraType: ExtraType) => {
    if (disabled) return;
    if (selectedModifier === extraType) {
      // Direct 1-click fallback: Clicking the already selected extra submits standard +1
      submitSingleExtra(extraType);
    } else {
      setSelectedModifier(extraType);
    }
  };

  const submitSingleExtra = (extraType: ExtraType) => {
    if (disabled) return;
    onExtra(extraType, 1, 0);
    setSelectedModifier(null);
  };

  const handleRunClick = (run: number) => {
    if (disabled) return;
    if (!selectedModifier) {
      onRuns(run);
      return;
    }

    if (selectedModifier === 'noball') {
      // No ball: 1 noball penalty extra + runs scored off the bat
      onExtra('noball', 1, run);
    } else if (selectedModifier === 'wide') {
      // Wide: 1 wide penalty extra + additional byes/overthrows
      onExtra('wide', 1 + run, 0);
    } else if (selectedModifier === 'bye') {
      // Bye: total runs completed as byes
      onExtra('bye', run === 0 ? 1 : run, 0);
    } else if (selectedModifier === 'leg-bye') {
      // Leg Bye: total runs completed as leg-byes
      onExtra('leg-bye', run === 0 ? 1 : run, 0);
    }

    setSelectedModifier(null);
  };

  const getRunLabel = (run: number) => {
    if (!selectedModifier) {
      return run === 0 ? 'Dot' : run === 4 ? 'Boundary' : run === 6 ? 'Maximum' : 'Runs';
    }
    if (selectedModifier === 'noball') {
      return run === 0 ? '+1 Nb' : `+${1 + run} (${run} bat)`;
    }
    if (selectedModifier === 'wide') {
      return run === 0 ? '+1 Wide' : `+${1 + run} Wides`;
    }
    if (selectedModifier === 'bye') {
      return run === 0 || run === 1 ? '+1 Bye' : `+${run} Byes`;
    }
    if (selectedModifier === 'leg-bye') {
      return run === 0 || run === 1 ? '+1 Leg Bye' : `+${run} L-Byes`;
    }
    return 'Runs';
  };

  const getExtraName = (extra: ExtraType) => {
    switch (extra) {
      case 'noball':
        return 'No Ball';
      case 'wide':
        return 'Wide';
      case 'bye':
        return 'Bye';
      case 'leg-bye':
        return 'Leg Bye';
    }
  };

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

      {/* Active Compound Extra Notification Banner */}
      {selectedModifier && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-amber-300">
              Compound Modifier: <span className="uppercase font-black text-white">{getExtraName(selectedModifier)}</span> active.
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              {selectedModifier === 'noball'
                ? 'Select runs scored off the bat (0-6)'
                : selectedModifier === 'wide'
                ? 'Select 0 for 1 wide, or 1-6 for additional wides/byes'
                : 'Select runs completed (1-6)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => submitSingleExtra(selectedModifier)}
              className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-[11px] transition-all cursor-pointer disabled:opacity-50"
            >
              Quick +1 {getExtraName(selectedModifier)}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setSelectedModifier(null)}
              className="p-1 rounded-md bg-[#21262d] hover:bg-[#30363d] text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Cancel compound modifier"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Numerical Run Action Buttons (0-6) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {[0, 1, 2, 3, 4, 6].map((run) => (
          <button
            key={run}
            onClick={() => handleRunClick(run)}
            disabled={disabled}
            className={`h-20 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${
              selectedModifier
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-white border-amber-500/40 shadow-sm'
                : run === 0
                ? 'bg-[#12161f] hover:bg-[#21262d] text-slate-200 border-[#21262d] shadow-sm'
                : run === 4
                ? 'bg-[#0284c7] hover:bg-sky-500 text-white border-[#38bdf8] shadow-md shadow-sky-950/40 ring-1 ring-[#0284c7]/40'
                : run === 6
                ? 'bg-[#10b981] hover:bg-emerald-500 text-white border-[#34d399] shadow-md shadow-emerald-950/40 ring-1 ring-[#10b981]/40'
                : 'bg-[#21262d] hover:bg-[#30363d] text-white border-[#30363d]'
            }`}
          >
            <span className="font-score text-3xl lg:text-4xl font-black tabular-nums leading-none">
              {selectedModifier && selectedModifier === 'noball'
                ? 1 + run
                : selectedModifier && selectedModifier === 'wide'
                ? 1 + run
                : selectedModifier && (selectedModifier === 'bye' || selectedModifier === 'leg-bye')
                ? (run === 0 ? 1 : run)
                : run}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-1 opacity-80">
              {getRunLabel(run)}
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-0.5 opacity-60">
              [{run}]
            </span>
          </button>
        ))}
      </div>

      {/* Extras & Wicket Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
        {/* Wide Button */}
        <button
          onClick={() => handleModifierClick('wide')}
          disabled={disabled}
          className={`py-3 px-3 rounded-xl active:scale-95 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
            selectedModifier === 'wide'
              ? 'bg-amber-500/30 text-amber-200 border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
              : 'bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border border-amber-500/40'
          }`}
        >
          <span>{selectedModifier === 'wide' ? '✓ Wide Active' : '+1 Wide'}</span>
          <span className="text-[9px] font-mono text-amber-400/70">
            {selectedModifier === 'wide' ? '[Click again: +1]' : '[W]'}
          </span>
        </button>

        {/* No Ball Button */}
        <button
          onClick={() => handleModifierClick('noball')}
          disabled={disabled}
          className={`py-3 px-3 rounded-xl active:scale-95 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
            selectedModifier === 'noball'
              ? 'bg-amber-500/30 text-amber-200 border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
              : 'bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border border-amber-500/40'
          }`}
        >
          <span>{selectedModifier === 'noball' ? '✓ No Ball Active' : '+1 No Ball'}</span>
          <span className="text-[9px] font-mono text-amber-400/70">
            {selectedModifier === 'noball' ? '[Click again: +1]' : '[N]'}
          </span>
        </button>

        {/* Leg Bye Button */}
        <button
          onClick={() => handleModifierClick('leg-bye')}
          disabled={disabled}
          className={`py-3 px-3 rounded-xl active:scale-95 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
            selectedModifier === 'leg-bye'
              ? 'bg-sky-500/25 text-sky-200 border-2 border-sky-400 ring-2 ring-sky-400/50 shadow-md'
              : 'bg-[#12161f] hover:bg-[#21262d] text-slate-300 border border-[#21262d]'
          }`}
        >
          <span>{selectedModifier === 'leg-bye' ? '✓ Leg Bye Active' : '+1 Leg Bye'}</span>
          <span className="text-[9px] font-mono text-slate-500">
            {selectedModifier === 'leg-bye' ? '[Click again: +1]' : '[L]'}
          </span>
        </button>

        {/* Bye Button */}
        <button
          onClick={() => handleModifierClick('bye')}
          disabled={disabled}
          className={`py-3 px-3 rounded-xl active:scale-95 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
            selectedModifier === 'bye'
              ? 'bg-sky-500/25 text-sky-200 border-2 border-sky-400 ring-2 ring-sky-400/50 shadow-md'
              : 'bg-[#12161f] hover:bg-[#21262d] text-slate-300 border border-[#21262d]'
          }`}
        >
          <span>{selectedModifier === 'bye' ? '✓ Bye Active' : '+1 Bye'}</span>
          <span className="text-[9px] font-mono text-slate-500">
            {selectedModifier === 'bye' ? '[Click again: +1]' : '[B]'}
          </span>
        </button>

        {/* Wicket Button */}
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
