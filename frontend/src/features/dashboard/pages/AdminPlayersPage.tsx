import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, PlusCircle, Search } from 'lucide-react';
import type { Role } from '../../../types/cricket';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Tabs } from '../../../components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { Skeleton } from '../../../components/shared/Skeleton';

export const AdminPlayersPage: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const roleParam = roleFilter === 'all' ? undefined : (roleFilter as Role);

  const { data: players = [], isLoading, error } = useQuery({
    queryKey: ['players', roleParam, search],
    queryFn: () =>
      cricketApi.getPlayers({
        role: roleParam,
        search: search.trim() || undefined,
        limit: 100,
      }),
  });

  const tabs = [
    { id: 'all', label: 'All Players' },
    { id: 'batsman', label: 'Batsmen' },
    { id: 'bowler', label: 'Bowlers' },
    { id: 'all-rounder', label: 'All-Rounders' },
    { id: 'wicketkeeper', label: 'Wicket-Keepers' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Roster Management"
        subtitle="View, create, and organize athlete profiles across batting, bowling, and keeping roles."
        actions={
          <Link to="/dashboard/players/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              Add New Player
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <Tabs tabs={tabs} activeTab={roleFilter} onChange={setRoleFilter} />

        <div className="w-full sm:w-64 shrink-0">
          <Input
            placeholder="Filter players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
          <p className="text-sm font-bold text-rose-400">Error loading players</p>
          <p className="text-xs text-slate-400">{getApiErrorMessage(error)}</p>
        </div>
      ) : players.length > 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Batting Style</TableHead>
                <TableHead>Bowling Style</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => {
                const roleBadgeVariant: 'info' | 'destructive' | 'success' | 'warning' =
                  player.role === 'batsman'
                    ? 'info'
                    : player.role === 'bowler'
                    ? 'destructive'
                    : player.role === 'all-rounder'
                    ? 'success'
                    : 'warning';

                return (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs sm:text-sm">{player.name}</p>
                          <span className="text-[10px] font-mono text-slate-500">#{player.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant} size="sm">
                        {player.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize text-slate-300">
                        {player.batting || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize text-slate-300">
                        {player.bowling || 'None'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/players/${player.id}`}>
                        <Button variant="secondary" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                          Profile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
          No players found. Click "Add New Player" to add athletes.
        </div>
      )}
    </div>
  );
};
