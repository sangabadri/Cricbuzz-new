import React, { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import type { SquadResponse } from '../../../types/cricket';

export interface StartInningsPayload {
  strikerId: number;
  nonStrikerId: number;
  bowlerId: number;
}

export interface StartInningsModalProps {
  isOpen: boolean;
  inningsNumber: number;
  onClose: () => void;
  onSubmit: (data?: StartInningsPayload) => void;
  strikerId?: number | undefined;
  onStrikerChange?: (id: number | undefined) => void;
  nonStrikerId?: number | undefined;
  onNonStrikerChange?: (id: number | undefined) => void;
  bowlerId?: number | undefined;
  onBowlerChange?: (id: number | undefined) => void;
  battingSquad?: SquadResponse;
  bowlingSquad?: SquadResponse;
  isPending?: boolean;
}

const StartInningsModalContent: React.FC<Omit<StartInningsModalProps, 'isOpen'>> = ({
  inningsNumber,
  onClose,
  onSubmit,
  strikerId: strikerIdProp,
  onStrikerChange,
  nonStrikerId: nonStrikerIdProp,
  onNonStrikerChange,
  bowlerId: bowlerIdProp,
  onBowlerChange,
  battingSquad,
  bowlingSquad,
  isPending = false,
}) => {
  // Encapsulated internal form state - initialized on modal open
  const [internalStrikerId, setInternalStrikerId] = useState<number | undefined>(strikerIdProp);
  const [internalNonStrikerId, setInternalNonStrikerId] = useState<number | undefined>(nonStrikerIdProp);
  const [internalBowlerId, setInternalBowlerId] = useState<number | undefined>(bowlerIdProp);

  const strikerId = strikerIdProp !== undefined ? strikerIdProp : internalStrikerId;
  const nonStrikerId = nonStrikerIdProp !== undefined ? nonStrikerIdProp : internalNonStrikerId;
  const bowlerId = bowlerIdProp !== undefined ? bowlerIdProp : internalBowlerId;

  const handleStrikerChange = (id: number | undefined) => {
    setInternalStrikerId(id);
    onStrikerChange?.(id);
  };

  const handleNonStrikerChange = (id: number | undefined) => {
    setInternalNonStrikerId(id);
    onNonStrikerChange?.(id);
  };

  const handleBowlerChange = (id: number | undefined) => {
    setInternalBowlerId(id);
    onBowlerChange?.(id);
  };

  const handleSubmit = () => {
    if (strikerId && nonStrikerId && bowlerId) {
      onSubmit({
        strikerId,
        nonStrikerId,
        bowlerId,
      });
    } else {
      onSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl max-w-md w-full p-5 lg:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-sky-400" />
            Configure Openers — Innings {inningsNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Opening Striker (on strike)
            </label>
            <select
              value={strikerId || ''}
              onChange={(e) => handleStrikerChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
            >
              <option value="">Select Striker</option>
              {battingSquad?.players.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.player_name || `Player #${p.player_id}`} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Opening Non-Striker
            </label>
            <select
              value={nonStrikerId || ''}
              onChange={(e) =>
                handleNonStrikerChange(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
            >
              <option value="">Select Non-Striker</option>
              {battingSquad?.players
                .filter((p) => p.player_id !== strikerId)
                .map((p) => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.player_name || `Player #${p.player_id}`} ({p.role})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Opening Bowler
            </label>
            <select
              value={bowlerId || ''}
              onChange={(e) => handleBowlerChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
            >
              <option value="">Select Opening Bowler</option>
              {bowlingSquad?.players.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.player_name || `Player #${p.player_id}`} ({p.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#21262d]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#12161f] hover:bg-[#21262d] text-slate-300 rounded-xl text-xs font-bold border border-[#21262d] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!strikerId || !nonStrikerId || !bowlerId || isPending}
            className="px-5 py-2 bg-[#0070f3] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md border border-blue-400/40 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Starting...' : 'Start Innings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const StartInningsModal: React.FC<StartInningsModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <StartInningsModalContent {...props} />;
};
