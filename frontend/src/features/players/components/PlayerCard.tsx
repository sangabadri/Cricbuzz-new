import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Player } from '../../../types/cricket';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export interface PlayerCardProps {
  player: Player;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
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

  const battingLabel = player.batting || 'Not specified';
  const bowlingLabel = player.bowling || 'None';

  return (
    <div className="group bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-black text-sm uppercase shadow-sm">
              {player.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <h3 className="font-bold text-base text-white group-hover:text-[#38bdf8] transition-colors">
                {player.name}
              </h3>
              <p className="text-[11px] font-mono text-slate-500">ID #{player.id}</p>
            </div>
          </div>

          <Badge variant={roleBadgeVariant} size="sm">
            {roleLabel}
          </Badge>
        </div>

        {/* Style breakdown */}
        <div className="pt-2 text-xs space-y-1 text-slate-400">
          <p className="flex items-center justify-between">
            <span className="text-slate-500">Batting:</span>
            <span className="capitalize text-slate-300 font-semibold">{battingLabel}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-slate-500">Bowling:</span>
            <span className="capitalize text-slate-300 font-semibold">{bowlingLabel}</span>
          </p>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-[#21262d] flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Player Card</span>
        <Link to={`/players/${player.id}`}>
          <Button variant="secondary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
            Profile
          </Button>
        </Link>
      </div>
    </div>
  );
};
