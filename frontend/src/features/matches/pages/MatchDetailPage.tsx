import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ChevronRight,
  PlayCircle,
  Radio,
  RotateCcw,
  ScrollText,
  Users,
} from 'lucide-react';
import { cricketApi } from '../../../lib/api/client';
import { MatchCenterHero } from '../../../components/match/MatchCenterHero';
import { CreaseTab } from '../../../components/match/CreaseTab';
import { ScorecardTab } from '../../../components/match/ScorecardTab';
import { SquadsTab } from '../../../components/match/SquadsTab';
import { CommentaryTab } from '../../../components/match/CommentaryTab';
import { CommentaryFeed } from '../../../components/match/CommentaryFeed';
import { Button } from '../../../components/ui/Button';

export type MatchCenterTab = 'crease' | 'scorecard' | 'squads' | 'commentary';

export const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);
  const [activeTab, setActiveTab] = useState<MatchCenterTab>('crease');
  const [selectedCommentaryInnings, setSelectedCommentaryInnings] = useState<number | null>(null);

  // 1. Live Match Ticker Query (polls every 3s when match is live)
  const {
    data: ticker,
    isLoading: isTickerLoading,
    isError: isTickerError,
    refetch: refetchLiveTicker,
  } = useQuery({
    queryKey: ['liveTicker', matchId],
    queryFn: () => cricketApi.getLiveTicker(matchId),
    enabled: !isNaN(matchId),
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.status === 'live' || state?.status === 'innings_break' ? 3000 : 15000;
    },
  });

  // 2. Full Match Scorecard Query
  const {
    data: scorecard,
    isLoading: isScorecardLoading,
    isError: isScorecardError,
  } = useQuery({
    queryKey: ['scorecard', matchId],
    queryFn: () => cricketApi.getScorecard(matchId),
    enabled: !isNaN(matchId),
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.status === 'live' ? 5000 : false;
    },
  });

  // Determine current innings to show deliveries for
  const currentInningsNumber = ticker?.current_innings_number || 1;
  const commentaryInnings = selectedCommentaryInnings ?? currentInningsNumber;

  // 3. Deliveries Query
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', matchId, commentaryInnings],
    queryFn: () => cricketApi.getDeliveries(matchId, commentaryInnings),
    enabled: !isNaN(matchId) && !!commentaryInnings,
    refetchInterval: () => (ticker?.status === 'live' ? 3000 : false),
  });

  // 4. Squad Queries for Team A & Team B
  const { data: squadA } = useQuery({
    queryKey: ['squad', matchId, scorecard?.team_a_id],
    queryFn: () => cricketApi.getSquad(matchId, scorecard!.team_a_id),
    enabled: !isNaN(matchId) && !!scorecard?.team_a_id,
  });

  const { data: squadB } = useQuery({
    queryKey: ['squad', matchId, scorecard?.team_b_id],
    queryFn: () => cricketApi.getSquad(matchId, scorecard!.team_b_id),
    enabled: !isNaN(matchId) && !!scorecard?.team_b_id,
  });

  if (isTickerLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <div className="h-64 rounded-2xl bg-slate-900 border border-[#21262d] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 h-96 rounded-2xl bg-slate-900 border border-[#21262d] animate-pulse" />
          <div className="hidden lg:block lg:col-span-5 h-96 rounded-2xl bg-slate-900 border border-[#21262d] animate-pulse" />
        </div>
      </div>
    );
  }

  if (isTickerError) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 lg:p-8 bg-[#161b22] border border-rose-500/30 rounded-2xl shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[#ea0029]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Live Match Unavailable</h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
            We couldn't connect to the match server. Check your connection or retry.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => refetchLiveTicker()}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Retry Connection
          </Button>
          <Link to="/matches">
            <Button variant="secondary" size="sm">
              Return to Matches
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!ticker) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-rose-400 font-bold text-lg">Match not found.</p>
        <Link to="/matches" className="text-sky-400 underline text-sm">
          Return to Matches
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Scorer Action Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/matches" className="hover:text-white transition-colors">
            Matches
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-[#38bdf8] font-bold">Match #{matchId} Center</span>
        </div>

        <Link to={`/matches/${matchId}/score`}>
          <Button
            variant="destructive"
            size="sm"
            leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
          >
            Scorer Console
          </Button>
        </Link>
      </div>

      {/* Main Broadcast Match Header Banner */}
      <MatchCenterHero ticker={ticker} scorecard={scorecard} />

      {/* Split-Screen Broadcast Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Scorecards & Crease HUD) - 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-[#21262d] gap-2 overflow-x-auto">
            {([
              { id: 'crease', label: 'Crease Analysis', icon: Radio, mobileOnly: false },
              { id: 'scorecard', label: 'Full Scorecard', icon: ScrollText, mobileOnly: false },
              { id: 'commentary', label: 'Commentary', icon: Activity, mobileOnly: true },
              { id: 'squads', label: 'Playing XI & Squads', icon: Users, mobileOnly: false },
            ] as const satisfies readonly { id: MatchCenterTab; label: string; icon: React.ComponentType<{ className?: string }>; mobileOnly: boolean }[]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    tab.mobileOnly ? 'lg:hidden ' : ''
                  }${
                    activeTab === tab.id
                      ? 'border-[#0070f3] text-sky-400 bg-[#0070f3]/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Crease View */}
          {activeTab === 'crease' && <CreaseTab ticker={ticker} />}

          {/* Tab 2: Full Detailed Scorecard */}
          {activeTab === 'scorecard' && (
            <ScorecardTab
              scorecard={scorecard}
              isLoading={isScorecardLoading}
              isError={isScorecardError}
            />
          )}

          {/* Tab 3: Squads */}
          {activeTab === 'squads' && (
            <SquadsTab
              teamAName={ticker.team_a_name}
              teamBName={ticker.team_b_name}
              scorecard={scorecard}
              squadA={squadA}
              squadB={squadB}
            />
          )}

          {/* Mobile Tab 4: Commentary */}
          {activeTab === 'commentary' && (
            <CommentaryTab
              className="lg:hidden"
              deliveries={deliveries}
              title="Live Commentary Stream"
              inningsNumber={commentaryInnings}
              availableInnings={scorecard?.innings.map((i) => i.innings_number) || [1]}
              onInningsChange={(inn) => setSelectedCommentaryInnings(inn)}
            />
          )}
        </div>

        {/* Right Column (Persistent Live Ball-by-Ball Feed) - 5 cols */}
        <div className="hidden lg:block lg:col-span-5 sticky top-20">
          <CommentaryFeed
            deliveries={deliveries}
            title="Live Commentary Stream"
            inningsNumber={commentaryInnings}
            availableInnings={scorecard?.innings.map((i) => i.innings_number) || [1]}
            onInningsChange={(inn) => setSelectedCommentaryInnings(inn)}
          />
        </div>
      </div>
    </div>
  );
};
