import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, Trophy } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { MatchCard } from '../../matches/components/MatchCard';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/shared/Skeleton';
import { getTeamIdentity } from '../../../utils/teamColors';

export const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);

  const { data: team, isLoading: isTeamLoading, error: teamError } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => cricketApi.getTeam(teamId),
    enabled: !isNaN(teamId),
  });

  const { data: teamMatches = [], isLoading: isMatchesLoading } = useQuery({
    queryKey: ['matches', { team_id: teamId }],
    queryFn: () => cricketApi.getMatches({ team_id: teamId }),
    enabled: !isNaN(teamId),
  });

  if (isTeamLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (teamError || !team) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3 max-w-xl mx-auto my-12">
        <h2 className="text-lg font-bold text-rose-400">Team Not Found</h2>
        <p className="text-xs text-slate-400">
          {getApiErrorMessage(teamError, 'The requested team profile could not be found.')}
        </p>
        <Link to="/teams">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Teams
          </Button>
        </Link>
      </div>
    );
  }

  const identity = getTeamIdentity(team.name, team.id);
  const liveCount = teamMatches.filter((m) => m.status === 'live' || m.status === 'innings_break').length;
  const completedCount = teamMatches.filter((m) => m.status === 'completed').length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center gap-5">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl uppercase tracking-wider ${identity.badgeBg} border ${identity.borderBadge} ${identity.textColor} shadow-lg`}
          >
            {identity.shortCode}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                Cricket Team Profile
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-500">ID #{team.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{team.name}</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Abbreviation: <span className="text-slate-200">{identity.shortCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/dashboard/matches/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarPlus className="w-3.5 h-3.5 text-white" />}
            >
              Schedule Match
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Matches</p>
          <p className="text-2xl font-black text-white mt-1">{teamMatches.length}</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">In Play (Live)</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{liveCount}</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Completed</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{completedCount}</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Scheduled</p>
          <p className="text-2xl font-black text-sky-400 mt-1">
            {teamMatches.length - liveCount - completedCount}
          </p>
        </div>
      </div>

      {/* Match History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>Match History & Fixtures</span>
          </h2>
          <span className="text-xs text-slate-400 font-semibold">{teamMatches.length} matches found</span>
        </div>

        {isMatchesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : teamMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
            No matches scheduled or recorded for {team.name} yet.
          </div>
        )}
      </div>
    </div>
  );
};
