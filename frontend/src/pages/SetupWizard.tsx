import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Layers,
  Shield,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../api/client';
import type { MatchCreateRequest, MatchFormat, Role, TossDecision } from '../types/cricket';
import { useToast } from '../components/common/Toast';
import { getTeamIdentity } from '../utils/teamColors';

export interface TeamFormData {
  name: string;
}

export interface PlayerFormData {
  name: string;
  role: Role;
  battingStyle: string;
  bowlingStyle: string;
}

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

const initialTeamForm: TeamFormData = {
  name: '',
};

const initialPlayerForm: PlayerFormData = {
  name: '',
  role: 'batsman',
  battingStyle: 'right-handed batsman',
  bowlingStyle: 'right-arm fast',
};

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

export const SetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Active sub-tab in Setup
  const [activeStep, setActiveStep] = useState<'match' | 'team' | 'player'>('match');

  // Consolidated Form States
  const [teamForm, setTeamForm] = useState<TeamFormData>(initialTeamForm);
  const [playerForm, setPlayerForm] = useState<PlayerFormData>(initialPlayerForm);
  const [matchScheduleForm, setMatchScheduleForm] = useState<MatchScheduleFormData>(initialMatchScheduleForm);
  const [tossForm, setTossForm] = useState<TossFormData>(initialTossForm);

  // Queries
  const {
    data: teams = [],
    isError: isTeamsError,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ['teams'],
    queryFn: cricketApi.getTeams,
  });

  const {
    data: players = [],
    isError: isPlayersError,
    refetch: refetchPlayers,
  } = useQuery({
    queryKey: ['players'],
    queryFn: () => cricketApi.getPlayers(),
  });

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: (name: string) => cricketApi.createTeam(name),
    onSuccess: (newTeam) => {
      refetchTeams();
      setTeamForm(initialTeamForm);
      toast.success(`Team "${newTeam.name}" created!`);
    },
    onError: (err: unknown) => {
      toast.error('Error creating team: ' + getApiErrorMessage(err));
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: (data: { name: string; role: string; batting: string; bowling: string }) =>
      cricketApi.createPlayer(data),
    onSuccess: (newPlayer) => {
      refetchPlayers();
      setPlayerForm(initialPlayerForm);
      toast.success(`Player "${newPlayer.name}" created!`);
    },
    onError: (err: unknown) => {
      toast.error('Error creating player: ' + getApiErrorMessage(err));
    },
  });

  const createMatchMutation = useMutation({
    mutationFn: (data: MatchCreateRequest) => cricketApi.createMatch(data),
    onSuccess: (match) => {
      setTossForm((prev) => ({ ...prev, createdMatchId: match.id }));
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

  const handleQuickSquadsAndToss = async () => {
    if (!tossForm.createdMatchId || !matchScheduleForm.teamAId || !matchScheduleForm.teamBId) return;

    try {
      if (players.length < 22) {
        toast.warning(
          `You currently have ${players.length} players. At least 22 players are required to auto-assign squads.`
        );
        return;
      }

      const teamAPlayerIds = players.slice(0, 11).map((p) => p.id);
      const teamBPlayerIds = players.slice(11, 22).map((p) => p.id);

      // Submit Squad A
      await cricketApi.submitSquad(tossForm.createdMatchId, {
        team_id: matchScheduleForm.teamAId,
        captain_id: teamAPlayerIds[0],
        wicket_keeper_id: teamAPlayerIds[1],
        players: teamAPlayerIds.map((pid) => ({ player_id: pid, is_playing_xi: true })),
      });

      // Submit Squad B
      await cricketApi.submitSquad(tossForm.createdMatchId, {
        team_id: matchScheduleForm.teamBId,
        captain_id: teamBPlayerIds[0],
        wicket_keeper_id: teamBPlayerIds[1],
        players: teamBPlayerIds.map((pid) => ({ player_id: pid, is_playing_xi: true })),
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
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-sky-400" />
          Setup & Administration
        </h1>
        <p className="text-slate-400 text-xs">
          Schedule new matches, register cricket teams, and manage player rosters.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-[#21262d] gap-2">
        <button
          onClick={() => setActiveStep('match')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeStep === 'match'
              ? 'border-[#0070f3] text-sky-400 bg-[#0070f3]/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Schedule Match</span>
        </button>

        <button
          onClick={() => setActiveStep('team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeStep === 'team'
              ? 'border-[#0070f3] text-sky-400 bg-[#0070f3]/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Register Team ({teams.length})</span>
        </button>

        <button
          onClick={() => setActiveStep('player')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeStep === 'player'
              ? 'border-[#0070f3] text-sky-400 bg-[#0070f3]/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register Player ({players.length})</span>
        </button>
      </div>

      {/* Inline Warning Banner for Query Failures */}
      {(isTeamsError || isPlayersError) && (
        <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isTeamsError && isPlayersError
                ? 'Failed to load teams and players from server. Some selections may be unavailable.'
                : isTeamsError
                ? 'Failed to load teams from server. Team selection may be unavailable.'
                : 'Failed to load players from server. Squad auto-assignment may be unavailable.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isTeamsError) refetchTeams();
              if (isPlayersError) refetchPlayers();
            }}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-200 font-bold border border-amber-500/30 transition-all cursor-pointer shrink-0 ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* STEP 1: SCHEDULE MATCH */}
      {activeStep === 'match' && (
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
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/40 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-white text-xs">Match Scheduled Successfully!</h3>
                  <p className="text-[11px] text-slate-300">
                    Match #{tossForm.createdMatchId} created. Complete the coin toss to start scoring.
                  </p>
                </div>
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
      )}

      {/* STEP 2: REGISTER TEAM */}
      {activeStep === 'team' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 space-y-5 shadow-xl">
          <h2 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#21262d] pb-3">
            <Shield className="w-4 h-4 text-sky-400" />
            Register Cricket Club / Team
          </h2>

          <div className="flex gap-2.5">
            <input
              type="text"
              value={teamForm.name}
              onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Royal Challengers Bangalore"
              className="flex-1 bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
            />
            <button
              onClick={() => teamForm.name.trim() && createTeamMutation.mutate(teamForm.name.trim())}
              disabled={!teamForm.name.trim() || createTeamMutation.isPending}
              className="px-5 py-2 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              Add Team
            </button>
          </div>

          {/* Existing Teams Grid */}
          <div className="pt-3 space-y-2.5">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Registered Teams ({teams.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {teams.map((t) => {
                const identity = getTeamIdentity(t.name, t.id);
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#12161f] border border-[#21262d] flex items-center gap-2.5"
                  >
                    <span
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-[10px] ${identity.badgeBg} border ${identity.borderBadge} ${identity.textColor}`}
                    >
                      {identity.shortCode}
                    </span>
                    <span className="font-bold text-xs text-white truncate">{t.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REGISTER PLAYER */}
      {activeStep === 'player' && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 space-y-5 shadow-xl">
          <h2 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#21262d] pb-3">
            <UserPlus className="w-4 h-4 text-sky-400" />
            Register Player
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Player Name</label>
              <input
                type="text"
                value={playerForm.name}
                onChange={(e) => setPlayerForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Jasprit Bumrah"
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Role</label>
              <select
                value={playerForm.role}
                onChange={(e) => setPlayerForm((prev) => ({ ...prev, role: e.target.value as Role }))}
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
              >
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="all-rounder">All-Rounder</option>
                <option value="wicketkeeper">Wicketkeeper</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Batting Style</label>
              <select
                value={playerForm.battingStyle}
                onChange={(e) => setPlayerForm((prev) => ({ ...prev, battingStyle: e.target.value }))}
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
              >
                <option value="right-handed batsman">Right-handed batsman</option>
                <option value="left-handed batsman">Left-handed batsman</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Bowling Style</label>
              <select
                value={playerForm.bowlingStyle}
                onChange={(e) => setPlayerForm((prev) => ({ ...prev, bowlingStyle: e.target.value }))}
                className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
              >
                <option value="right-arm fast">Right-arm fast</option>
                <option value="left-arm fast">Left-arm fast</option>
                <option value="right-arm medium">Right-arm medium</option>
                <option value="right-arm spin">Right-arm spin</option>
                <option value="left-arm spin">Left-arm spin</option>
              </select>
            </div>
          </div>

          <button
            onClick={() =>
              playerForm.name.trim() &&
              createPlayerMutation.mutate({
                name: playerForm.name.trim(),
                role: playerForm.role,
                batting: playerForm.battingStyle,
                bowling: playerForm.bowlingStyle,
              })
            }
            disabled={!playerForm.name.trim() || createPlayerMutation.isPending}
            className="w-full py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-black text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            Register Player
          </button>
        </div>
      )}
    </div>
  );
};
