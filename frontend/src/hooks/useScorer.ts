import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cricketApi } from '../api/client';
import { useToast } from '../components/common/Toast';
import type {
  LiveMatchResponse,
  LiveScorerStateResponse,
  Match,
  SquadResponse,
} from '../types/cricket';
import { useScorerModals, type UseScorerModalsReturn } from './useScorerModals';
import { useScorerActions, type UseScorerActionsReturn } from './useScorerActions';

export { useScorerModals, type UseScorerModalsReturn };
export { useScorerActions, type UseScorerActionsReturn };

export interface UseScorerOptions {
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

function getErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
  return anyErr.response?.data?.detail || anyErr.message || 'Unknown error';
}

export type UseScorerReturn = UseScorerModalsReturn &
  UseScorerActionsReturn & {
    // Navigation & Data
    matchId: number;
    inningsNumber: number;
    setInningsNumber: (num: number) => void;
    match: Match | undefined;
    scorerState: LiveScorerStateResponse | undefined;
    liveTicker: LiveMatchResponse | undefined;
    isStateLoading: boolean;
    isStateError: boolean;
    refetchState: () => void;
    battingSquad: SquadResponse | undefined;
    bowlingSquad: SquadResponse | undefined;
    isTeamABatting: boolean;
  };

export function useScorer(matchId: number, options?: UseScorerOptions): UseScorerReturn {
  const queryClient = useQueryClient();
  const toast = useToast();

  const onNotify = options?.onNotify;
  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      if (onNotify) {
        onNotify(message, type);
      }
      if (type === 'success') {
        toast.success(message);
      } else if (type === 'error') {
        toast.error(message);
      } else {
        toast.info(message);
      }
    },
    [onNotify, toast]
  );

  // Active innings number (can switch between innings 1 and 2 if available)
  const [inningsNumber, setInningsNumber] = useState<number>(1);

  // Decomposed Modal Dialog and Form State
  const modals = useScorerModals();

  // 1. Fetch match metadata
  const { data: match } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => cricketApi.getMatch(matchId),
    enabled: !isNaN(matchId),
  });

  // 2. Fetch live scorer state (polls every 3s)
  const {
    data: rawScorerState,
    isLoading: isStateLoading,
    isError: isStateError,
    refetch: refetchState,
  } = useQuery({
    queryKey: ['scorerState', matchId, inningsNumber],
    queryFn: () => cricketApi.getScorerState(matchId, inningsNumber),
    enabled: !isNaN(matchId),
    refetchInterval: 3000,
  });

  // 3. Fetch live ticker (provides rich batter/bowler figures and boundary stats)
  const { data: liveTicker } = useQuery({
    queryKey: ['liveTicker', matchId],
    queryFn: () => cricketApi.getLiveTicker(matchId),
    enabled: !isNaN(matchId),
    refetchInterval: 3000,
  });

  // 4. Fetch Squads for Player Dropdowns & Name Lookups
  const { data: squadA } = useQuery({
    queryKey: ['squad', matchId, match?.team_a],
    queryFn: () => cricketApi.getSquad(matchId, match!.team_a),
    enabled: !!match?.team_a,
  });

  const { data: squadB } = useQuery({
    queryKey: ['squad', matchId, match?.team_b],
    queryFn: () => cricketApi.getSquad(matchId, match!.team_b),
    enabled: !!match?.team_b,
  });

  // Helpers to get batting and bowling squads
  const isTeamABatting =
    inningsNumber === 1
      ? (match?.toss_winner === match?.team_a && match?.toss_decision === 'bat') ||
        (match?.toss_winner === match?.team_b && match?.toss_decision === 'bowl')
      : !(
          (match?.toss_winner === match?.team_a && match?.toss_decision === 'bat') ||
          (match?.toss_winner === match?.team_b && match?.toss_decision === 'bowl')
        );

  const battingSquad = isTeamABatting ? squadA : squadB;
  const bowlingSquad = isTeamABatting ? squadB : squadA;

  // Enrich rawScorerState with rich player figures from liveTicker and squad names
  const scorerState = useMemo<LiveScorerStateResponse | undefined>(() => {
    if (!rawScorerState) return undefined;

    const isTickerMatchingInnings =
      !liveTicker?.current_innings_number ||
      liveTicker.current_innings_number === rawScorerState.innings_number;

    const isStrikerMatch =
      isTickerMatchingInnings && liveTicker?.striker?.player_id === rawScorerState.striker_id;
    const isNonStrikerMatch =
      isTickerMatchingInnings &&
      liveTicker?.non_striker?.player_id === rawScorerState.non_striker_id;
    const isBowlerMatch =
      isTickerMatchingInnings &&
      liveTicker?.current_bowler?.player_id === rawScorerState.current_bowler_id;

    // Squad player lookups
    const strikerPlayer = battingSquad?.players.find(
      (p) => p.player_id === rawScorerState.striker_id
    );
    const nonStrikerPlayer = battingSquad?.players.find(
      (p) => p.player_id === rawScorerState.non_striker_id
    );
    const bowlerPlayer = bowlingSquad?.players.find(
      (p) => p.player_id === rawScorerState.current_bowler_id
    );

    // Striker figures
    const strikerName =
      (isStrikerMatch ? liveTicker?.striker?.name : undefined) ||
      strikerPlayer?.player_name ||
      rawScorerState.striker_name ||
      (rawScorerState.striker_id ? `Player #${rawScorerState.striker_id}` : 'Striker');
    const strikerRuns =
      (isStrikerMatch ? liveTicker?.striker?.runs : undefined) ??
      rawScorerState.striker_runs ??
      0;
    const strikerBalls =
      (isStrikerMatch ? liveTicker?.striker?.balls : undefined) ??
      rawScorerState.striker_balls ??
      0;

    // Non-Striker figures
    const nonStrikerName =
      (isNonStrikerMatch ? liveTicker?.non_striker?.name : undefined) ||
      nonStrikerPlayer?.player_name ||
      rawScorerState.non_striker_name ||
      (rawScorerState.non_striker_id ? `Player #${rawScorerState.non_striker_id}` : 'Non-Striker');
    const nonStrikerRuns =
      (isNonStrikerMatch ? liveTicker?.non_striker?.runs : undefined) ??
      rawScorerState.non_striker_runs ??
      0;
    const nonStrikerBalls =
      (isNonStrikerMatch ? liveTicker?.non_striker?.balls : undefined) ??
      rawScorerState.non_striker_balls ??
      0;

    // Bowler figures
    const bowlerName =
      (isBowlerMatch ? liveTicker?.current_bowler?.name : undefined) ||
      bowlerPlayer?.player_name ||
      rawScorerState.current_bowler_name ||
      (rawScorerState.current_bowler_id ? `Player #${rawScorerState.current_bowler_id}` : 'Bowler');

    let bowlerOvers = rawScorerState.current_bowler_overs || '0.0';
    if (isBowlerMatch && liveTicker?.current_bowler?.overs) {
      const { completed_overs, balls } = liveTicker.current_bowler.overs;
      bowlerOvers = `${completed_overs}.${balls}`;
    }
    const bowlerRuns =
      (isBowlerMatch ? liveTicker?.current_bowler?.runs : undefined) ??
      rawScorerState.current_bowler_runs ??
      0;
    const bowlerWickets =
      (isBowlerMatch ? liveTicker?.current_bowler?.wickets : undefined) ??
      rawScorerState.current_bowler_wickets ??
      0;

    return {
      ...rawScorerState,
      striker_name: strikerName,
      striker_runs: strikerRuns,
      striker_balls: strikerBalls,
      non_striker_name: nonStrikerName,
      non_striker_runs: nonStrikerRuns,
      non_striker_balls: nonStrikerBalls,
      current_bowler_name: bowlerName,
      current_bowler_overs: bowlerOvers,
      current_bowler_runs: bowlerRuns,
      current_bowler_wickets: bowlerWickets,
    };
  }, [rawScorerState, liveTicker, battingSquad, bowlingSquad]);

  // Invalidate queries after action
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['scorerState', matchId] });
    queryClient.invalidateQueries({ queryKey: ['liveTicker', matchId] });
    queryClient.invalidateQueries({ queryKey: ['scorecard', matchId] });
    queryClient.invalidateQueries({ queryKey: ['deliveries', matchId] });
    queryClient.invalidateQueries({ queryKey: ['match', matchId] });
  }, [queryClient, matchId]);

  // Decomposed Mutation Actions
  const actions = useScorerActions({
    matchId,
    inningsNumber,
    modals,
    notify,
    getErrorMessage,
    invalidateAll,
    scorerState,
    bowlingSquad,
  });

  return {
    matchId,
    inningsNumber,
    setInningsNumber,
    match,
    scorerState,
    liveTicker,
    isStateLoading,
    isStateError,
    refetchState: () => {
      refetchState();
    },
    battingSquad,
    bowlingSquad,
    isTeamABatting,

    // Spread decomposed modal states and action handlers
    ...modals,
    ...actions,
  };
}
