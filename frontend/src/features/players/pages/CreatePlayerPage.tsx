import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatePlayerForm } from '../../../components/setup/CreatePlayerForm';
import { PageHeader } from '../../../components/shared/PageHeader';

export const CreatePlayerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Register New Player"
        subtitle="Add a new athlete to the cricket player database with batting and bowling styles."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Players', href: '/dashboard/players' },
          { label: 'New Player' },
        ]}
      />

      <CreatePlayerForm
        onPlayerCreated={() => {
          navigate('/dashboard/players');
        }}
      />
    </div>
  );
};
