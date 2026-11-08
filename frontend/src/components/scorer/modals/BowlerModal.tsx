import React from 'react';
import { Users } from 'lucide-react';
import type { SquadResponse } from '../../../types/cricket';

export interface BowlerModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectBowler: (bowlerId: number) => void;
  bowlingSquad?: SquadResponse;
  currentBowlerId?: number | null;
  eligibleBowlerIds?: number[];
  canClose?: boolean;
  isPending?: boolean;
}

export const BowlerModal: React.FC<BowlerModalProps> = ({
  isOpen,
  onClose,
  onSelectBowler,
  bowlingSquad,
  currentBowlerId,
  eligibleBowlerIds,
  canClose = true,
  isPending = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl max-w-md w-full p-5 lg:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            Select Next Bowler
          </h3>
          {canClose && onClose && (
            <button
              onClick={onClose}
              disabled={isPending}
              className="text-slate-400 hover:text-white text-sm cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400">
          The previous over has concluded. Choose the bowler for the next over:
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {bowlingSquad?.players.map((p) => {
            const isCurrent = p.player_id === currentBowlerId;
            const isEligible = eligibleBowlerIds
              ? eligibleBowlerIds.includes(p.player_id)
              : !isCurrent;
            const isDisabled = !isEligible || isPending;

            return (
              <button
                key={p.player_id}
                onClick={() => onSelectBowler(p.player_id)}
                disabled={isDisabled}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isDisabled
                    ? 'bg-[#12161f] border-[#21262d] opacity-50 cursor-not-allowed'
                    : 'bg-[#12161f] hover:bg-[#21262d] border-[#21262d] text-white hover:border-[#0070f3] cursor-pointer'
                }`}
              >
                <div>
                  <span className="font-bold text-xs text-white block">
                    {p.player_name || `Player #${p.player_id}`}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {p.role || 'Bowler'}
                  </span>
                </div>
                {isCurrent ? (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Just Bowled
                  </span>
                ) : !isEligible ? (
                  <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                    Over quota / ineligible
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-bold">Eligible</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
