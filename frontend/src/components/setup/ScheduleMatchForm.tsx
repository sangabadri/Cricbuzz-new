import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cricketApi, getApiErrorMessage } from '../../lib/api-client';
import { useToast } from '../common/Toast';
import { FixtureDetailsStep } from './schedule/FixtureDetailsStep';
import { SquadAndTossStep } from './schedule/SquadAndTossStep';
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

const initialTossForm: TossFormData = { createdMatchId: null, tossWinnerId: undefined, tossDecision: 'bat' };

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

  const togglePlayer = (
    pid: number,
    ids: number[],
    setIds: React.Dispatch<React.SetStateAction<number[]>>,
    capId: number | undefined,
    setCap: (id?: number) => void,
    wkId: number | undefined,
    setWk: (id?: number) => void,
    teamLabel: string
  ) => {
    if (ids.includes(pid)) {
      if (capId === pid) setCap(undefined);
      if (wkId === pid) setWk(undefined);
      setIds((prev) => prev.filter((id) => id !== pid));
    } else {
      if (ids.length >= 11) {
        toast.warning(`${teamLabel} already has 11 players selected.`);
        return;
      }
      setIds((prev) => [...prev, pid]);
    }
  };

  const handleToggleTeamAPlayer = (pid: number) =>
    togglePlayer(pid, teamAPlayerIds, setTeamAPlayerIds, captainAId, setCaptainAId, wicketKeeperAId, setWicketKeeperAId, 'Team A');

  const handleToggleTeamBPlayer = (pid: number) =>
    togglePlayer(pid, teamBPlayerIds, setTeamBPlayerIds, captainBId, setCaptainBId, wicketKeeperBId, setWicketKeeperBId, 'Team B');

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
      await cricketApi.submitSquad(tossForm.createdMatchId, {
        team_id: matchScheduleForm.teamAId,
        captain_id: finalCaptainA,
        wicket_keeper_id: finalWkA,
        players: finalTeamA.map((pid) => ({ player_id: pid, is_playing_xi: true })),
      });

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

    conductTossMutation.mutate({
      matchId: tossForm.createdMatchId,
      winnerId: tossForm.tossWinnerId || matchScheduleForm.teamAId,
      decision: tossForm.tossDecision,
    });
  };

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 space-y-5 shadow-xl">
      {!tossForm.createdMatchId ? (
        <FixtureDetailsStep
          teams={teams}
          formData={matchScheduleForm}
          onChange={setMatchScheduleForm}
          onSubmit={handleCreateMatchSubmit}
          isSubmitting={createMatchMutation.isPending}
        />
      ) : (
        <SquadAndTossStep
          createdMatchId={tossForm.createdMatchId}
          teams={teams}
          players={players}
          teamAId={matchScheduleForm.teamAId || 1}
          teamBId={matchScheduleForm.teamBId || 2}
          teamAPlayerIds={teamAPlayerIds}
          teamBPlayerIds={teamBPlayerIds}
          captainAId={captainAId}
          wicketKeeperAId={wicketKeeperAId}
          captainBId={captainBId}
          wicketKeeperBId={wicketKeeperBId}
          tossWinnerId={tossForm.tossWinnerId}
          tossDecision={tossForm.tossDecision}
          onToggleTeamAPlayer={handleToggleTeamAPlayer}
          onToggleTeamBPlayer={handleToggleTeamBPlayer}
          onSetCaptainA={setCaptainAId}
          onSetWicketKeeperA={setWicketKeeperAId}
          onSetCaptainB={setCaptainBId}
          onSetWicketKeeperB={setWicketKeeperBId}
          onSetTossWinner={(id) => setTossForm((prev) => ({ ...prev, tossWinnerId: id }))}
          onSetTossDecision={(decision) => setTossForm((prev) => ({ ...prev, tossDecision: decision }))}
          onAutoFillSquads={handleAutoFillSquads}
          onConfirmSquadsAndToss={handleQuickSquadsAndToss}
        />
      )}
    </div>
  );
};
