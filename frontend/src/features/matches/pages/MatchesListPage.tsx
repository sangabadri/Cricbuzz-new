import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Search, Trophy } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { MatchCard } from '../components/MatchCard';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Tabs } from '../../../components/ui/Tabs';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Skeleton } from '../../../components/shared/Skeleton';

type MatchFilterTab = 'all' | 'live' | 'upcoming' | 'completed';

export const MatchesListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MatchFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ['matches'],
    queryFn: () => cricketApi.getMatches(),
    refetchInterval: 5000,
  });

  const filteredMatches = matches.filter((match) => {
    // 1. Tab filter
    if (activeTab === 'live' && !(match.status === 'live' || match.status === 'innings_break')) {
      return false;
    }
    if (activeTab === 'upcoming' && !(match.status === 'scheduled' || match.status === 'toss_done')) {
      return false;
    }
    if (activeTab === 'completed' && match.status !== 'completed') {
      return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const teamAName = match.team_a_name?.toLowerCase() || '';
      const teamBName = match.team_b_name?.toLowerCase() || '';
      const format = match.format.toLowerCase();
      return teamAName.includes(q) || teamBName.includes(q) || format.includes(q);
    }

    return true;
  });

  const liveCount = matches.filter((m) => m.status === 'live' || m.status === 'innings_break').length;
  const upcomingCount = matches.filter((m) => m.status === 'scheduled' || m.status === 'toss_done').length;
  const completedCount = matches.filter((m) => m.status === 'completed').length;

  const tabs = [
    { id: 'all' as const, label: 'All Matches', count: matches.length },
    { id: 'live' as const, label: 'Live Now', count: liveCount },
    { id: 'upcoming' as const, label: 'Upcoming', count: upcomingCount },
    { id: 'completed' as const, label: 'Completed', count: completedCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cricket Match Fixtures"
        subtitle="Explore active live matches, international fixtures, and tournament results."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Matches' }]}
        actions={
          <div className="flex items-center gap-2">
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
        }
      />

      {/* Filter Bar: Tabs & Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="w-full sm:w-64 shrink-0">
          <Input
            placeholder="Search teams or format..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
          <p className="text-sm font-bold text-rose-400">Error loading fixtures</p>
          <p className="text-xs text-slate-400">{getApiErrorMessage(error)}</p>
        </div>
      ) : filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Trophy className="w-6 h-6 text-slate-400" />}
          title={searchQuery ? 'No matching fixtures found' : 'No matches in this category'}
          description={
            searchQuery
              ? `No fixtures matched your search for "${searchQuery}". Try a different team name.`
              : 'There are no matches currently listed under this tab.'
          }
          actionLabel="Schedule New Match"
          onAction={() => (window.location.href = '/dashboard/matches/new')}
        />
      )}
    </div>
  );
};
