import React from 'react';
import type { ExtraType } from '../../../types/cricket';

export interface RunsGridProps {
  selectedModifier: ExtraType | null;
  disabled?: boolean;
  onRunClick: (run: number) => void;
  getRunLabel: (run: number) => string;
}

export const RunsGrid: React.FC<RunsGridProps> = ({
  selectedModifier,
  disabled = false,
  onRunClick,
  getRunLabel,
}) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
      {[0, 1, 2, 3, 4, 6].map((run) => (
        <button
          key={run}
          onClick={() => onRunClick(run)}
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
  );
};
