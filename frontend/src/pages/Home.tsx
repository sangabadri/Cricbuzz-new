import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  MapPin,
  PlayCircle,
  PlusCircle,
  Trophy,
  Zap,
} from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../api/client';
import type { Match, MatchStatus } from '../types/cricket';
import { StatusBadge } from '../components/common/StatusBadge';
import { useToast } from '../components/common/Toast';
import { getTeamIdentity } from '../utils/teamColors';

export type MatchFilter = 'all' | MatchStatus;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [seeding, setSeeding] = useState(false);

  const {
    data: matches = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['matches', filter],
    queryFn: () =>
      cricketApi.getMatches(filter === 'all' ? undefined : { status: filter }),
    refetchInterval: 4000,
  });

  const handleQuickSeed = async () => {
    try {
      setSeeding(true);
      const res = await cricketApi.seedDemoMatch();
      toast.success('Demo Match seeded: India vs Australia (T20)');
      refetch();
      navigate(`/matches/${res.match_id}/score`);
    } catch (err: unknown) {
      toast.error('Error creating demo match: ' + getApiErrorMessage(err));
    } finally {
      setSeeding(false);
    }
  };

  const liveCount = matches.filter((m) => m.status === 'live').length;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Broadcast Sports Header */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#ea0029]/15 border border-[#ea0029]/30 text-[#ff4d6d] text-xs font-black tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#ea0029] animate-pulse" />
              <span>CRICTRACKER BROADCAST NETWORK</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Cricket Live Scoring & Match Center
            </h1>
            <p className="text-slate-400 text-xs lg:text-sm leading-relaxed">
              Real-time ball-by-ball commentary, active crease analysis, professional umpire scoring deck, and dynamic chase equations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleQuickSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-white bg-[#0070f3] hover:bg-blue-600 active:scale-95 rounded-xl shadow-md border border-blue-400/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 text-yellow-300 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Seeding...' : '⚡ Instant Demo Match'}</span>
            </button>

            <Link
              to="/setup"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-200 bg-[#21262d] hover:bg-[#30363d] active:scale-95 border border-[#30363d] rounded-xl transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>New Match</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#21262d] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {([
            { id: 'all', label: 'All Fixtures' },
            { id: 'live', label: `🔴 Live (${liveCount})` },
            { id: 'innings_break', label: 'Innings Break' },
            { id: 'scheduled', label: 'Upcoming' },
            { id: 'completed', label: 'Finished' },
          ] satisfies readonly { id: MatchFilter; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#0070f3] text-white shadow-sm'
                  : 'bg-[#161b22] text-slate-400 hover:text-white hover:bg-[#21262d] border border-[#21262d]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono font-medium text-slate-500">
          {matches.length} {matches.length === 1 ? 'fixture' : 'fixtures'} listed
        </span>
      </div>

      {/* Match Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Fetching live matches...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-16 bg-[#161b22] rounded-2xl border border-rose-900/50 p-6 space-y-3">
          <p className="text-rose-400 font-bold text-sm">Failed to connect to backend API.</p>
          <p className="text-slate-400 text-xs">
            Verify the FastAPI server is running in Docker on port 8000.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-white rounded-lg text-xs font-bold border border-[#30363d] cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 bg-[#161b22] rounded-2xl border border-[#21262d] p-8 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-slate-400">
            <Trophy className="w-6 h-6 text-sky-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No matches found for this filter</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              Launch a ready-to-score India vs Australia T20 match with 1 click to test the broadcast center!
            </p>
          </div>
          <button
            onClick={handleQuickSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0070f3] hover:bg-blue-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            <span>Launch Instant Demo Match</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map((match: Match) => {
            const teamAName = match.team_a_name || `Team ${match.team_a}`;
            const teamBName = match.team_b_name || `Team ${match.team_b}`;
            const teamAIdentity = getTeamIdentity(teamAName, match.team_a);
            const teamBIdentity = getTeamIdentity(teamBName, match.team_b);

            return (
              <div
                key={match.id}
                className="flex flex-col justify-between bg-[#161b22] rounded-2xl border border-[#21262d] hover:border-[#388bfd]/60 shadow-md hover:shadow-black/50 transition-all group overflow-hidden"
              >
                {/* Card Header: Format, Venue, Status */}
                <div className="p-4 pb-3 border-b border-[#21262d] bg-[#12161f]">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#21262d] text-sky-400 border border-[#30363d]">
                      {match.format.toUpperCase()}
                    </span>
                    <StatusBadge status={match.status} />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{match.venue}</span>
                  </div>
                </div>

                {/* Teams & Scoreboard Preview */}
                <div className="p-4 space-y-3">
                  <div className="space-y-2.5">
                    {/* Team A Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] ${teamAIdentity.badgeBg} border ${teamAIdentity.borderBadge} ${teamAIdentity.textColor}`}
                        >
                          {teamAIdentity.shortCode}
                        </span>
                        <span className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">
                          {teamAName}
                        </span>
                      </div>
                    </div>

                    {/* Team B Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] ${teamBIdentity.badgeBg} border ${teamBIdentity.borderBadge} ${teamBIdentity.textColor}`}
                        >
                          {teamBIdentity.shortCode}
                        </span>
                        <span className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">
                          {teamBName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toss or Win Result Strip */}
                  <div className="text-[11px] font-medium text-slate-400 pt-2 border-t border-[#21262d] min-h-[1.75rem] flex items-center">
                    {match.status === 'completed' && match.winner ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        {match.winner === match.team_a ? teamAName : teamBName} won
                        {match.win_margin_runs
                          ? ` by ${match.win_margin_runs} runs`
                          : match.win_margin_wickets
                          ? ` by ${match.win_margin_wickets} wickets`
                          : ''}
                      </span>
                    ) : match.status === 'completed' ? (
                      <span className="text-amber-400 font-bold">Match Tied</span>
                    ) : match.status === 'live' ? (
                      <span className="text-[#38bdf8] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ea0029] animate-pulse" />
                        Live in progress • Innings live
                      </span>
                    ) : match.toss_winner ? (
                      <span className="truncate">
                        Toss:{' '}
                        <strong className="text-white">
                          {match.toss_winner === match.team_a ? teamAName : teamBName}
                        </strong>{' '}
                        chose to {match.toss_decision}
                      </span>
                    ) : (
                      <span className="text-slate-500">Toss scheduled</span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-[#12161f] border-t border-[#21262d] grid grid-cols-2 gap-2">
                  <Link
                    to={`/matches/${match.id}`}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-slate-300 hover:text-white bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors border border-[#30363d]"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
                    Match Center
                  </Link>

                  <Link
                    to={`/matches/${match.id}/score`}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-white bg-[#0070f3] hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Scorer Pad
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
