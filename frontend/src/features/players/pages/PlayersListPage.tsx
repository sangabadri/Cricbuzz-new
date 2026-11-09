import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, Search, Users } from 'lucide-react';
import type { Role } from '../../../types/cricket';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { PlayerCard } from '../components/PlayerCard';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/shared/Skeleton';

type PlayerRoleTab = 'all' | 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper';

export const PlayersListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlayerRoleTab>('all');
  const [search, setSearch] = useState('');

  const roleParam = activeTab === 'all' ? undefined : (activeTab as Role);

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
    { id: 'all' as const, label: 'All Roles' },
    { id: 'batsman' as const, label: 'Batsmen' },
    { id: 'bowler' as const, label: 'Bowlers' },
    { id: 'all-rounder' as const, label: 'All-Rounders' },
    { id: 'wicketkeeper' as const, label: 'Keepers' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cricket Players"
        subtitle="Explore cricket athletes, batting and bowling disciplines, and registered rosters."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Players' }]}
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

      {/* Filter Bar: Role Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="w-full sm:w-64 shrink-0">
          <Input
            placeholder="Search player name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>
      </div>

      {/* Players Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
          <p className="text-sm font-bold text-rose-400">Failed to load players</p>
          <p className="text-xs text-slate-400">{getApiErrorMessage(error)}</p>
        </div>
      ) : players.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="w-6 h-6 text-slate-400" />}
          title={search ? 'No players match your search' : 'No players found'}
          description={
            search
              ? `We couldn't find any players matching "${search}".`
              : 'Add players to your roster to configure match playing XIs.'
          }
          actionLabel="Create Player"
          onAction={() => (window.location.href = '/dashboard/players/new')}
        />
      )}
    </div>
  );
};
