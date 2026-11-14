import { useMutation } from '@tanstack/react-query';
import { cricketApi } from '../lib/api-client';
import type { DeliveryCreate } from '../types/cricket';

export interface UseScorerMutationsOptions {
  matchId: number;
  inningsNumber: number;
  invalidateAll: () => void;
  notify: (message: string, type: 'success' | 'error' | 'info') => void;
  getErrorMessage: (err: unknown) => string;
  setShowBowlerModal: (show: boolean) => void;
  setShowIncomingBatterModal: (show: boolean) => void;
  setShowStartInningsModal: (show: boolean) => void;
}

export function useScorerMutations({
  matchId,
  inningsNumber,
  invalidateAll,
  notify,
  getErrorMessage,
  setShowBowlerModal,
  setShowIncomingBatterModal,
  setShowStartInningsModal,
}: UseScorerMutationsOptions) {
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

  return {
    recordDelivery: recordDeliveryMutation.mutate,
    isRecordingDelivery: recordDeliveryMutation.isPending,

    undoDelivery: undoMutation.mutate,
    isUndoing: undoMutation.isPending,

    swapStrike: swapStrikeMutation.mutate,
    isSwappingStrike: swapStrikeMutation.isPending,

    setBowler: setBowlerMutation.mutate,
    isSettingBowler: setBowlerMutation.isPending,

    setBatter: setBatterMutation.mutate,
    isSettingBatter: setBatterMutation.isPending,

    startInnings: startInningsMutation.mutate,
    isStartingInnings: startInningsMutation.isPending,

    awardMOM: awardMOMMutation.mutate,
    isAwardingMOM: awardMOMMutation.isPending,
  };
}
