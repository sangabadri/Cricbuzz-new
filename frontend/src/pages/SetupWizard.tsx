import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Layers, Shield, Trophy, UserPlus } from 'lucide-react';
import { cricketApi } from '../api/client';
import { CreateTeamForm } from '../components/setup/CreateTeamForm';
import { CreatePlayerForm } from '../components/setup/CreatePlayerForm';
import { ScheduleMatchForm } from '../components/setup/ScheduleMatchForm';
import type { MatchScheduleFormData, TossFormData } from '../components/setup/ScheduleMatchForm';
import type { PlayerFormData } from '../components/setup/CreatePlayerForm';

export type { MatchScheduleFormData, TossFormData, PlayerFormData };
export interface TeamFormData {
  name: string;
}

export const SetupWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState<'match' | 'team' | 'player'>('match');

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

      {/* Feature components */}
      {activeStep === 'match' && (
        <ScheduleMatchForm teams={teams} players={players} />
      )}

      {activeStep === 'team' && (
        <CreateTeamForm teams={teams} onTeamCreated={() => refetchTeams()} />
      )}

      {activeStep === 'player' && (
        <CreatePlayerForm onPlayerCreated={() => refetchPlayers()} />
      )}
    </div>
  );
};
