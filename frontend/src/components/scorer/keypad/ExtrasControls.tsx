import React from 'react';
import { Skull } from 'lucide-react';
import type { ExtraType } from '../../../types/cricket';

export interface ExtrasControlsProps {
  selectedModifier: ExtraType | null;
  disabled?: boolean;
  onModifierClick: (extra: ExtraType) => void;
  onOpenWicketModal: () => void;
}

export const ExtrasControls: React.FC<ExtrasControlsProps> = ({
  selectedModifier,
  disabled = false,
  onModifierClick,
  onOpenWicketModal,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
      {/* Wide Button */}
      <button
        onClick={() => onModifierClick('wide')}
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
        onClick={() => onModifierClick('noball')}
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
        onClick={() => onModifierClick('leg-bye')}
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
        onClick={() => onModifierClick('bye')}
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
  );
};
