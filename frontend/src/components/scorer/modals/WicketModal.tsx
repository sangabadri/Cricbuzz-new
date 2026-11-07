import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { SquadResponse, WicketType } from '../../../types/cricket';

export interface WicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  wicketType: WicketType;
  onWicketTypeChange: (type: WicketType) => void;
  fielderId: number | undefined;
  onFielderChange: (fielderId: number | undefined) => void;
  wicketRuns: number;
  onWicketRunsChange: (runs: number) => void;
  bowlingSquad?: SquadResponse;
  isPending?: boolean;
}

export const WicketModal: React.FC<WicketModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  wicketType,
  onWicketTypeChange,
  fielderId,
  onFielderChange,
  wicketRuns,
  onWicketRunsChange,
  bowlingSquad,
  isPending = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl max-w-md w-full p-5 lg:p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#ea0029]" />
            Record Wicket Dismissal
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
              Dismissal Mode
            </label>
            <select
              value={wicketType}
              onChange={(e) => onWicketTypeChange(e.target.value as WicketType)}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
            >
              <option value="bowled">Bowled</option>
              <option value="caught">Caught</option>
              <option value="lbw">LBW</option>
              <option value="run_out">Run Out</option>
              <option value="stumped">Stumped</option>
              <option value="hit_wicket">Hit Wicket</option>
            </select>
          </div>

          {(wicketType === 'caught' || wicketType === 'run_out') && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Fielder Involved
              </label>
              <select
                value={fielderId || ''}
                onChange={(e) =>
                  onFielderChange(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select Fielder</option>
                {bowlingSquad?.players.map((p) => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.player_name || `Player #${p.player_id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {wicketType === 'run_out' && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Runs Completed Before Run Out
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={wicketRuns}
                onChange={(e) => onWicketRunsChange(Number(e.target.value))}
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#21262d]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#12161f] hover:bg-[#21262d] text-slate-300 rounded-xl text-xs font-bold border border-[#21262d] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2 bg-[#ea0029] hover:bg-rose-600 text-white rounded-xl text-xs font-black shadow-md border border-[#f43f5e] disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Recording...' : 'Confirm Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
