import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  Clock,
  PlayCircle,
  RotateCcw,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useScorer } from '../hooks/useScorer';
import { CreaseHud } from '../components/scorer/CreaseHud';
import { DeliveryKeypad } from '../components/scorer/DeliveryKeypad';
import { WicketModal } from '../components/scorer/modals/WicketModal';
import { BowlerModal } from '../components/scorer/modals/BowlerModal';
import { IncomingBatterModal } from '../components/scorer/modals/IncomingBatterModal';
import { StartInningsModal } from '../components/scorer/modals/StartInningsModal';

export const ScorerConsole: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);

  const {
    inningsNumber,
    setInningsNumber,
    match,
    scorerState,
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

    isRecordingDelivery,
    isUndoing,
    isSwappingStrike,
    isSettingBowler,
    isSettingBatter,
    isStartingInnings,
    isAwardingMOM,
  } = useScorer(matchId);

  // Keyboard shortcut listener for fast physical scoring
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or select
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      // Don't trigger if any modal is open
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
  }, [
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
  ]);

  if (isStateLoading && !scorerState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-xs">Loading broadcast scorer...</p>
      </div>
    );
  }

  if (isStateError || !scorerState) {
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
          <button
            onClick={() => refetchState()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Scorer Connection</span>
          </button>
          <Link
            to={`/matches/${matchId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-200 font-bold text-xs rounded-xl border border-[#30363d] transition-all"
          >
            <span>Match Center</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#12161f] hover:bg-[#21262d] text-slate-400 hover:text-white font-medium text-xs rounded-xl border border-[#21262d] transition-all"
          >
            <span>Fixtures</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">
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
          {/* Innings Selector Pill */}
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

          <Link
            to={`/matches/${matchId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-[#21262d] transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Match Center</span>
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

          {/* Man of the Match Picker */}
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
              <button
                onClick={() => momPlayerId && handleAwardMOM(momPlayerId)}
                disabled={!momPlayerId || isAwardingMOM}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Award MOM
              </button>
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
            <button
              onClick={() => {
                setInningsNumber(2);
                setShowStartInningsModal(true);
              }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-transform hover:scale-105 cursor-pointer"
            >
              Start Innings 2
            </button>
          </div>
        )}

      {/* START INNINGS PROMPT (if innings is not started) */}
      {scorerState?.innings_status === 'not_started' && (
        <div className="bg-[#161b22] border-2 border-dashed border-blue-500/40 rounded-2xl p-8 text-center space-y-4">
          <UserPlus className="w-10 h-10 text-sky-400 mx-auto" />
          <h2 className="text-xl font-black text-white">
            Innings {inningsNumber} Not Started
          </h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Assign the two opening batsmen and the opening bowler to begin recording deliveries.
          </p>
          <button
            onClick={() => setShowStartInningsModal(true)}
            className="px-6 py-2.5 bg-[#0070f3] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-transform hover:scale-105 cursor-pointer"
          >
            Assign Openers & Start Innings
          </button>
        </div>
      )}

      {/* MAIN SCORER CREASE HUD & KEYPAD (Active match) */}
      {scorerState && scorerState.innings_status !== 'not_started' && (
        <div className="space-y-6">
          <CreaseHud
            scorerState={scorerState}
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
      )}

      {/* MODAL 1: WICKET DISMISSAL DIALOG */}
      <WicketModal
        isOpen={showWicketModal}
        onClose={() => setShowWicketModal(false)}
        onConfirm={handleWicketSubmit}
        wicketType={wicketType}
        onWicketTypeChange={setWicketType}
        fielderId={fielderId}
        onFielderChange={setFielderId}
        wicketRuns={wicketRuns}
        onWicketRunsChange={setWicketRuns}
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
        strikerId={startStrikerId}
        onStrikerChange={setStartStrikerId}
        nonStrikerId={startNonStrikerId}
        onNonStrikerChange={setStartNonStrikerId}
        bowlerId={startBowlerId}
        onBowlerChange={setStartBowlerId}
        isPending={isStartingInnings}
      />
    </div>
  );
};
