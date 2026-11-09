import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cricketApi } from '../../../lib/api/client';
import { CreateTeamForm } from '../../../components/setup/CreateTeamForm';
import { PageHeader } from '../../../components/shared/PageHeader';

export const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: teams = [], refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => cricketApi.getTeams({ limit: 100 }),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Create New Team"
        subtitle="Register a new cricket team for tournament scheduling and squad configuration."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Teams', href: '/dashboard/teams' },
          { label: 'New Team' },
        ]}
      />

      <CreateTeamForm
        teams={teams}
        onTeamCreated={() => {
          refetch();
          navigate('/dashboard/teams');
        }}
      />
    </div>
  );
};
