import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cricketApi } from '../api/client';
import type {
  DeliveryCreate,
  ExtraType,
  LiveScorerStateResponse,
  SquadResponse,
  WicketType,
} from '../types/cricket';
import type { UseScorerModalsReturn } from './useScorerModals';

export interface WicketSubmissionPayload {
  wicketType?: WicketType;
  playerOutId?: number;
  fielderId?: number;
  runs?: number;
}

export interface StartInningsPayload {
  strikerId?: number;
  nonStrikerId?: number;
  bowlerId?: number;
}

export interface UseScorerActionsOptions {
  matchId: number;
  inningsNumber: number;
  modals: UseScorerModalsReturn;
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
  getErrorMessage: (err: unknown) => string;
  invalidateAll: () => void;
  scorerState?: LiveScorerStateResponse;
  bowlingSquad?: SquadResponse;
}

export interface UseScorerActionsReturn {
  // Keypad Handlers
  handleRuns: (runs: number) => void;
  handleExtra: (extraType: ExtraType, extrasCount?: number, runs?: number) => void;
  handleWicketSubmit: (payload?: WicketSubmissionPayload) => void;
  handleStartInningsSubmit: (payload?: StartInningsPayload) => void;
  handleSwapStrike: () => void;
  handleUndoDelivery: () => void;
  handleSetBowler: (bowlerId: number) => void;
  handleSetBatter: (playerId: number) => void;
  handleAwardMOM: (playerId?: number) => void;

  // Pending / Loading Indicators
  isRecordingDelivery: boolean;
  isUndoing: boolean;
  isSwappingStrike: boolean;
  isSettingBowler: boolean;
  isSettingBatter: boolean;
  isStartingInnings: boolean;
  isAwardingMOM: boolean;
}

export function useScorerActions({
  matchId,
  inningsNumber,
  modals,
  notify,
  getErrorMessage,
  invalidateAll,
  scorerState,
  bowlingSquad,
}: UseScorerActionsOptions): UseScorerActionsReturn {
  const {
    setShowBowlerModal,
    setShowIncomingBatterModal,
    setShowWicketModal,
    setShowStartInningsModal,
    wicketType: modalWicketType,
    playerOutId: modalPlayerOutId,
    fielderId: modalFielderId,
    wicketRuns: modalWicketRuns,
    resetWicketForm,
    startStrikerId: modalStartStrikerId,
    startNonStrikerId: modalStartNonStrikerId,
    startBowlerId: modalStartBowlerId,
    momPlayerId: modalMomPlayerId,
  } = modals;

  // Mutations
  const recordDeliveryMutation = useMutation({
    mutationFn: (data: DeliveryCreate) =>
      cricketApi.recordDelivery(matchId, inningsNumber, data),
    onSuccess: (updatedState) => {
      invalidateAll();
      if (updatedState.next_action === 'SET_BOWLER') {
        setShowBowlerModal(true);
      } else if (updatedState.next_action === 'SET_BATTER') {
        setShowIncomingBatterModal(true);
      }
    },
    onError: (err: unknown) => {
      notify('Error recording delivery: ' + getErrorMessage(err), 'error');
    },
  });

  const undoMutation = useMutation({
    mutationFn: () => cricketApi.undoLastDelivery(matchId, inningsNumber),
    onSuccess: () => {
      invalidateAll();
    },
    onError: (err: unknown) => {
      notify('Error undoing delivery: ' + getErrorMessage(err), 'error');
    },
  });

  const swapStrikeMutation = useMutation({
    mutationFn: () => cricketApi.swapStrike(matchId, inningsNumber),
    onSuccess: () => {
      invalidateAll();
    },
    onError: (err: unknown) => {
      notify('Error swapping strike: ' + getErrorMessage(err), 'error');
    },
  });

  const setBowlerMutation = useMutation({
    mutationFn: (bId: number) => cricketApi.setBowler(matchId, inningsNumber, bId),
    onSuccess: () => {
      setShowBowlerModal(false);
      invalidateAll();
    },
    onError: (err: unknown) => {
      notify('Error assigning bowler: ' + getErrorMessage(err), 'error');
    },
  });

  const setBatterMutation = useMutation({
    mutationFn: (pId: number) => cricketApi.setIncomingBatter(matchId, inningsNumber, pId),
    onSuccess: () => {
      setShowIncomingBatterModal(false);
      invalidateAll();
    },
    onError: (err: unknown) => {
      notify('Error assigning batter: ' + getErrorMessage(err), 'error');
    },
  });

  const startInningsMutation = useMutation({
    mutationFn: (req: { sId: number; nsId: number; bId: number }) =>
      cricketApi.startInnings(matchId, inningsNumber, req.sId, req.nsId, req.bId),
    onSuccess: () => {
      setShowStartInningsModal(false);
      invalidateAll();
    },
    onError: (err: unknown) => {
      notify('Error starting innings: ' + getErrorMessage(err), 'error');
    },
  });

  const awardMOMMutation = useMutation({
    mutationFn: (pId: number) => cricketApi.awardMOM(matchId, pId),
    onSuccess: () => {
      invalidateAll();
      notify('Player of the Match awarded successfully!', 'success');
    },
    onError: (err: unknown) => {
      notify('Error awarding MOM: ' + getErrorMessage(err), 'error');
    },
  });

  // Destructured stable mutation triggers from React Query
  const { mutate: recordDelivery } = recordDeliveryMutation;
  const { mutate: undoDelivery } = undoMutation;
  const { mutate: swapStrike } = swapStrikeMutation;
  const { mutate: setBowler } = setBowlerMutation;
  const { mutate: setBatter } = setBatterMutation;
  const { mutate: startInnings } = startInningsMutation;
  const { mutate: awardMOM } = awardMOMMutation;

  // Keypad Handlers wrapped in useCallback with stable dependencies
  const handleRuns = useCallback((runs: number) => {
    recordDelivery({ runs });
  }, [recordDelivery]);

  const handleExtra = useCallback((extraType: ExtraType, extrasCount = 1, runs = 0) => {
    recordDelivery({
      extra_type: extraType,
      extras: extrasCount,
      runs,
    });
  }, [recordDelivery]);

  const designatedKeeperId = bowlingSquad?.wicket_keeper_id;
  const activeStrikerId = scorerState?.striker_id;
  const activeNonStrikerId = scorerState?.non_striker_id;

  const handleWicketSubmit = useCallback((payload?: WicketSubmissionPayload) => {
    if (!activeStrikerId) {
      notify('No active striker on crease.', 'error');
      return;
    }

    const effectiveWicketType = payload?.wicketType ?? modalWicketType ?? 'bowled';
    const effectivePlayerOutIdParam = payload?.playerOutId ?? modalPlayerOutId;
    const effectiveFielderIdParam = payload?.fielderId ?? modalFielderId;
    const effectiveRunsParam = payload?.runs ?? modalWicketRuns ?? 0;

    // Determine final player_out_id: striker for all dismissals except run_out
    let finalPlayerOutId: number | undefined;
    if (effectiveWicketType === 'run_out') {
      finalPlayerOutId = effectivePlayerOutIdParam ?? activeStrikerId;
    } else {
      finalPlayerOutId = activeStrikerId;
    }

    // Determine final fielder_id: designated keeper for stumped, selected fielder for caught/run_out, none for others
    let finalFielderId: number | undefined;
    if (effectiveWicketType === 'stumped') {
      finalFielderId =
        typeof designatedKeeperId === 'number'
          ? designatedKeeperId
          : undefined;
    } else if (effectiveWicketType === 'caught' || effectiveWicketType === 'run_out') {
      finalFielderId = effectiveFielderIdParam;
    } else {
      finalFielderId = undefined;
    }

    // Runs completed before wicket: strictly applicable to run_out
    const finalRuns = effectiveWicketType === 'run_out' ? effectiveRunsParam : 0;

    if (effectiveWicketType === 'run_out') {
      if (!finalPlayerOutId) {
        notify('Please select which batter was run out.', 'error');
        return;
      }
      if (
        activeNonStrikerId &&
        finalPlayerOutId !== activeStrikerId &&
        finalPlayerOutId !== activeNonStrikerId
      ) {
        notify('Dismissed player must be one of the active crease batters.', 'error');
        return;
      }
    }
    if (effectiveWicketType === 'caught' && !finalFielderId) {
      notify('Please select the fielder who took the catch.', 'error');
      return;
    }
    if (effectiveWicketType === 'stumped' && !finalFielderId) {
      notify('Cannot record stumping: fielding squad has no designated wicket-keeper.', 'error');
      return;
    }

    recordDelivery({
      is_wicket: true,
      wicket_type: effectiveWicketType,
      player_out_id: finalPlayerOutId,
      fielder_id: finalFielderId,
      runs: finalRuns,
    });
    resetWicketForm?.();
    setShowWicketModal(false);
  }, [
    activeStrikerId,
    activeNonStrikerId,
    designatedKeeperId,
    modalWicketType,
    modalPlayerOutId,
    modalFielderId,
    modalWicketRuns,
    resetWicketForm,
    notify,
    recordDelivery,
    setShowWicketModal,
  ]);

  const handleStartInningsSubmit = useCallback((payload?: StartInningsPayload) => {
    const sId = payload?.strikerId ?? modalStartStrikerId;
    const nsId = payload?.nonStrikerId ?? modalStartNonStrikerId;
    const bId = payload?.bowlerId ?? modalStartBowlerId;

    if (!sId || !nsId || !bId) {
      notify('Please select Striker, Non-Striker, and Opening Bowler.', 'error');
      return;
    }
    if (sId === nsId) {
      notify('Striker and Non-Striker must be different players.', 'error');
      return;
    }
    startInnings({
      sId,
      nsId,
      bId,
    });
  }, [modalStartStrikerId, modalStartNonStrikerId, modalStartBowlerId, notify, startInnings]);

  const handleSwapStrike = useCallback(() => {
    swapStrike();
  }, [swapStrike]);

  const handleUndoDelivery = useCallback(() => {
    undoDelivery();
  }, [undoDelivery]);

  const handleSetBowler = useCallback((bowlerId: number) => {
    setBowler(bowlerId);
  }, [setBowler]);

  const handleSetBatter = useCallback((playerId: number) => {
    setBatter(playerId);
  }, [setBatter]);

  const handleAwardMOM = useCallback((playerId?: number) => {
    const targetId = playerId ?? modalMomPlayerId;
    if (targetId) {
      awardMOM(targetId);
    }
  }, [modalMomPlayerId, awardMOM]);

  return {
    handleRuns,
    handleExtra,
    handleWicketSubmit,
    handleStartInningsSubmit,
    handleSwapStrike,
    handleUndoDelivery,
    handleSetBowler,
    handleSetBatter,
    handleAwardMOM,

    isRecordingDelivery: recordDeliveryMutation.isPending,
    isUndoing: undoMutation.isPending,
    isSwappingStrike: swapStrikeMutation.isPending,
    isSettingBowler: setBowlerMutation.isPending,
    isSettingBatter: setBatterMutation.isPending,
    isStartingInnings: startInningsMutation.isPending,
    isAwardingMOM: awardMOMMutation.isPending,
  };
}

