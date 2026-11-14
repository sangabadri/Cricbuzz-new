import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useScorer } from '../../../hooks/useScorer';
import { cricketApi } from '../../../lib/api-client';
import { CreaseHud } from '../../../components/scorer/CreaseHud';
import { DeliveryKeypad } from '../../../components/scorer/DeliveryKeypad';
import { WicketModal } from '../../../components/scorer/modals/WicketModal';
import { BowlerModal } from '../../../components/scorer/modals/BowlerModal';
import { IncomingBatterModal } from '../../../components/scorer/modals/IncomingBatterModal';
import { StartInningsModal } from '../../../components/scorer/modals/StartInningsModal';
import { CommentaryFeed } from '../../matches/components/CommentaryFeed';
import { Button } from '../../../components/ui/Button';
import { ScorerHeader } from '../components/ScorerHeader';
import { MatchCompletedBanner } from '../components/MatchCompletedBanner';
import { InningsTransitionPrompts } from '../components/InningsTransitionPrompts';
import { useScorerKeyboardShortcuts } from '../hooks/useScorerKeyboardShortcuts';

export const ScorerConsolePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);

  const {
    inningsNumber, setInningsNumber, match, scorerState, liveTicker,
    isStateLoading, isStateError, refetchState, battingSquad, bowlingSquad,
    showWicketModal, setShowWicketModal, showBowlerModal, setShowBowlerModal,
    showIncomingBatterModal, showStartInningsModal, setShowStartInningsModal,
    handleRuns, handleExtra, handleWicketSubmit, handleStartInningsSubmit,
    handleSwapStrike, handleUndoDelivery, handleSetBowler, handleSetBatter, handleAwardMOM,
    isRecordingDelivery, isUndoing, isSwappingStrike, isSettingBowler, isSettingBatter,
    isStartingInnings, isAwardingMOM,
  } = useScorer(matchId);

  // Deliveries Query for real-time live commentary logger on the right column
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', matchId, inningsNumber],
    queryFn: () => cricketApi.getDeliveries(matchId, inningsNumber),
    enabled: !isNaN(matchId) && !!inningsNumber,
    refetchInterval: 3000,
  });

  // Physical keyboard shortcuts listener
  useScorerKeyboardShortcuts({
    showWicketModal, showBowlerModal, showIncomingBatterModal, showStartInningsModal,
    isRecordingDelivery, handleRuns, handleExtra, setShowWicketModal, handleSwapStrike, handleUndoDelivery,
  });

  if (isStateLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div className="h-64 rounded-2xl bg-slate-900 border border-[#21262d] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-96 rounded-2xl bg-slate-900 border border-[#21262d] animate-pulse" />
          <div className="lg:col-span-5 h-96 rounded-2xl bg-slate-900 border border-[#21262d] animate-pulse" />
        </div>
      </div>
    );
  }

  if (isStateError || (!isStateLoading && !scorerState)) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 lg:p-8 bg-[#161b22] border border-rose-500/30 rounded-2xl shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-rose-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white">Failed to load scorer state</h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Unable to connect to match #{matchId} scorer engine or match does not exist.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => refetchState()}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Retry Scorer Connection
          </Button>
          <Link to={`/matches/${matchId}`}>
            <Button variant="secondary" size="sm">
              Match Center
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" size="sm">
              Fixtures
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ScorerHeader
        matchId={matchId}
        inningsNumber={inningsNumber}
        onSelectInnings={(inn) => setInningsNumber(inn)}
      />

      {scorerState?.match_status === 'completed' && (
        <MatchCompletedBanner
          match={match}
          battingSquad={battingSquad}
          bowlingSquad={bowlingSquad}
          onAwardMOM={handleAwardMOM}
          isAwardingMOM={isAwardingMOM}
        />
      )}

      {scorerState && (
        <InningsTransitionPrompts
          scorerState={scorerState}
          inningsNumber={inningsNumber}
          onStartInnings2={() => {
            setInningsNumber(2);
            setShowStartInningsModal(true);
          }}
          onAssignOpeners={() => setShowStartInningsModal(true)}
        />
      )}

      {/* TWO-COLUMN MODERN SCORER WORKSPACE (Active Match) */}
      {scorerState && scorerState.innings_status !== 'not_started' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Crease HUD & Delivery Keypad (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <CreaseHud
              scorerState={scorerState}
              liveTicker={liveTicker}
              onSwapStrike={handleSwapStrike}
              onChangeBowler={() => setShowBowlerModal(true)}
              onUndoBall={handleUndoDelivery}
              isUndoPending={isUndoing}
              isSwapStrikePending={isSwappingStrike}
            />

            <DeliveryKeypad
              onRuns={handleRuns}
              onExtra={handleExtra}
              onOpenWicketModal={() => setShowWicketModal(true)}
              disabled={isRecordingDelivery}
              currentOverBalls={scorerState.current_over_balls || []}
              onSwapStrike={handleSwapStrike}
              onUndo={handleUndoDelivery}
              isUndoing={isUndoing}
              isSwappingStrike={isSwappingStrike}
            />
          </div>

          {/* Right Column: Live Ball-by-Ball Commentary Stream (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <CommentaryFeed
              deliveries={deliveries}
              title={`Innings ${inningsNumber} Live Commentary`}
              inningsNumber={inningsNumber}
              availableInnings={[1, 2]}
              onInningsChange={(inn) => setInningsNumber(inn)}
            />
          </div>
        </div>
      )}

      {/* MODALS */}
      <WicketModal
        isOpen={showWicketModal}
        onClose={() => setShowWicketModal(false)}
        onConfirm={handleWicketSubmit}
        strikerId={scorerState?.striker_id}
        strikerName={scorerState?.striker_name}
        nonStrikerId={scorerState?.non_striker_id}
        nonStrikerName={scorerState?.non_striker_name}
        bowlingSquad={bowlingSquad}
        isPending={isRecordingDelivery}
      />

      <BowlerModal
        isOpen={showBowlerModal}
        onClose={() => setShowBowlerModal(false)}
        onSelectBowler={handleSetBowler}
        bowlingSquad={bowlingSquad}
        currentBowlerId={scorerState?.current_bowler_id}
        eligibleBowlerIds={scorerState?.eligible_bowler_ids}
        isPending={isSettingBowler}
      />

      <IncomingBatterModal
        isOpen={showIncomingBatterModal}
        onSelectBatter={handleSetBatter}
        battingSquad={battingSquad}
        strikerId={scorerState?.striker_id}
        nonStrikerId={scorerState?.non_striker_id}
        isPending={isSettingBatter}
      />

      <StartInningsModal
        isOpen={showStartInningsModal}
        onClose={() => setShowStartInningsModal(false)}
        onSubmit={handleStartInningsSubmit}
        inningsNumber={inningsNumber}
        battingSquad={battingSquad}
        bowlingSquad={bowlingSquad}
        isPending={isStartingInnings}
      />
    </div>
  );
};
