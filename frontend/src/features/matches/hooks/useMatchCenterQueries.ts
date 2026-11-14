import { useQuery } from '@tanstack/react-query';
import { cricketApi } from '../../../lib/api-client';

export function useMatchCenterQueries(
  matchId: number,
  selectedCommentaryInnings: number | null
) {
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
