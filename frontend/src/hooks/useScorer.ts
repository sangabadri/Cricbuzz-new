import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cricketApi } from '../api/client';
import { useToast } from '../components/common/Toast';
import type {
  DeliveryCreate,
  ExtraType,
  LiveScorerStateResponse,
  Match,
  SquadResponse,
  WicketType,
} from '../types/cricket';

export interface UseScorerOptions {
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface UseScorerReturn {
  // Navigation & Data
  matchId: number;
  inningsNumber: number;
  setInningsNumber: (num: number) => void;
  match: Match | undefined;
  scorerState: LiveScorerStateResponse | undefined;
  isStateLoading: boolean;
  isStateError: boolean;
  refetchState: () => void;
  battingSquad: SquadResponse | undefined;
  bowlingSquad: SquadResponse | undefined;
  isTeamABatting: boolean;

  // Modal Visibility States
  showWicketModal: boolean;
  setShowWicketModal: (show: boolean) => void;
  showBowlerModal: boolean;
  setShowBowlerModal: (show: boolean) => void;
  showIncomingBatterModal: boolean;
  setShowIncomingBatterModal: (show: boolean) => void;
  showStartInningsModal: boolean;
  setShowStartInningsModal: (show: boolean) => void;

  // Form States for Modals
  wicketType: WicketType;
  setWicketType: (type: WicketType) => void;
  fielderId: number | undefined;
  setFielderId: (id: number | undefined) => void;
  wicketRuns: number;
  setWicketRuns: (runs: number) => void;

  startStrikerId: number | undefined;
  setStartStrikerId: (id: number | undefined) => void;
  startNonStrikerId: number | undefined;
  setStartNonStrikerId: (id: number | undefined) => void;
  startBowlerId: number | undefined;
  setStartBowlerId: (id: number | undefined) => void;

  momPlayerId: number | undefined;
  setMomPlayerId: (id: number | undefined) => void;

  // Keypad Handlers
  handleRuns: (runs: number) => void;
  handleExtra: (extraType: ExtraType, extrasCount?: number) => void;
  handleWicketSubmit: () => void;
  handleStartInningsSubmit: () => void;
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

export function useScorer(matchId: number, options?: UseScorerOptions): UseScorerReturn {
  const queryClient = useQueryClient();
  const toast = useToast();

  const notify = (message: string, type: 'success' | 'error' | 'info') => {
    if (options?.onNotify) {
      options.onNotify(message, type);
    }
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  const getErrorMessage = (err: unknown): string => {
    const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
    return anyErr.response?.data?.detail || anyErr.message || 'Unknown error';
  };

  // Active innings number (can switch between innings 1 and 2 if available)
  const [inningsNumber, setInningsNumber] = useState<number>(1);

  // Modal Dialog States
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('bowled');
  const [fielderId, setFielderId] = useState<number | undefined>();
  const [wicketRuns, setWicketRuns] = useState<number>(0);

  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showIncomingBatterModal, setShowIncomingBatterModal] = useState(false);

  const [showStartInningsModal, setShowStartInningsModal] = useState(false);
  const [startStrikerId, setStartStrikerId] = useState<number | undefined>();
  const [startNonStrikerId, setStartNonStrikerId] = useState<number | undefined>();
  const [startBowlerId, setStartBowlerId] = useState<number | undefined>();

  const [momPlayerId, setMomPlayerId] = useState<number | undefined>();

  // 1. Fetch match metadata
  const { data: match } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => cricketApi.getMatch(matchId),
    enabled: !isNaN(matchId),
  });

  // 2. Fetch live scorer state (polls every 3s)
  const {
    data: scorerState,
    isLoading: isStateLoading,
    isError: isStateError,
    refetch: refetchState,
  } = useQuery({
    queryKey: ['scorerState', matchId, inningsNumber],
    queryFn: () => cricketApi.getScorerState(matchId, inningsNumber),
    enabled: !isNaN(matchId),
    refetchInterval: 3000,
  });

  // 3. Fetch Squads for Player Dropdowns
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

  // Invalidate queries after action
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['scorerState', matchId] });
    queryClient.invalidateQueries({ queryKey: ['liveTicker', matchId] });
    queryClient.invalidateQueries({ queryKey: ['scorecard', matchId] });
    queryClient.invalidateQueries({ queryKey: ['deliveries', matchId] });
    queryClient.invalidateQueries({ queryKey: ['match', matchId] });
  };

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

  // Keypad Handlers
  const handleRuns = (runs: number) => {
    recordDeliveryMutation.mutate({ runs });
  };

  const handleExtra = (extraType: ExtraType, extrasCount = 1) => {
    recordDeliveryMutation.mutate({
      extra_type: extraType,
      extras: extrasCount,
      runs: 0,
    });
  };

  const handleWicketSubmit = () => {
    recordDeliveryMutation.mutate({
      is_wicket: true,
      wicket_type: wicketType,
      fielder_id: fielderId,
      runs: wicketRuns,
    });
    setShowWicketModal(false);
  };

  const handleStartInningsSubmit = () => {
    if (!startStrikerId || !startNonStrikerId || !startBowlerId) {
      notify('Please select Striker, Non-Striker, and Opening Bowler.', 'error');
      return;
    }
    if (startStrikerId === startNonStrikerId) {
      notify('Striker and Non-Striker must be different players.', 'error');
      return;
    }
    startInningsMutation.mutate({
      sId: startStrikerId,
      nsId: startNonStrikerId,
      bId: startBowlerId,
    });
  };

  const handleSwapStrike = () => {
    swapStrikeMutation.mutate();
  };

  const handleUndoDelivery = () => {
    undoMutation.mutate();
  };

  const handleSetBowler = (bowlerId: number) => {
    setBowlerMutation.mutate(bowlerId);
  };

  const handleSetBatter = (playerId: number) => {
    setBatterMutation.mutate(playerId);
  };

  const handleAwardMOM = (playerId?: number) => {
    const targetId = playerId ?? momPlayerId;
    if (targetId) {
      awardMOMMutation.mutate(targetId);
    }
  };

  return {
    matchId,
    inningsNumber,
    setInningsNumber,
    match,
    scorerState,
    isStateLoading,
    isStateError,
    refetchState: () => {
      refetchState();
    },
    battingSquad,
    bowlingSquad,
    isTeamABatting,

    showWicketModal,
    setShowWicketModal,
    showBowlerModal,
    setShowBowlerModal,
    showIncomingBatterModal,
    setShowIncomingBatterModal,
    showStartInningsModal,
    setShowStartInningsModal,

    wicketType,
    setWicketType,
    fielderId,
    setFielderId,
    wicketRuns,
    setWicketRuns,

    startStrikerId,
    setStartStrikerId,
    startNonStrikerId,
    setStartNonStrikerId,
    startBowlerId,
    setStartBowlerId,

    momPlayerId,
    setMomPlayerId,

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
