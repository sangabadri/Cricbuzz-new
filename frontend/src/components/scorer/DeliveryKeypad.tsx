import React, { useState } from 'react';
import type { ExtraType, LiveCurrentOverBall } from '../../types/cricket';
import { OverProgressionStrip } from './keypad/OverProgressionStrip';
import { ModifierBanner } from './keypad/ModifierBanner';
import { RunsGrid } from './keypad/RunsGrid';
import { ExtrasControls } from './keypad/ExtrasControls';
import { ScorerToolbar } from './keypad/ScorerToolbar';

export interface DeliveryKeypadProps {
  onRuns: (runs: number) => void;
  onExtra: (extraType: ExtraType, extrasCount?: number, runs?: number) => void;
  onOpenWicketModal: () => void;
  disabled?: boolean;
  currentOverBalls?: (LiveCurrentOverBall | string)[];
  onSwapStrike?: () => void;
  onUndo?: () => void;
  isUndoing?: boolean;
  isSwappingStrike?: boolean;
}

export const DeliveryKeypad: React.FC<DeliveryKeypadProps> = ({
  onRuns,
  onExtra,
  onOpenWicketModal,
  disabled = false,
  currentOverBalls = [],
  onSwapStrike,
  onUndo,
  isUndoing = false,
  isSwappingStrike = false,
}) => {
  const [selectedModifier, setSelectedModifier] = useState<ExtraType | null>(null);

  // Count legal balls in current over to show 6 slots
  const legalBallsCount = currentOverBalls.filter((b) => {
    if (typeof b === 'object' && b !== null) {
      return !b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'noball');
    }
    const s = String(b);
    return !s.includes('Wd') && !s.includes('Nb');
  }).length;

  const handleModifierClick = (extraType: ExtraType) => {
    if (disabled) return;
    if (selectedModifier === extraType) {
      submitSingleExtra(extraType);
    } else {
      setSelectedModifier(extraType);
    }
  };

  const submitSingleExtra = (extraType: ExtraType) => {
    if (disabled) return;
    onExtra(extraType, 1, 0);
    setSelectedModifier(null);
  };

  const handleRunClick = (run: number) => {
    if (disabled) return;
    if (!selectedModifier) {
      onRuns(run);
      return;
    }

    if (selectedModifier === 'noball') {
      onExtra('noball', 1, run);
    } else if (selectedModifier === 'wide') {
      onExtra('wide', 1 + run, 0);
    } else if (selectedModifier === 'bye') {
      onExtra('bye', run === 0 ? 1 : run, 0);
    } else if (selectedModifier === 'leg-bye') {
      onExtra('leg-bye', run === 0 ? 1 : run, 0);
    }

    setSelectedModifier(null);
  };

  const getRunLabel = (run: number) => {
    if (!selectedModifier) {
      return run === 0 ? 'Dot' : run === 4 ? 'Boundary' : run === 6 ? 'Maximum' : 'Runs';
    }
    if (selectedModifier === 'noball') {
      return run === 0 ? '+1 Nb' : `+${1 + run} (${run} bat)`;
    }
    if (selectedModifier === 'wide') {
      return run === 0 ? '+1 Wide' : `+${1 + run} Wides`;
    }
    if (selectedModifier === 'bye') {
      return run === 0 || run === 1 ? '+1 Bye' : `+${run} Byes`;
    }
    if (selectedModifier === 'leg-bye') {
      return run === 0 || run === 1 ? '+1 Leg Bye' : `+${run} L-Byes`;
    }
    return 'Runs';
  };

  const getExtraName = (extra: ExtraType) => {
    switch (extra) {
      case 'noball':
        return 'No Ball';
      case 'wide':
        return 'Wide';
      case 'bye':
        return 'Bye';
      case 'leg-bye':
        return 'Leg Bye';
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 shadow-xl space-y-5">
      <OverProgressionStrip
        currentOverBalls={currentOverBalls}
        legalBallsCount={legalBallsCount}
      />

      {selectedModifier && (
        <ModifierBanner
          selectedModifier={selectedModifier}
          disabled={disabled}
          onClear={() => setSelectedModifier(null)}
          onSubmitSingle={submitSingleExtra}
          extraName={getExtraName(selectedModifier)}
        />
      )}

      <RunsGrid
        selectedModifier={selectedModifier}
        disabled={disabled}
        onRunClick={handleRunClick}
        getRunLabel={getRunLabel}
      />

      <ExtrasControls
        selectedModifier={selectedModifier}
        disabled={disabled}
        onModifierClick={handleModifierClick}
        onOpenWicketModal={onOpenWicketModal}
      />

      <ScorerToolbar
        onSwapStrike={onSwapStrike}
        onUndo={onUndo}
        disabled={disabled}
        isSwappingStrike={isSwappingStrike}
        isUndoing={isUndoing}
      />
    </div>
  );
};
