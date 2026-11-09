import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { useToast } from '../../../components/common/Toast';
import { HeroSection } from '../components/HeroSection';
import { LiveMatchesCarousel } from '../components/LiveMatchesCarousel';
import { RecentResultsSection } from '../components/RecentResultsSection';
import { Skeleton } from '../../../components/shared/Skeleton';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);

  // Fetch all matches with 4s poll interval for real-time live score updates
  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ['matches'],
    queryFn: () => cricketApi.getMatches(),
    refetchInterval: 4000,
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

  // Find a live match or the latest scheduled/completed match to feature in Hero
  const featuredMatch =
    matches.find((m) => m.status === 'live' || m.status === 'innings_break') ||
    matches[0] ||
    null;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-96 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
        <h2 className="text-lg font-bold text-rose-400">Unable to load cricket fixtures</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {getApiErrorMessage(error, 'An unexpected error occurred while connecting to the FastAPI backend.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8">
      {/* Hero Showcase */}
      <HeroSection
        featuredMatch={featuredMatch}
        onQuickSeed={handleQuickSeed}
        isSeeding={seeding}
      />

      {/* Live & In-Play Matches Carousel */}
      <LiveMatchesCarousel
        matches={matches}
        onQuickSeed={handleQuickSeed}
        isSeeding={seeding}
      />

      {/* Upcoming Fixtures and Completed Results Feed */}
      <RecentResultsSection matches={matches} />
    </div>
  );
};
