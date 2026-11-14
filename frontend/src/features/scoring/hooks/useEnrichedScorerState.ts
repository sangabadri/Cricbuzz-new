import { useMemo } from 'react';
import type {
  LiveMatchResponse,
  LiveScorerStateResponse,
  SquadResponse,
} from '../../../types/cricket';

interface UseEnrichedScorerStateParams {
  rawScorerState: LiveScorerStateResponse | undefined;
  liveTicker: LiveMatchResponse | undefined;
  battingSquad: SquadResponse | undefined;
  bowlingSquad: SquadResponse | undefined;
}

export function useEnrichedScorerState({
  rawScorerState,
  liveTicker,
  battingSquad,
  bowlingSquad,
}: UseEnrichedScorerStateParams): LiveScorerStateResponse | undefined {
  return useMemo<LiveScorerStateResponse | undefined>(() => {
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
}
