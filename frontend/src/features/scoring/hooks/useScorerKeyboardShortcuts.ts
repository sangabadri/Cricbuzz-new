import { useEffect, useRef } from 'react';

interface ScorerKeyboardShortcutsProps {
  showWicketModal: boolean;
  showBowlerModal: boolean;
  showIncomingBatterModal: boolean;
  showStartInningsModal: boolean;
  isRecordingDelivery: boolean;
  handleRuns: (runs: number) => void;
  handleExtra: (type: 'wide' | 'noball' | 'bye' | 'leg-bye', count?: number) => void;
  setShowWicketModal: (show: boolean) => void;
  handleSwapStrike: () => void;
  handleUndoDelivery: () => void;
}

export function useScorerKeyboardShortcuts(props: ScorerKeyboardShortcutsProps) {
  const handlerRef = useRef(props);

  useEffect(() => {
    handlerRef.current = props;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const {
        showWicketModal,
        showBowlerModal,
        showIncomingBatterModal,
        showStartInningsModal,
        isRecordingDelivery,
        handleRuns,
        handleExtra,
        setShowWicketModal,
        handleSwapStrike,
        handleUndoDelivery,
      } = handlerRef.current;

      if (
        showWicketModal ||
        showBowlerModal ||
        showIncomingBatterModal ||
        showStartInningsModal ||
        isRecordingDelivery
      ) {
        return;
      }

      if (['0', '1', '2', '3', '4', '6'].includes(e.key)) {
        e.preventDefault();
        handleRuns(Number(e.key));
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleExtra('wide', 1);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleExtra('noball', 1);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleExtra('leg-bye', 1);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleExtra('bye', 1);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setShowWicketModal(true);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSwapStrike();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleUndoDelivery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
