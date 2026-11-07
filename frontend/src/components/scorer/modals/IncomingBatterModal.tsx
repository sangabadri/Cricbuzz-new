import React from 'react';
import { UserCheck } from 'lucide-react';
import type { SquadResponse } from '../../../types/cricket';

export interface IncomingBatterModalProps {
  isOpen: boolean;
  onSelectBatter: (playerId: number) => void;
  battingSquad?: SquadResponse;
  strikerId?: number | null;
  nonStrikerId?: number | null;
  isPending?: boolean;
}

export const IncomingBatterModal: React.FC<IncomingBatterModalProps> = ({
  isOpen,
  onSelectBatter,
  battingSquad,
  strikerId,
  nonStrikerId,
  isPending = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl max-w-md w-full p-5 lg:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-400" />
            Select Incoming Batter
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          Wicket fell! Select the new batter entering the crease:
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {battingSquad?.players
            .filter((p) => p.player_id !== strikerId && p.player_id !== nonStrikerId)
            .map((p) => (
              <button
                key={p.player_id}
                onClick={() => onSelectBatter(p.player_id)}
                disabled={isPending}
                className="w-full p-3 rounded-xl bg-[#12161f] hover:bg-[#21262d] border border-[#21262d] hover:border-[#0070f3] text-left flex items-center justify-between transition-all cursor-pointer"
              >
                <div>
                  <span className="font-bold text-xs text-white block">
                    {p.player_name || `Player #${p.player_id}`}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {p.role || 'Batsman'}
                  </span>
                </div>
                <span className="text-sky-400 text-xs font-bold">Select →</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
