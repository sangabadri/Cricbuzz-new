import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { Match, SquadPlayerItem, SquadResponse } from '../../../types/cricket';

interface MatchCompletedBannerProps {
  match?: Match;
  battingSquad?: SquadResponse;
  bowlingSquad?: SquadResponse;
  onAwardMOM: (playerId: number) => void;
  isAwardingMOM: boolean;
}

export const MatchCompletedBanner: React.FC<MatchCompletedBannerProps> = ({
  match,
  battingSquad,
  bowlingSquad,
  onAwardMOM,
  isAwardingMOM,
}) => {
  const [momPlayerId, setMomPlayerId] = useState<number | undefined>();

  return (
    <div className="bg-[#161b22] border border-emerald-500/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
        <Trophy className="w-6 h-6 text-yellow-400" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-white">MATCH COMPLETED</h2>
        <p className="text-emerald-400 font-bold text-sm mt-1">
          {match?.winner
            ? `${match.winner === match.team_a ? match.team_a_name : match.team_b_name} won the match!`
            : 'Match Tied!'}
        </p>
      </div>

      {!match?.mom && (
        <div className="max-w-md mx-auto pt-2 flex items-center gap-2">
          <select
            value={momPlayerId || ''}
            onChange={(e) => setMomPlayerId(Number(e.target.value))}
            className="flex-1 bg-[#12161f] border border-[#21262d] text-white rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="">Select Man of the Match</option>
            {battingSquad?.players.map((p: SquadPlayerItem) => (
              <option key={p.player_id} value={p.player_id}>
                {p.player_name || `Player ${p.player_id}`}
              </option>
            ))}
            {bowlingSquad?.players.map((p: SquadPlayerItem) => (
              <option key={p.player_id} value={p.player_id}>
                {p.player_name || `Player ${p.player_id}`}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={() => momPlayerId && onAwardMOM(momPlayerId)}
            disabled={!momPlayerId || isAwardingMOM}
          >
            Award MOM
          </Button>
        </div>
      )}
    </div>
  );
};
