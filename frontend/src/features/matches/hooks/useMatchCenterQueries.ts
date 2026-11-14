import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cricketApi, getMatchLiveStreamUrl } from '../../../lib/api-client';

export function useMatchCenterQueries(
  matchId: number,
  selectedCommentaryInnings: number | null
) {
  const queryClient = useQueryClient();

  // 1. Live Match Ticker Query (push-invalidated via SSE, with 30s safety fallback when match is live)
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
      return state?.status === 'live' || state?.status === 'innings_break' ? 30000 : 60000;
    },
  });

  // Real-Time Server-Sent Events (SSE) push subscription for live matches
  useEffect(() => {
    if (isNaN(matchId) || typeof window === 'undefined' || !('EventSource' in window)) {
      return;
    }
    const isLive = ticker?.status === 'live' || ticker?.status === 'innings_break';
    if (!isLive) {
      return;
    }

    const eventSource = new EventSource(getMatchLiveStreamUrl(matchId));

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['liveTicker', matchId] });
      queryClient.invalidateQueries({ queryKey: ['scorecard', matchId] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', matchId] });
    };

    eventSource.addEventListener('delivery_recorded', handleUpdate);
    eventSource.addEventListener('delivery_patched', handleUpdate);
    eventSource.addEventListener('delivery_undone', handleUpdate);
    eventSource.addEventListener('bowler_changed', handleUpdate);
    eventSource.addEventListener('batter_changed', handleUpdate);
    eventSource.addEventListener('strike_swapped', handleUpdate);
    eventSource.addEventListener('match_updated', handleUpdate);

    return () => {
      eventSource.close();
    };
  }, [matchId, ticker?.status, queryClient]);

  // 2. Full Match Scorecard Query (push-invalidated via SSE, with 30s safety fallback when live)
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
      return state?.status === 'live' ? 30000 : false;
    },
  });

  // Determine current innings to show deliveries for
  const currentInningsNumber = ticker?.current_innings_number || 1;
  const commentaryInnings = selectedCommentaryInnings ?? currentInningsNumber;

  // 3. Deliveries Query (push-invalidated via SSE, with 30s safety fallback when live)
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', matchId, commentaryInnings],
    queryFn: () => cricketApi.getDeliveries(matchId, commentaryInnings),
    enabled: !isNaN(matchId) && !!commentaryInnings,
    refetchInterval: () => (ticker?.status === 'live' ? 30000 : false),
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

  const availableInnings = scorecard?.innings.map((i) => i.innings_number) || [1];

  return {
    ticker,
    isTickerLoading,
    isTickerError,
    refetchLiveTicker,
    scorecard,
    isScorecardLoading,
    isScorecardError,
    deliveries,
    squadA,
    squadB,
    commentaryInnings,
    availableInnings,
  };
}
