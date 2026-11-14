import React from 'react';
import { X } from 'lucide-react';
import type { ExtraType } from '../../../types/cricket';

export interface ModifierBannerProps {
  selectedModifier: ExtraType;
  disabled?: boolean;
  onClear: () => void;
  onSubmitSingle: (extra: ExtraType) => void;
  extraName: string;
}

export const ModifierBanner: React.FC<ModifierBannerProps> = ({
  selectedModifier,
  disabled = false,
  onClear,
  onSubmitSingle,
  extraName,
}) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-bold text-amber-300">
          Compound Modifier: <span className="uppercase font-black text-white">{extraName}</span> active.
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
          onClick={() => onSubmitSingle(selectedModifier)}
          className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-[11px] transition-all cursor-pointer disabled:opacity-50"
        >
          Quick +1 {extraName}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="p-1 rounded-md bg-[#21262d] hover:bg-[#30363d] text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          title="Cancel compound modifier"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
