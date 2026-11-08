import { useMemo, useState } from 'react';
import type { WicketType } from '../types/cricket';

export interface UseScorerModalsReturn {
  // Modal Visibility States
  showWicketModal: boolean;
  setShowWicketModal: (show: boolean) => void;
  showBowlerModal: boolean;
  setShowBowlerModal: (show: boolean) => void;
  showIncomingBatterModal: boolean;
  setShowIncomingBatterModal: (show: boolean) => void;
  showStartInningsModal: boolean;
  setShowStartInningsModal: (show: boolean) => void;

  // Form States for Modals (Optional for backwards compatibility in existing tests)
  wicketType?: WicketType;
  setWicketType?: (type: WicketType) => void;
  fielderId?: number | undefined;
  setFielderId?: (id: number | undefined) => void;
  wicketRuns?: number;
  setWicketRuns?: (runs: number) => void;
  playerOutId?: number | undefined;
  setPlayerOutId?: (id: number | undefined) => void;
  resetWicketForm?: () => void;

  startStrikerId?: number | undefined;
  setStartStrikerId?: (id: number | undefined) => void;
  startNonStrikerId?: number | undefined;
  setStartNonStrikerId?: (id: number | undefined) => void;
  startBowlerId?: number | undefined;
  setStartBowlerId?: (id: number | undefined) => void;

  momPlayerId?: number | undefined;
  setMomPlayerId?: (id: number | undefined) => void;
}

export function useScorerModals(): UseScorerModalsReturn {
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showIncomingBatterModal, setShowIncomingBatterModal] = useState(false);
  const [showStartInningsModal, setShowStartInningsModal] = useState(false);

  return useMemo(
    () => ({
      showWicketModal,
      setShowWicketModal,
      showBowlerModal,
      setShowBowlerModal,
      showIncomingBatterModal,
      setShowIncomingBatterModal,
      showStartInningsModal,
      setShowStartInningsModal,
    }),
    [showWicketModal, showBowlerModal, showIncomingBatterModal, showStartInningsModal]
  );
}
