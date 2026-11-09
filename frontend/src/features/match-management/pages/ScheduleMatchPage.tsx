import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cricketApi } from '../../../lib/api/client';
import { ScheduleMatchForm } from '../../../components/setup/ScheduleMatchForm';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Skeleton } from '../../../components/shared/Skeleton';

export const ScheduleMatchPage: React.FC = () => {
  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => cricketApi.getTeams({ limit: 100 }),
  });

  const { data: players = [], isLoading: isPlayersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => cricketApi.getPlayers({ limit: 100 }),
  });

  if (isTeamsLoading || isPlayersLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Schedule Cricket Match"
        subtitle="Configure participating teams, match format, total overs, venue, and select Playing XIs."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Matches', href: '/dashboard/matches' },
          { label: 'Schedule' },
        ]}
      />

      <ScheduleMatchForm teams={teams} players={players} />
    </div>
  );
};
