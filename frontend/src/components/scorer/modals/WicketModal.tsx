import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { SquadResponse, WicketType } from '../../../types/cricket';

export interface WicketSubmissionPayload {
  wicketType: WicketType;
  playerOutId?: number;
  fielderId?: number;
  runs: number;
}

export interface WicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload?: WicketSubmissionPayload) => void;
  wicketType?: WicketType;
  onWicketTypeChange?: (type: WicketType) => void;
  fielderId?: number | undefined;
  onFielderChange?: (fielderId: number | undefined) => void;
  wicketRuns?: number;
  onWicketRunsChange?: (runs: number) => void;
  playerOutId?: number | undefined;
  onPlayerOutChange?: (playerId: number | undefined) => void;
  strikerId?: number | null;
  strikerName?: string | null;
  nonStrikerId?: number | null;
  nonStrikerName?: string | null;
  bowlingSquad?: SquadResponse;
  isPending?: boolean;
}

const WicketModalContent: React.FC<Omit<WicketModalProps, 'isOpen'>> = ({
  onClose,
  onConfirm,
  wicketType: wicketTypeProp,
  onWicketTypeChange,
  fielderId: fielderIdProp,
  onFielderChange,
  wicketRuns: wicketRunsProp,
  onWicketRunsChange,
  playerOutId: playerOutIdProp,
  onPlayerOutChange,
  strikerId,
  strikerName,
  nonStrikerId,
  nonStrikerName,
  bowlingSquad,
  isPending = false,
}) => {
  const initialFielderId =
    fielderIdProp !== undefined
      ? fielderIdProp
      : wicketTypeProp === 'stumped'
      ? bowlingSquad?.wicket_keeper_id ?? undefined
      : undefined;

  const initialPlayerOutId =
    playerOutIdProp !== undefined ? playerOutIdProp : strikerId ?? undefined;

  // Encapsulated internal form state initialized upon opening
  const [internalWicketType, setInternalWicketType] = useState<WicketType>(wicketTypeProp ?? 'bowled');
  const [internalFielderId, setInternalFielderId] = useState<number | undefined>(initialFielderId);
  const [internalWicketRuns, setInternalWicketRuns] = useState<number>(wicketRunsProp ?? 0);
  const [internalPlayerOutId, setInternalPlayerOutId] = useState<number | undefined>(initialPlayerOutId);

  const wicketType = wicketTypeProp !== undefined ? wicketTypeProp : internalWicketType;
  const fielderId = fielderIdProp !== undefined ? fielderIdProp : internalFielderId;
  const wicketRuns = wicketRunsProp !== undefined ? wicketRunsProp : internalWicketRuns;
  const playerOutId = playerOutIdProp !== undefined ? playerOutIdProp : internalPlayerOutId;

  // Designated wicket-keeper details
  const hasKeeper = !!bowlingSquad?.wicket_keeper_id;
  const keeperPlayer = bowlingSquad?.players.find(
    (p) => p.player_id === bowlingSquad?.wicket_keeper_id
  );
  const keeperName =
    keeperPlayer?.player_name ||
    (hasKeeper
      ? `Player #${bowlingSquad!.wicket_keeper_id}`
      : 'No Wicket-Keeper Assigned');

  const isPlayerOutValid =
    playerOutId && (playerOutId === strikerId || playerOutId === nonStrikerId);
  const effectivePlayerOutId = isPlayerOutValid ? playerOutId : strikerId ?? undefined;

  // External sync callbacks for backwards compatibility with parent listeners
  useEffect(() => {
    if (
      wicketType === 'stumped' &&
      bowlingSquad?.wicket_keeper_id &&
      fielderIdProp !== bowlingSquad.wicket_keeper_id
    ) {
      onFielderChange?.(bowlingSquad.wicket_keeper_id);
    }
  }, [wicketType, bowlingSquad?.wicket_keeper_id, fielderIdProp, onFielderChange]);

  useEffect(() => {
    if (wicketType === 'run_out') {
      const isValid =
        playerOutIdProp && (playerOutIdProp === strikerId || playerOutIdProp === nonStrikerId);
      if (!isValid && strikerId) {
        onPlayerOutChange?.(strikerId);
      }
    }
  }, [wicketType, playerOutIdProp, strikerId, nonStrikerId, onPlayerOutChange]);

  const handleTypeChange = (newType: WicketType) => {
    setInternalWicketType(newType);
    onWicketTypeChange?.(newType);
    if (newType === 'stumped') {
      if (bowlingSquad?.wicket_keeper_id) {
        setInternalFielderId(bowlingSquad.wicket_keeper_id);
        onFielderChange?.(bowlingSquad.wicket_keeper_id);
      }
    } else if (newType !== 'caught' && newType !== 'run_out') {
      setInternalFielderId(undefined);
      onFielderChange?.(undefined);
    }

    if (newType === 'run_out') {
      const isValid =
        playerOutId && (playerOutId === strikerId || playerOutId === nonStrikerId);
      if (!isValid && strikerId) {
        setInternalPlayerOutId(strikerId);
        onPlayerOutChange?.(strikerId);
      }
    } else {
      if (strikerId) {
        setInternalPlayerOutId(strikerId);
        onPlayerOutChange?.(strikerId);
      }
      setInternalWicketRuns(0);
      onWicketRunsChange?.(0);
    }
  };

  const handleFielderChange = (id: number | undefined) => {
    setInternalFielderId(id);
    onFielderChange?.(id);
  };

  const handlePlayerOutChange = (id: number | undefined) => {
    setInternalPlayerOutId(id);
    onPlayerOutChange?.(id);
  };

  const handleWicketRunsChange = (runs: number) => {
    setInternalWicketRuns(runs);
    onWicketRunsChange?.(runs);
  };

  const handleConfirm = () => {
    onConfirm({
      wicketType,
      fielderId,
      playerOutId: effectivePlayerOutId,
      runs: wicketType === 'run_out' ? wicketRuns : 0,
    });
  };

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
              onChange={(e) => handleTypeChange(e.target.value as WicketType)}
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

          {/* Run Out Dismissed Batter Selection */}
          {wicketType === 'run_out' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 block">
                Dismissed Batter (Run Out) <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePlayerOutChange(strikerId ?? undefined)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    effectivePlayerOutId === strikerId
                      ? 'bg-rose-500/20 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-[#12161f] border-[#21262d] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">
                    Striker
                  </span>
                  <span className="text-xs font-black text-white truncate block">
                    {strikerName || (strikerId ? `Player #${strikerId}` : 'Striker')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlayerOutChange(nonStrikerId ?? undefined)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    effectivePlayerOutId === nonStrikerId
                      ? 'bg-rose-500/20 border-rose-500 text-white ring-1 ring-rose-500'
                      : 'bg-[#12161f] border-[#21262d] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                    Non-Striker
                  </span>
                  <span className="text-xs font-black text-white truncate block">
                    {nonStrikerName || (nonStrikerId ? `Player #${nonStrikerId}` : 'Non-Striker')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Stumping Designated Keeper Notification */}
          {wicketType === 'stumped' && (
            <div
              className={`border rounded-xl p-3 space-y-1 ${
                hasKeeper
                  ? 'bg-[#12161f] border-sky-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 font-bold text-xs ${
                  hasKeeper ? 'text-sky-400' : 'text-rose-400'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Designated Wicket-Keeper</span>
              </div>
              <p className="text-white font-extrabold text-sm">{keeperName}</p>
              <p className="text-[11px] text-slate-400">
                {hasKeeper
                  ? "Per cricket rules, stumpings are credited strictly to the fielding team's designated wicket-keeper."
                  : 'Cannot record stumping: Fielding team has no designated wicket-keeper assigned in squad.'}
              </p>
            </div>
          )}

          {(wicketType === 'caught' || wicketType === 'run_out') && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Fielder Involved {wicketType === 'caught' ? '(Required)' : '(Optional)'}
              </label>
              <select
                value={fielderId || ''}
                onChange={(e) =>
                  handleFielderChange(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">
                  {wicketType === 'caught' ? 'Select Fielder' : 'None / Direct Hit'}
                </option>
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
                onChange={(e) => handleWicketRunsChange(Number(e.target.value))}
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
            onClick={handleConfirm}
            disabled={
              isPending ||
              (wicketType === 'stumped' && !hasKeeper) ||
              (wicketType === 'caught' && !fielderId)
            }
            className="px-5 py-2 bg-[#ea0029] hover:bg-rose-600 text-white rounded-xl text-xs font-black shadow-md border border-[#f43f5e] disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Recording...' : 'Confirm Out'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const WicketModal: React.FC<WicketModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <WicketModalContent {...props} />;
};
