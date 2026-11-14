import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Zap } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api-client';
import { useToast } from '../../../components/common/Toast';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { DashboardMetricsGrid } from '../components/DashboardMetricsGrid';
import { DashboardWorkflowsGrid } from '../components/DashboardWorkflowsGrid';
import { DashboardRecentMatchesTable } from '../components/DashboardRecentMatchesTable';

export const DashboardOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);

  const { data: matches = [], isLoading: isMatchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => cricketApi.getMatches(),
    refetchInterval: 5000,
  });

  const { data: teams = [], isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => cricketApi.getTeams({ limit: 100 }),
  });

  const { data: players = [], isLoading: isPlayersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => cricketApi.getPlayers({ limit: 100 }),
  });

  const handleQuickSeed = async () => {
    try {
      setSeeding(true);
      const res = await cricketApi.seedDemoMatch();
      toast.success('Demo Match created: India vs Australia');
      navigate(`/matches/${res.match_id}/score`);
    } catch (err: unknown) {
      toast.error('Error creating demo match: ' + getApiErrorMessage(err));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Control Center"
        subtitle="Manage fixtures, configure squads, conduct tosses, and orchestrate live scoring operations."
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/dashboard/matches/new">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
              >
                Schedule Match
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleQuickSeed}
              isLoading={seeding}
              leftIcon={<Zap className="w-3.5 h-3.5 text-yellow-300" />}
            >
              ⚡ Demo Match
            </Button>
          </div>
        }
      />

      <DashboardMetricsGrid
        matches={matches}
        teams={teams}
        players={players}
        isMatchesLoading={isMatchesLoading}
        isTeamsLoading={isTeamsLoading}
        isPlayersLoading={isPlayersLoading}
      />

      <DashboardWorkflowsGrid />

      <DashboardRecentMatchesTable
        matches={matches}
        isLoading={isMatchesLoading}
      />
    </div>
  );
};
