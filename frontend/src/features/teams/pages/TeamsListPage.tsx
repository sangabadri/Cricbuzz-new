import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, Search, Shield } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { TeamCard } from '../components/TeamCard';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/shared/Skeleton';

export const TeamsListPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading, error } = useQuery({
    queryKey: ['teams', search],
    queryFn: () => cricketApi.getTeams({ search: search.trim() || undefined, limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cricket Teams"
        subtitle="Browse participating international, domestic, and franchise cricket squads."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Teams' }]}
        actions={
          <Link to="/dashboard/teams/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              Add New Team
            </Button>
          </Link>
        }
      />

      {/* Search Toolbar */}
      <div className="max-w-md">
        <Input
          placeholder="Search team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
        />
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
          <p className="text-sm font-bold text-rose-400">Failed to load teams</p>
          <p className="text-xs text-slate-400">{getApiErrorMessage(error)}</p>
        </div>
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Shield className="w-6 h-6 text-slate-400" />}
          title={search ? 'No teams match your search' : 'No teams registered yet'}
          description={
            search
              ? `We couldn't find any teams matching "${search}".`
              : 'Add your first cricket team to begin scheduling matches and building squads.'
          }
          actionLabel="Create Team"
          onAction={() => (window.location.href = '/dashboard/teams/new')}
        />
      )}
    </div>
  );
};
