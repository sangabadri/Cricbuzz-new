import React from 'react';
import type { LiveMatchResponse, LiveScorerStateResponse } from '../../types/cricket';
import { CreaseBroadcastStrip } from './crease/CreaseBroadcastStrip';
import { CreaseParticipantsGrid } from './crease/CreaseParticipantsGrid';
import { CreaseRecentRibbon } from './crease/CreaseRecentRibbon';

export interface CreaseHudProps {
  scorerState: LiveScorerStateResponse;
  onSwapStrike: () => void;
  onChangeBowler: () => void;
  onUndoBall: () => void;
  isUndoPending?: boolean;
  isSwapStrikePending?: boolean;
  liveTicker?: LiveMatchResponse;
}

export const CreaseHud: React.FC<CreaseHudProps> = ({
  scorerState,
  onSwapStrike,
  onChangeBowler,
  onUndoBall,
  isUndoPending = false,
  isSwapStrikePending = false,
  liveTicker,
}) => {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 shadow-xl space-y-5">
      {/* Top Broadcast Score & Status Strip */}
      <CreaseBroadcastStrip scorerState={scorerState} />

      {/* Crease Positions: Striker, Non-Striker, Bowler Cards */}
      <CreaseParticipantsGrid
        scorerState={scorerState}
        onChangeBowler={onChangeBowler}
        liveTicker={liveTicker}
      />

      {/* Over Progression Ribbon & Quick Action Controls */}
      <CreaseRecentRibbon
        scorerState={scorerState}
        onSwapStrike={onSwapStrike}
        onUndoBall={onUndoBall}
        isUndoPending={isUndoPending}
        isSwapStrikePending={isSwapStrikePending}
      />
    </div>
  );
};
