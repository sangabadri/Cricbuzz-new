import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../api/client';
import { useToast } from '../common/Toast';
import { PlayingXISelector } from './PlayingXISelector';
import type {
  MatchCreateRequest,
  MatchFormat,
  Player,
  Team,
  TossDecision,
} from '../../types/cricket';

export interface MatchScheduleFormData {
  teamAId?: number;
  teamBId?: number;
  venue: string;
  format: MatchFormat;
  matchDate: string;
}

export interface TossFormData {
  createdMatchId: number | null;
  tossWinnerId?: number;
  tossDecision: TossDecision;
}

const initialMatchScheduleForm: MatchScheduleFormData = {
  teamAId: undefined,
  teamBId: undefined,
  venue: 'Wankhede Stadium, Mumbai',
  format: 't20',
  matchDate: new Date().toISOString().slice(0, 16),
};

const initialTossForm: TossFormData = {
  createdMatchId: null,
  tossWinnerId: undefined,
  tossDecision: 'bat',
};

export interface ScheduleMatchFormProps {
  teams: Team[];
  players: Player[];
}

export const ScheduleMatchForm: React.FC<ScheduleMatchFormProps> = ({ teams, players }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [matchScheduleForm, setMatchScheduleForm] = useState<MatchScheduleFormData>(initialMatchScheduleForm);
  const [tossForm, setTossForm] = useState<TossFormData>(initialTossForm);

  // Interactive Squad & Playing XI Selection States
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<number[]>([]);
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<number[]>([]);
  const [captainAId, setCaptainAId] = useState<number | undefined>();
  const [wicketKeeperAId, setWicketKeeperAId] = useState<number | undefined>();
  const [captainBId, setCaptainBId] = useState<number | undefined>();
  const [wicketKeeperBId, setWicketKeeperBId] = useState<number | undefined>();

  const handleToggleTeamAPlayer = (pid: number) => {
    setTeamAPlayerIds((prev) => {
      if (prev.includes(pid)) {
        if (captainAId === pid) setCaptainAId(undefined);
        if (wicketKeeperAId === pid) setWicketKeeperAId(undefined);
        return prev.filter((id) => id !== pid);
      }
      if (prev.length >= 11) {
        toast.warning('Team A already has 11 players selected.');
        return prev;
      }
      return [...prev, pid];
    });
  };

  const handleToggleTeamBPlayer = (pid: number) => {
    setTeamBPlayerIds((prev) => {
      if (prev.includes(pid)) {
        if (captainBId === pid) setCaptainBId(undefined);
        if (wicketKeeperBId === pid) setWicketKeeperBId(undefined);
        return prev.filter((id) => id !== pid);
      }
      if (prev.length >= 11) {
        toast.warning('Team B already has 11 players selected.');
        return prev;
      }
      return [...prev, pid];
    });
  };

  const createMatchMutation = useMutation({
    mutationFn: (data: MatchCreateRequest) => cricketApi.createMatch(data),
    onSuccess: (match) => {
      setTossForm((prev) => ({ ...prev, createdMatchId: match.id }));
      if (players.length >= 22) {
        const teamA = players.slice(0, 11).map((p) => p.id);
        const teamB = players.slice(11, 22).map((p) => p.id);
        setTeamAPlayerIds(teamA);
        setTeamBPlayerIds(teamB);
        setCaptainAId(teamA[0]);
        setWicketKeeperAId(teamA[1]);
        setCaptainBId(teamB[0]);
        setWicketKeeperBId(teamB[1]);
      }
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (err: unknown) => {
      toast.error('Error scheduling match: ' + getApiErrorMessage(err));
    },
  });

  const conductTossMutation = useMutation({
    mutationFn: (data: { matchId: number; winnerId: number; decision: 'bat' | 'bowl' }) =>
      cricketApi.conductToss(data.matchId, data.winnerId, data.decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      navigate(`/matches/${tossForm.createdMatchId}/score`);
    },
    onError: (err: unknown) => {
      toast.error('Error conducting toss: ' + getApiErrorMessage(err));
    },
  });

  const handleCreateMatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchScheduleForm.teamAId || !matchScheduleForm.teamBId) {
      toast.error('Please select both Team A and Team B');
      return;
    }
    if (matchScheduleForm.teamAId === matchScheduleForm.teamBId) {
      toast.error('Team A and Team B must be different');
      return;
    }

    createMatchMutation.mutate({
      team_a: matchScheduleForm.teamAId,
      team_b: matchScheduleForm.teamBId,
      venue: matchScheduleForm.venue,
      format: matchScheduleForm.format,
      match_date: new Date(matchScheduleForm.matchDate).toISOString(),
    });
  };

  const handleAutoFillSquads = () => {
    if (players.length >= 22) {
      const teamA = players.slice(0, 11).map((p) => p.id);
      const teamB = players.slice(11, 22).map((p) => p.id);
      setTeamAPlayerIds(teamA);
      setTeamBPlayerIds(teamB);
      setCaptainAId(teamA[0]);
      setWicketKeeperAId(teamA[1]);
      setCaptainBId(teamB[0]);
      setWicketKeeperBId(teamB[1]);
      toast.success('Auto-filled 11 players each for Team A and Team B');
    } else {
      toast.warning(`At least 22 players are required to auto-fill squads (found ${players.length})`);
    }
  };

  const handleQuickSquadsAndToss = async () => {
    if (!tossForm.createdMatchId || !matchScheduleForm.teamAId || !matchScheduleForm.teamBId) return;

    let finalTeamA = teamAPlayerIds;
    let finalTeamB = teamBPlayerIds;

    if (finalTeamA.length !== 11 || finalTeamB.length !== 11) {
      if (players.length >= 22) {
        finalTeamA = players.slice(0, 11).map((p) => p.id);
        finalTeamB = players.slice(11, 22).map((p) => p.id);
      } else {
        toast.warning(
          `You currently have ${players.length} players. At least 22 players are required to assign squads.`
        );
        return;
      }
    }

    const finalCaptainA = captainAId || finalTeamA[0];
    const finalWkA = wicketKeeperAId || finalTeamA[1] || finalTeamA[0];
    const finalCaptainB = captainBId || finalTeamB[0];
    const finalWkB = wicketKeeperBId || finalTeamB[1] || finalTeamB[0];

    try {
      // Submit Squad A
      await cricketApi.submitSquad(tossForm.createdMatchId, {
        team_id: matchScheduleForm.teamAId,
        captain_id: finalCaptainA,
        wicket_keeper_id: finalWkA,
        players: finalTeamA.map((pid) => ({ player_id: pid, is_playing_xi: true })),
      });

      // Submit Squad B
      await cricketApi.submitSquad(tossForm.createdMatchId, {
        team_id: matchScheduleForm.teamBId,
        captain_id: finalCaptainB,
        wicket_keeper_id: finalWkB,
        players: finalTeamB.map((pid) => ({ player_id: pid, is_playing_xi: true })),
      });
    } catch (err: unknown) {
      toast.error('Squad assignment error: ' + getApiErrorMessage(err));
      return;
    }

    // Conduct Toss (error notifications are handled exclusively by conductTossMutation.onError to prevent duplicate toasts)
    conductTossMutation.mutate({
      matchId: tossForm.createdMatchId,
      winnerId: tossForm.tossWinnerId || matchScheduleForm.teamAId,
      decision: tossForm.tossDecision,
    });
  };

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 space-y-5 shadow-xl">
      {!tossForm.createdMatchId ? (
        <form onSubmit={handleCreateMatchSubmit} className="space-y-5">
          <h2 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#21262d] pb-3">
            <Calendar className="w-4 h-4 text-sky-400" />
            Schedule New Cricket Fixture
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Team A (Home)
              </label>
              <select
                value={matchScheduleForm.teamAId || ''}
                onChange={(e) =>
                  setMatchScheduleForm((prev) => ({
                    ...prev,
                    teamAId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                required
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
              >
                <option value="">Select Team A</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Team B */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Team B (Away)
              </label>
              <select
                value={matchScheduleForm.teamBId || ''}
                onChange={(e) =>
                  setMatchScheduleForm((prev) => ({
                    ...prev,
                    teamBId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                required
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
              >
                <option value="">Select Team B</option>
                {teams
                  .filter((t) => t.id !== matchScheduleForm.teamAId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Venue */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Stadium / Venue
              </label>
              <input
                type="text"
                value={matchScheduleForm.venue}
                onChange={(e) =>
                  setMatchScheduleForm((prev) => ({ ...prev, venue: e.target.value }))
                }
                required
                placeholder="e.g. Melbourne Cricket Ground"
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
              />
            </div>

            {/* Format */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Match Format
              </label>
              <select
                value={matchScheduleForm.format}
                onChange={(e) =>
                  setMatchScheduleForm((prev) => ({
                    ...prev,
                    format: e.target.value as MatchFormat,
                  }))
                }
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
              >
                <option value="t20">T20 (20 Overs)</option>
                <option value="odi">ODI (50 Overs)</option>
              </select>
            </div>

            {/* Date */}
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Match Date & Time
              </label>
              <input
                type="datetime-local"
                value={matchScheduleForm.matchDate}
                onChange={(e) =>
                  setMatchScheduleForm((prev) => ({ ...prev, matchDate: e.target.value }))
                }
                required
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createMatchMutation.isPending}
            className="w-full py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            {createMatchMutation.isPending ? 'Scheduling...' : 'Next: Setup Squads & Toss'}
          </button>
        </form>
      ) : (
        /* Post-match creation toss step */
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <h3 className="font-extrabold text-white text-xs">Match Scheduled Successfully!</h3>
                <p className="text-[11px] text-slate-300">
                  Match #{tossForm.createdMatchId} created. Select Playing XI and complete the coin toss.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoFillSquads}
              className="px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-xs font-bold text-sky-400 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
            >
              Auto-Fill Defaults (11 Each)
            </button>
          </div>

          {/* Playing XI Selection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlayingXISelector
              teamName={teams.find((t) => t.id === matchScheduleForm.teamAId)?.name || 'Team A'}
              teamId={matchScheduleForm.teamAId || 1}
              allPlayers={players}
              selectedPlayerIds={teamAPlayerIds}
              onTogglePlayer={handleToggleTeamAPlayer}
              captainId={captainAId}
              onSetCaptain={setCaptainAId}
              wicketKeeperId={wicketKeeperAId}
              onSetWicketKeeper={setWicketKeeperAId}
              disabledPlayerIds={teamBPlayerIds}
            />
            <PlayingXISelector
              teamName={teams.find((t) => t.id === matchScheduleForm.teamBId)?.name || 'Team B'}
              teamId={matchScheduleForm.teamBId || 2}
              allPlayers={players}
              selectedPlayerIds={teamBPlayerIds}
              onTogglePlayer={handleToggleTeamBPlayer}
              captainId={captainBId}
              onSetCaptain={setCaptainBId}
              wicketKeeperId={wicketKeeperBId}
              onSetWicketKeeper={setWicketKeeperBId}
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
                  value={tossForm.tossWinnerId || ''}
                  onChange={(e) =>
                    setTossForm((prev) => ({
                      ...prev,
                      tossWinnerId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="">Select Toss Winner</option>
                  <option value={matchScheduleForm.teamAId}>
                    {teams.find((t) => t.id === matchScheduleForm.teamAId)?.name}
                  </option>
                  <option value={matchScheduleForm.teamBId}>
                    {teams.find((t) => t.id === matchScheduleForm.teamBId)?.name}
                  </option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Toss Decision
                </label>
                <select
                  value={tossForm.tossDecision}
                  onChange={(e) =>
                    setTossForm((prev) => ({
                      ...prev,
                      tossDecision: e.target.value as TossDecision,
                    }))
                  }
                  className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="bat">Elected to Bat</option>
                  <option value="bowl">Elected to Bowl</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleQuickSquadsAndToss}
              className="w-full py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Confirm Squads, Toss & Open Scorer Pad
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
