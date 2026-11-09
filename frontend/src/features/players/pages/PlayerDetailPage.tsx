import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/shared/Skeleton';

export const PlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const playerId = Number(id);

  const { data: player, isLoading, error } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => cricketApi.getPlayer(playerId),
    enabled: !isNaN(playerId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-2xl mx-auto my-8">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3 max-w-xl mx-auto my-12">
        <h2 className="text-lg font-bold text-rose-400">Player Not Found</h2>
        <p className="text-xs text-slate-400">
          {getApiErrorMessage(error, 'The requested player profile could not be found.')}
        </p>
        <Link to="/players">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Players
          </Button>
        </Link>
      </div>
    );
  }

  const roleBadgeVariant: 'info' | 'destructive' | 'success' | 'warning' =
    player.role === 'batsman'
      ? 'info'
      : player.role === 'bowler'
      ? 'destructive'
      : player.role === 'all-rounder'
      ? 'success'
      : 'warning';

  const roleLabel =
    player.role === 'batsman'
      ? 'Batsman'
      : player.role === 'bowler'
      ? 'Bowler'
      : player.role === 'all-rounder'
      ? 'All-Rounder'
      : 'Wicket-Keeper';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/players">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            All Players
          </Button>
        </Link>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[#21262d]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-black text-xl uppercase shadow-md">
              {player.name
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={roleBadgeVariant} size="sm">
                  {roleLabel}
                </Badge>
                <span className="text-xs font-mono text-slate-500">ID #{player.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{player.name}</h1>
            </div>
          </div>
        </div>

        {/* Detailed Characteristics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Batting Discipline
            </span>
            <p className="text-sm font-bold text-white capitalize">
              {player.batting || 'Not Specified'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Bowling Discipline
            </span>
            <p className="text-sm font-bold text-white capitalize">
              {player.bowling || 'None / Not Applicable'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Primary Role
            </span>
            <p className="text-sm font-bold text-white capitalize">{roleLabel}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#21262d] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Registration Status
            </span>
            <p className="text-sm font-bold text-emerald-400">Active Roster Athlete</p>
          </div>
        </div>
      </div>
    </div>
  );
};
