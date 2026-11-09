import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarPlus,
  ChevronRight,
  PlusCircle,
  Radio,
  Settings,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { useToast } from '../../../components/common/Toast';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Skeleton } from '../../../components/shared/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';

export const DashboardOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);

  const { data: matches = [], isLoading: isMatchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => cricketApi.getMatches(),
    refetchInterval: 5000,
  });

  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => cricketApi.getTeams({ limit: 100 }),
  });

  const { data: players = [], isLoading: isPlayersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => cricketApi.getPlayers({ limit: 100 }),
  });

  const handleQuickSeed = async () => {
    try {
      setSeeding(true);
      const res = await cricketApi.seedDemoMatch();
      toast.success('Demo Match created: India vs Australia');
      navigate(`/matches/${res.match_id}/score`);
    } catch (err: unknown) {
      toast.error('Error creating demo match: ' + getApiErrorMessage(err));
    } finally {
      setSeeding(false);
    }
  };

  const liveMatches = matches.filter((m) => m.status === 'live' || m.status === 'innings_break');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Control Center"
        subtitle="Manage fixtures, configure squads, conduct tosses, and orchestrate live scoring operations."
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/dashboard/matches/new">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
              >
                Schedule Match
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleQuickSeed}
              isLoading={seeding}
              leftIcon={<Zap className="w-3.5 h-3.5 text-yellow-300" />}
            >
              ⚡ Demo Match
            </Button>
          </div>
        }
      />

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Link
          to="/dashboard/matches"
          className="bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Matches</span>
            <Trophy className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            {isMatchesLoading ? '...' : matches.length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {completedMatches.length} completed
          </span>
        </Link>

        <Link
          to="/dashboard/matches"
          className="bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Live In Play</span>
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-400 mt-2">
            {isMatchesLoading ? '...' : liveMatches.length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Active scoring sessions</span>
        </Link>

        <Link
          to="/dashboard/teams"
          className="bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cricket Teams</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            {isTeamsLoading ? '...' : teams.length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered squads</span>
        </Link>

        <Link
          to="/dashboard/players"
          className="bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-2xl p-5 shadow-lg transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Players</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            {isPlayersLoading ? '...' : players.length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Athletes in roster</span>
        </Link>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Management Workflows</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/dashboard/matches/new"
            className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-blue-500/70 transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Schedule Match</p>
              <p className="text-[11px] text-slate-400">New fixture & venue</p>
            </div>
          </Link>

          <Link
            to="/dashboard/setup"
            className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-emerald-500/70 transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Setup & Toss</p>
              <p className="text-[11px] text-slate-400">Playing XI & coin toss</p>
            </div>
          </Link>

          <Link
            to="/dashboard/teams/new"
            className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-amber-500/70 transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Create Team</p>
              <p className="text-[11px] text-slate-400">Add team profile</p>
            </div>
          </Link>

          <Link
            to="/dashboard/players/new"
            className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-purple-500/70 transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Add Player</p>
              <p className="text-[11px] text-slate-400">Register new athlete</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Matches Management Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
          <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-4 h-4 text-sky-400" />
            <span>Recent Fixtures</span>
          </h3>
          <Link
            to="/dashboard/matches"
            className="text-xs font-bold text-[#38bdf8] hover:text-white flex items-center gap-1"
          >
            <span>View All ({matches.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isMatchesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        ) : matches.length > 0 ? (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match</TableHead>
                  <TableHead>Format & Overs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.slice(0, 8).map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {match.team_a_name || `Team ${match.team_a}`} vs {match.team_b_name || `Team ${match.team_b}`}
                        </span>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ID #{match.id} • {match.venue}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="uppercase font-bold text-xs text-sky-400">
                        {match.format} ({match.format === 't20' ? 20 : 50} ov)
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={match.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/matches/${match.id}/score`}>
                          <Button variant="destructive" size="sm">
                            Score Console
                          </Button>
                        </Link>
                        <Link to={`/matches/${match.id}`}>
                          <Button variant="secondary" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
            No matches found. Use the Schedule Match button or Demo Match to create fixtures.
          </div>
        )}
      </div>
    </div>
  );
};
