import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, Shield, Trophy, Users } from 'lucide-react';
import type { Match, Player, Team } from '../../../types/cricket';

interface DashboardMetricsGridProps {
  matches: Match[];
  teams: Team[];
  players: Player[];
  isMatchesLoading: boolean;
  isTeamsLoading: boolean;
  isPlayersLoading: boolean;
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({
  matches,
  teams,
  players,
  isMatchesLoading,
  isTeamsLoading,
  isPlayersLoading,
}) => {
  const liveMatches = matches.filter((m) => m.status === 'live' || m.status === 'innings_break');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  return (
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
  );
};
