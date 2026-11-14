import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cricketApi, getApiErrorMessage } from '../lib/api-client';
import { useToast } from '../components/common/Toast';
import type {
  LiveMatchResponse,
  LiveScorerStateResponse,
  Match,
  SquadResponse,
} from '../types/cricket';
import { useScorerModals, type UseScorerModalsReturn } from './useScorerModals';
import { useScorerActions, type UseScorerActionsReturn } from './useScorerActions';
import { useEnrichedScorerState } from '../features/scoring/hooks/useEnrichedScorerState';

export { useScorerModals, type UseScorerModalsReturn };
export { useScorerActions, type UseScorerActionsReturn };

export interface UseScorerOptions {
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
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
  const scorerState = useEnrichedScorerState({
    rawScorerState,
    liveTicker,
    battingSquad,
    bowlingSquad,
  });

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
    getErrorMessage: getApiErrorMessage,
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
