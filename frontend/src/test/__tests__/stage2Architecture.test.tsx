import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WicketModal } from '../../components/scorer/modals/WicketModal';
import { StartInningsModal } from '../../components/scorer/modals/StartInningsModal';
import { useScorerModals } from '../../hooks/useScorerModals';
import { renderHook, act } from '@testing-library/react';
import { cricketApi, api } from '../../api/client';
import type { SquadResponse } from '../../types/cricket';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScorerActions } from '../../hooks/useScorerActions';
import * as useScorerModule from '../../hooks/useScorer';
import { ScorerConsole } from '../../pages/ScorerConsole';

const mockSquad: SquadResponse = {
  id: 1,
  match_id: 1,
  team_id: 20,
  captain_id: 201,
  wicket_keeper_id: 205,
  players: [
    { player_id: 201, player_name: 'Jasprit Bumrah', role: 'Bowler', is_playing_xi: true },
    { player_id: 202, player_name: 'Hardik Pandya', role: 'All-rounder', is_playing_xi: true },
    { player_id: 205, player_name: 'Ishan Kishan', role: 'Wicket-Keeper', is_playing_xi: true },
  ],
};

const mockBattingSquad: SquadResponse = {
  id: 2,
  match_id: 1,
  team_id: 10,
  captain_id: 101,
  wicket_keeper_id: 103,
  players: [
    { player_id: 101, player_name: 'Rohit Sharma', role: 'Batsman', is_playing_xi: true },
    { player_id: 102, player_name: 'Shubman Gill', role: 'Batsman', is_playing_xi: true },
    { player_id: 103, player_name: 'KL Rahul', role: 'Wicket-Keeper', is_playing_xi: true },
  ],
};

describe('Stage 2 Architecture: Modal Form Encapsulation & API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Encapsulated Modal Form State in Dialogs', () => {
    it('WicketModal manages internal form state and passes complete payload to onConfirm', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <WicketModal
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          strikerId={101}
          strikerName="Rohit Sharma"
          nonStrikerId={102}
          nonStrikerName="Shubman Gill"
          bowlingSquad={mockSquad}
        />
      );

      // Default dismissal is bowled
      const selectMode = screen.getByRole('combobox');
      expect(selectMode).toHaveValue('bowled');

      // Change mode to run_out
      fireEvent.change(selectMode, { target: { value: 'run_out' } });
      expect(screen.getByText('Dismissed Batter (Run Out)')).toBeInTheDocument();

      // Select non-striker as dismissed
      fireEvent.click(screen.getByText('Shubman Gill'));

      // Set runs completed before run out
      const runsInput = screen.getByRole('spinbutton');
      fireEvent.change(runsInput, { target: { value: '2' } });

      // Click Confirm Out
      fireEvent.click(screen.getByRole('button', { name: /Confirm Out/i }));

      // Payload passed directly from modal state
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith({
        wicketType: 'run_out',
        playerOutId: 102,
        fielderId: undefined,
        runs: 2,
      });
    });

    it('StartInningsModal manages internal opener and bowler selection and passes payload to onSubmit', () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();

      render(
        <StartInningsModal
          isOpen={true}
          inningsNumber={1}
          onClose={onClose}
          onSubmit={onSubmit}
          battingSquad={mockBattingSquad}
          bowlingSquad={mockSquad}
        />
      );

      // Start button is initially disabled because openers not selected
      const startButton = screen.getByRole('button', { name: /Start Innings/i });
      expect(startButton).toBeDisabled();

      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(3);

      // Select striker
      fireEvent.change(selects[0], { target: { value: '101' } });

      // Select non-striker
      fireEvent.change(selects[1], { target: { value: '102' } });

      // Select bowler
      fireEvent.change(selects[2], { target: { value: '201' } });

      // Now start button should be enabled
      expect(startButton).not.toBeDisabled();
      fireEvent.click(startButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        strikerId: 101,
        nonStrikerId: 102,
        bowlerId: 201,
      });
    });

    it('useScorerModals manages only visibility booleans, eliminating ephemeral form state bloat', () => {
      const { result, rerender } = renderHook(() => useScorerModals());

      expect(result.current.showWicketModal).toBe(false);
      expect(result.current.showBowlerModal).toBe(false);
      expect(result.current.showIncomingBatterModal).toBe(false);
      expect(result.current.showStartInningsModal).toBe(false);

      const initialRef = result.current;
      rerender();
      // Referentially stable across re-renders when booleans don't change
      expect(result.current).toBe(initialRef);

      act(() => {
        result.current.setShowWicketModal(true);
      });
      expect(result.current.showWicketModal).toBe(true);

      act(() => {
        result.current.setShowBowlerModal(true);
      });
      expect(result.current.showBowlerModal).toBe(true);

      // Verify return object does not carry ephemeral state that triggers parent re-renders
      expect(result.current.wicketType).toBeUndefined();
      expect(result.current.fielderId).toBeUndefined();
      expect(result.current.wicketRuns).toBeUndefined();
    });
  });

  describe('2. API Client Correctness & Missing Endpoints', () => {
    it('cricketApi.patchLastDelivery calls PATCH /matches/{id}/innings/{number}/deliveries/last', async () => {
      const mockDelivery = {
        id: 42,
        innings_id: 1,
        over: 0,
        ball: 3,
        bowler_id: 201,
        batsman_id: 101,
        non_striker_id: 102,
        runs: 6,
        extras: 0,
      };

      const spy = vi.spyOn(api, 'patch').mockResolvedValueOnce({ data: mockDelivery });

      const patchPayload = { runs: 6, commentary: 'Smashed over deep mid-wicket for six!' };
      const response = await cricketApi.patchLastDelivery(1, 1, patchPayload);

      expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/deliveries/last', patchPayload);
      expect(response).toEqual(mockDelivery);
    });

    it('cricketApi.abandonMatch calls POST /matches/{id}/abandon and returns MatchResponse', async () => {
      const mockAbandonedMatch = {
        id: 5,
        team_a: 1,
        team_b: 2,
        venue: 'Melbourne',
        format: 't20' as const,
        match_date: '2026-11-08T00:00:00Z',
        status: 'abandoned' as const,
      };

      const spy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockAbandonedMatch });

      const response = await cricketApi.abandonMatch(5);

      expect(spy).toHaveBeenCalledWith('/matches/5/abandon');
      expect(response.status).toBe('abandoned');
      expect(response.id).toBe(5);
    });

    it('cricketApi.setBowler returns InningsResponse', async () => {
      const mockInnings = {
        id: 10,
        match_id: 1,
        innings_number: 1,
        batting_team_id: 1,
        bowling_team_id: 2,
        status: 'in_progress' as const,
        current_bowler_id: 201,
      };

      const spy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockInnings });

      const response = await cricketApi.setBowler(1, 1, 201);
      expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/set-bowler', { bowler_id: 201 });
      expect(response).toEqual(mockInnings);
    });
  });

  describe('3. ScorerConsole Keydown Listener Stabilization', () => {
    it('binds keydown listener once and does not unbind/rebind on renders', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const mockHandleRuns = vi.fn();
      const mockHandleExtra = vi.fn();
      const mockHandleSwapStrike = vi.fn();
      const mockHandleUndoDelivery = vi.fn();
      const mockSetShowWicketModal = vi.fn();

      const baseScorerState = {
        match_id: 1,
        innings_number: 1,
        match_status: 'live' as const,
        innings_status: 'in_progress' as const,
        total_runs: 50,
        total_wickets: 1,
        current_over: 5,
        balls_in_over: 3,
        overs_display: '5.3',
        legal_balls: 33,
        current_run_rate: 9.09,
        striker_id: 101,
        striker_name: 'Rohit Sharma',
        striker_runs: 30,
        striker_balls: 18,
        non_striker_id: 102,
        non_striker_name: 'Shubman Gill',
        non_striker_runs: 15,
        non_striker_balls: 15,
        current_bowler_id: 201,
        current_bowler_name: 'Jasprit Bumrah',
        current_bowler_overs: '2.3',
        current_bowler_runs: 18,
        current_bowler_wickets: 1,
        current_over_balls: ['1', '4', '0'],
        next_action: 'NEXT_BALL' as const,
      };

      vi.spyOn(useScorerModule, 'useScorer').mockReturnValue({
        matchId: 1,
        inningsNumber: 1,
        setInningsNumber: vi.fn(),
        match: { id: 1, team_a: 10, team_b: 20, venue: 'Wankhede', format: 't20', match_date: '2026-11-08', status: 'live' },
        scorerState: baseScorerState,
        liveTicker: undefined,
        isStateLoading: false,
        isStateError: false,
        refetchState: vi.fn(),
        battingSquad: mockBattingSquad,
        bowlingSquad: mockSquad,
        isTeamABatting: true,

        showWicketModal: false,
        setShowWicketModal: mockSetShowWicketModal,
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),

        handleRuns: mockHandleRuns,
        handleExtra: mockHandleExtra,
        handleWicketSubmit: vi.fn(),
        handleStartInningsSubmit: vi.fn(),
        handleSwapStrike: mockHandleSwapStrike,
        handleUndoDelivery: mockHandleUndoDelivery,
        handleSetBowler: vi.fn(),
        handleSetBatter: vi.fn(),
        handleAwardMOM: vi.fn(),

        isRecordingDelivery: false,
        isUndoing: false,
        isSwappingStrike: false,
        isSettingBowler: false,
        isSettingBatter: false,
        isStartingInnings: false,
        isAwardingMOM: false,
      });

      const { rerender, unmount } = render(
        <MemoryRouter initialEntries={['/matches/1/scorer']}>
          <Routes>
            <Route path="/matches/:id/scorer" element={<ScorerConsole />} />
          </Routes>
        </MemoryRouter>
      );

      // Listener attached exactly once on mount
      const keydownAddCalls = addEventListenerSpy.mock.calls.filter((c) => c[0] === 'keydown');
      expect(keydownAddCalls.length).toBe(1);

      // Re-render multiple times
      rerender(
        <MemoryRouter initialEntries={['/matches/1/scorer']}>
          <Routes>
            <Route path="/matches/:id/scorer" element={<ScorerConsole />} />
          </Routes>
        </MemoryRouter>
      );
      rerender(
        <MemoryRouter initialEntries={['/matches/1/scorer']}>
          <Routes>
            <Route path="/matches/:id/scorer" element={<ScorerConsole />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify zero removal/re-addition churn across re-renders
      const keydownAddCallsAfterRerenders = addEventListenerSpy.mock.calls.filter((c) => c[0] === 'keydown');
      const keydownRemoveCalls = removeEventListenerSpy.mock.calls.filter((c) => c[0] === 'keydown');
      expect(keydownAddCallsAfterRerenders.length).toBe(1);
      expect(keydownRemoveCalls.length).toBe(0);

      // Pressing number keys invokes handleRuns
      fireEvent.keyDown(window, { key: '4' });
      expect(mockHandleRuns).toHaveBeenCalledWith(4);

      fireEvent.keyDown(window, { key: '1' });
      expect(mockHandleRuns).toHaveBeenCalledWith(1);

      // Pressing 'w' invokes wide extra
      fireEvent.keyDown(window, { key: 'w' });
      expect(mockHandleExtra).toHaveBeenCalledWith('wide', 1);

      // Pressing 'n' invokes noball extra
      fireEvent.keyDown(window, { key: 'n' });
      expect(mockHandleExtra).toHaveBeenCalledWith('noball', 1);

      // Pressing 'l' invokes leg-bye extra
      fireEvent.keyDown(window, { key: 'l' });
      expect(mockHandleExtra).toHaveBeenCalledWith('leg-bye', 1);

      // Pressing 'b' invokes bye extra
      fireEvent.keyDown(window, { key: 'b' });
      expect(mockHandleExtra).toHaveBeenCalledWith('bye', 1);

      // Pressing 'k' opens wicket modal
      fireEvent.keyDown(window, { key: 'k' });
      expect(mockSetShowWicketModal).toHaveBeenCalledWith(true);

      // Pressing 's' swaps strike
      fireEvent.keyDown(window, { key: 's' });
      expect(mockHandleSwapStrike).toHaveBeenCalledTimes(1);

      // Pressing 'u' undos delivery
      fireEvent.keyDown(window, { key: 'u' });
      expect(mockHandleUndoDelivery).toHaveBeenCalledTimes(1);

      // Unmounting cleans up listener
      unmount();
      const finalRemoveCalls = removeEventListenerSpy.mock.calls.filter((c) => c[0] === 'keydown');
      expect(finalRemoveCalls.length).toBe(1);
    });

    it('useScorerActions callbacks maintain referential stability across re-renders', () => {
      const queryClient = new QueryClient();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const mockModals = {
        showWicketModal: false,
        setShowWicketModal: vi.fn(),
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),
      };

      const mockNotify = vi.fn();
      const mockGetErrorMessage = vi.fn();
      const mockInvalidateAll = vi.fn();

      const { result, rerender } = renderHook(
        (props) =>
          useScorerActions({
            matchId: 1,
            inningsNumber: 1,
            modals: props.modals,
            notify: mockNotify,
            getErrorMessage: mockGetErrorMessage,
            invalidateAll: mockInvalidateAll,
          }),
        {
          wrapper,
          initialProps: { modals: mockModals },
        }
      );

      const firstHandleRuns = result.current.handleRuns;
      const firstHandleExtra = result.current.handleExtra;
      const firstHandleSwap = result.current.handleSwapStrike;
      const firstHandleUndo = result.current.handleUndoDelivery;

      // Re-render the hook with the same props
      rerender({ modals: mockModals });

      // Action handlers should be referentially stable
      expect(result.current.handleRuns).toBe(firstHandleRuns);
      expect(result.current.handleExtra).toBe(firstHandleExtra);
      expect(result.current.handleSwapStrike).toBe(firstHandleSwap);
      expect(result.current.handleUndoDelivery).toBe(firstHandleUndo);
    });
  });
});
