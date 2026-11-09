import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronRight,
  Clock,
  PlayCircle,
  Shield,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useScorer } from '../../../hooks/useScorer';
import { cricketApi } from '../../../lib/api/client';
import { CreaseHud } from '../../../components/scorer/CreaseHud';
import { DeliveryKeypad } from '../../../components/scorer/DeliveryKeypad';
import { WicketModal } from '../../../components/scorer/modals/WicketModal';
import { BowlerModal } from '../../../components/scorer/modals/BowlerModal';
import { IncomingBatterModal } from '../../../components/scorer/modals/IncomingBatterModal';
import { StartInningsModal } from '../../../components/scorer/modals/StartInningsModal';
import { MatchAccessModal } from '../../authentication/components/MatchAccessModal';
import { CommentaryFeed } from '../../../components/match/CommentaryFeed';
import { Button } from '../../../components/ui/Button';

export const ScorerConsolePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);

  const [momPlayerId, setMomPlayerId] = useState<number | undefined>();
  const [showAccessModal, setShowAccessModal] = useState(false);

  const {
    inningsNumber,
    setInningsNumber,
    match,
    scorerState,
    liveTicker,
    isStateLoading,
    isStateError,
    refetchState,
    battingSquad,
    bowlingSquad,

    showWicketModal,
    setShowWicketModal,
    showBowlerModal,
    setShowBowlerModal,
    showIncomingBatterModal,
    showStartInningsModal,
    setShowStartInningsModal,

    handleRuns,
    handleExtra,
    handleWicketSubmit,
    handleStartInningsSubmit,
    handleSwapStrike,
    handleUndoDelivery,
    handleSetBowler,
    handleSetBatter,
    handleAwardMOM,

    isRecordingDelivery,
    isUndoing,
    isSwappingStrike,
    isSettingBowler,
    isSettingBatter,
    isStartingInnings,
    isAwardingMOM,
  } = useScorer(matchId);

  // Deliveries Query for real-time live commentary logger on the right column
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', matchId, inningsNumber],
    queryFn: () => cricketApi.getDeliveries(matchId, inningsNumber),
    enabled: !isNaN(matchId) && !!inningsNumber,
    refetchInterval: 3000,
  });

  // Stable ref for keyboard shortcuts
  const keyHandlerRef = useRef({
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
  });

  useEffect(() => {
    keyHandlerRef.current = {
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
    };
  });

  // Fast physical keyboard shortcuts listener
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
      } = keyHandlerRef.current;

      if (showWicketModal || showBowlerModal || showIncomingBatterModal || showStartInningsModal || isRecordingDelivery) {
        return;
      }

      if (['0', '1', '2', '3', '4', '6'].includes(e.key)) {
        e.preventDefault();
        handleRuns(Number(e.key));
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setShowWicketModal(true);
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleExtra('wide', 1);
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleExtra('noball', 1);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSwapStrike();
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleUndoDelivery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  if (isStateError) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-[#161b22] border border-rose-500/40 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Error Connecting to Match</h2>
        <p className="text-slate-400 text-xs">
          Unable to synchronize scorer console state with backend.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="primary" size="sm" onClick={() => refetchState()}>
            Retry
          </Button>
          <Link to={`/matches/${matchId}`}>
            <Button variant="secondary" size="sm">
              Match Center
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Innings Selector & Match Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/matches" className="hover:text-white transition-colors">
            Matches
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <Link to={`/matches/${matchId}`} className="hover:text-white transition-colors">
            Match #{matchId}
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-[#38bdf8] font-bold">Scorer Deck</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#12161f] border border-[#21262d] rounded-lg p-1 text-xs font-bold">
            <button
              onClick={() => setInningsNumber(1)}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                inningsNumber === 1
                  ? 'bg-[#0070f3] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Innings 1
            </button>
            <button
              onClick={() => setInningsNumber(2)}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                inningsNumber === 2
                  ? 'bg-[#0070f3] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Innings 2
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAccessModal(true)}
            leftIcon={<Shield className="w-3.5 h-3.5 text-amber-400" />}
          >
            Access
          </Button>

          <Link to={`/matches/${matchId}`}>
            <Button variant="secondary" size="sm" leftIcon={<PlayCircle className="w-3.5 h-3.5 text-sky-400" />}>
              Match Center
            </Button>
          </Link>
        </div>
      </div>

      {/* MATCH COMPLETED BANNER */}
      {scorerState?.match_status === 'completed' && (
        <div className="bg-[#161b22] border border-emerald-500/50 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">MATCH COMPLETED</h2>
            <p className="text-emerald-400 font-bold text-sm mt-1">
              {match?.winner
                ? `${match.winner === match.team_a ? match.team_a_name : match.team_b_name} won the match!`
                : 'Match Tied!'}
            </p>
          </div>

          {!match?.mom && (
            <div className="max-w-md mx-auto pt-2 flex items-center gap-2">
              <select
                value={momPlayerId || ''}
                onChange={(e) => setMomPlayerId(Number(e.target.value))}
                className="flex-1 bg-[#12161f] border border-[#21262d] text-white rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="">Select Man of the Match</option>
                {battingSquad?.players.map((p) => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.player_name || `Player ${p.player_id}`}
                  </option>
                ))}
                {bowlingSquad?.players.map((p) => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.player_name || `Player ${p.player_id}`}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={() => momPlayerId && handleAwardMOM(momPlayerId)}
                disabled={!momPlayerId || isAwardingMOM}
              >
                Award MOM
              </Button>
            </div>
          )}
        </div>
      )}

      {/* INNINGS BREAK BANNER */}
      {(scorerState?.next_action === 'INNINGS_BREAK' ||
        scorerState?.innings_status === 'completed') &&
        scorerState?.match_status !== 'completed' && (
          <div className="bg-[#161b22] border border-amber-500/50 rounded-2xl p-6 text-center space-y-3">
            <Clock className="w-8 h-8 text-amber-400 mx-auto" />
            <h2 className="text-xl font-black text-white">Innings 1 Completed</h2>
            <p className="text-slate-300 text-xs">
              Target set for Innings 2. Switch to Innings 2 to configure openers and start the chase.
            </p>
            <Button
              variant="accent"
              size="md"
              onClick={() => {
                setInningsNumber(2);
                setShowStartInningsModal(true);
              }}
            >
              Start Innings 2
            </Button>
          </div>
        )}

      {/* START INNINGS PROMPT */}
      {scorerState?.innings_status === 'not_started' && (
        <div className="bg-[#161b22] border-2 border-dashed border-blue-500/40 rounded-2xl p-8 text-center space-y-4">
          <UserPlus className="w-10 h-10 text-sky-400 mx-auto" />
          <h2 className="text-xl font-black text-white">
            Innings {inningsNumber} Not Started
          </h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Assign the two opening batsmen and the opening bowler to begin recording deliveries.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowStartInningsModal(true)}
          >
            Assign Openers & Start Innings
          </Button>
        </div>
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

      {/* MODAL 1: WICKET DISMISSAL DIALOG */}
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

      {/* MODAL 2: BOWLER SELECTION DIALOG */}
      <BowlerModal
        isOpen={showBowlerModal}
        onClose={() => setShowBowlerModal(false)}
        onSelectBowler={handleSetBowler}
        bowlingSquad={bowlingSquad}
        currentBowlerId={scorerState?.current_bowler_id}
        eligibleBowlerIds={scorerState?.eligible_bowler_ids}
        isPending={isSettingBowler}
      />

      {/* MODAL 3: INCOMING BATTER DIALOG */}
      <IncomingBatterModal
        isOpen={showIncomingBatterModal}
        onSelectBatter={handleSetBatter}
        battingSquad={battingSquad}
        strikerId={scorerState?.striker_id}
        nonStrikerId={scorerState?.non_striker_id}
        isPending={isSettingBatter}
      />

      {/* MODAL 4: START INNINGS DIALOG */}
      <StartInningsModal
        isOpen={showStartInningsModal}
        onClose={() => setShowStartInningsModal(false)}
        onSubmit={handleStartInningsSubmit}
        inningsNumber={inningsNumber}
        battingSquad={battingSquad}
        bowlingSquad={bowlingSquad}
        isPending={isStartingInnings}
      />

      {/* MODAL 5: MATCH ACCESS DELEGATION */}
      <MatchAccessModal
        matchId={matchId}
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
      />
    </div>
  );
};
