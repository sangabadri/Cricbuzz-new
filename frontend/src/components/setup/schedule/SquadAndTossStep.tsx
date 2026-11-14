import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Player, Team, TossDecision } from '../../../types/cricket';
import { PlayingXISelector } from '../PlayingXISelector';

export interface SquadAndTossStepProps {
  createdMatchId: number;
  teams: Team[];
  players: Player[];
  teamAId: number;
  teamBId: number;
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  captainAId?: number;
  wicketKeeperAId?: number;
  captainBId?: number;
  wicketKeeperBId?: number;
  tossWinnerId?: number;
  tossDecision: TossDecision;
  onToggleTeamAPlayer: (pid: number) => void;
  onToggleTeamBPlayer: (pid: number) => void;
  onSetCaptainA: (pid?: number) => void;
  onSetWicketKeeperA: (pid?: number) => void;
  onSetCaptainB: (pid?: number) => void;
  onSetWicketKeeperB: (pid?: number) => void;
  onSetTossWinner: (id?: number) => void;
  onSetTossDecision: (decision: TossDecision) => void;
  onAutoFillSquads: () => void;
  onConfirmSquadsAndToss: () => void;
}

export const SquadAndTossStep: React.FC<SquadAndTossStepProps> = ({
  createdMatchId,
  teams,
  players,
  teamAId,
  teamBId,
  teamAPlayerIds,
  teamBPlayerIds,
  captainAId,
  wicketKeeperAId,
  captainBId,
  wicketKeeperBId,
  tossWinnerId,
  tossDecision,
  onToggleTeamAPlayer,
  onToggleTeamBPlayer,
  onSetCaptainA,
  onSetWicketKeeperA,
  onSetCaptainB,
  onSetWicketKeeperB,
  onSetTossWinner,
  onSetTossDecision,
  onAutoFillSquads,
  onConfirmSquadsAndToss,
}) => {
  const teamAName = teams.find((t) => t.id === teamAId)?.name || 'Team A';
  const teamBName = teams.find((t) => t.id === teamBId)?.name || 'Team B';

  return (
    <div className="space-y-5">
      <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <h3 className="font-extrabold text-white text-xs">Match Scheduled Successfully!</h3>
            <p className="text-[11px] text-slate-300">
              Match #{createdMatchId} created. Select Playing XI and complete the coin toss.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAutoFillSquads}
          className="px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-bold text-sky-400 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          Auto-Fill Defaults (11 Each)
        </button>
      </div>

      {/* Playing XI Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlayingXISelector
          teamName={teamAName}
          teamId={teamAId}
          allPlayers={players}
          selectedPlayerIds={teamAPlayerIds}
          onTogglePlayer={onToggleTeamAPlayer}
          captainId={captainAId}
          onSetCaptain={onSetCaptainA}
          wicketKeeperId={wicketKeeperAId}
          onSetWicketKeeper={onSetWicketKeeperA}
          disabledPlayerIds={teamBPlayerIds}
        />
        <PlayingXISelector
          teamName={teamBName}
          teamId={teamBId}
          allPlayers={players}
          selectedPlayerIds={teamBPlayerIds}
          onTogglePlayer={onToggleTeamBPlayer}
          captainId={captainBId}
          onSetCaptain={onSetCaptainB}
          wicketKeeperId={wicketKeeperBId}
          onSetWicketKeeper={onSetWicketKeeperB}
          disabledPlayerIds={teamAPlayerIds}
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-white text-xs">Conduct Coin Toss</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Toss Winner
            </label>
            <select
              value={tossWinnerId || ''}
              onChange={(e) => onSetTossWinner(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
            >
              <option value="">Select Toss Winner</option>
              <option value={teamAId}>{teamAName}</option>
              <option value={teamBId}>{teamBName}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Toss Decision
            </label>
            <select
              value={tossDecision}
              onChange={(e) => onSetTossDecision(e.target.value as TossDecision)}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
            >
              <option value="bat">Elected to Bat</option>
              <option value="bowl">Elected to Bowl</option>
            </select>
          </div>
        </div>

        <button
          onClick={onConfirmSquadsAndToss}
          className="w-full py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          Confirm Squads, Toss & Open Scorer Pad
        </button>
      </div>
    </div>
  );
};
