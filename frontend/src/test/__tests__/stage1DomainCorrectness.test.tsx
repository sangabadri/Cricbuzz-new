import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WicketModal } from '../../components/scorer/modals/WicketModal';
import { BowlerModal } from '../../components/scorer/modals/BowlerModal';
import { CreaseHud } from '../../components/scorer/CreaseHud';
import { useScorerActions } from '../../hooks/useScorerActions';
import type { UseScorerModalsReturn } from '../../hooks/useScorerModals';
import { cricketApi } from '../../api/client';
import type {
  LiveMatchResponse,
  LiveScorerStateResponse,
  SquadResponse,
} from '../../types/cricket';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const mockBowlingSquad: SquadResponse = {
  id: 1,
  match_id: 10,
  team_id: 2,
  captain_id: 201,
  wicket_keeper_id: 205,
  players: [
    { player_id: 201, is_playing_xi: true, player_name: 'Jasprit Bumrah', role: 'Bowler' },
    { player_id: 202, is_playing_xi: true, player_name: 'Trent Boult', role: 'Bowler' },
    { player_id: 203, is_playing_xi: true, player_name: 'Hardik Pandya', role: 'All-Rounder' },
    { player_id: 205, is_playing_xi: true, player_name: 'Ishan Kishan', role: 'Wicket-Keeper' },
  ],
};

const mockScorerState: LiveScorerStateResponse = {
  match_id: 10,
  innings_number: 1,
  match_status: 'live',
  innings_status: 'in_progress',
  total_runs: 85,
  total_wickets: 2,
  current_over: 9,
  balls_in_over: 4,
  overs_display: '9.4',
  legal_balls: 58,
  current_run_rate: 8.79,
  target: null,
  striker_id: 101,
  striker_name: 'Virat Kohli',
  striker_runs: 45,
  striker_balls: 32,
  non_striker_id: 102,
  non_striker_name: 'Faf du Plessis',
  non_striker_runs: 35,
  non_striker_balls: 26,
  current_bowler_id: 201,
  current_bowler_name: 'Jasprit Bumrah',
  current_bowler_overs: '2.4',
  current_bowler_runs: 18,
  current_bowler_wickets: 1,
  over_completed: false,
  current_over_balls: ['1', '4', '0', '1'],
  next_action: 'NEXT_BALL',
  eligible_bowler_ids: [202, 203],
};

const mockLiveTicker: LiveMatchResponse = {
  match_id: 10,
  status: 'live',
  format: 't20',
  venue: 'Wankhede Stadium',
  team_a_name: 'Royal Challengers Bengaluru',
  team_b_name: 'Mumbai Indians',
  current_innings_number: 1,
  runs: 85,
  wickets: 2,
  overs: { completed_overs: 9, balls: 4, total_legal_balls: 58 },
  current_run_rate: 8.79,
  striker: {
    player_id: 101,
    name: 'Virat Kohli',
    runs: 45,
    balls: 32,
    fours: 5,
    sixes: 2,
    strike_rate: 140.63,
  },
  non_striker: {
    player_id: 102,
    name: 'Faf du Plessis',
    runs: 35,
    balls: 26,
    fours: 4,
    sixes: 1,
    strike_rate: 134.62,
  },
  current_bowler: {
    player_id: 201,
    name: 'Jasprit Bumrah',
    overs: { completed_overs: 2, balls: 4, total_legal_balls: 16 },
    maidens: 0,
    runs: 18,
    wickets: 1,
    economy: 6.75,
  },
  current_over_balls: [],
  last_event_is_wicket: false,
};

describe('Stage 1 Domain Correctness & Invariants', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. WicketModal - Run Out Dismissal Batter Choice', () => {
    it('renders choice between Striker and Non-Striker with their names when wicketType is run_out', () => {
      const onPlayerOutChange = vi.fn();

      render(
        <WicketModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          wicketType="run_out"
          onWicketTypeChange={vi.fn()}
          fielderId={undefined}
          onFielderChange={vi.fn()}
          wicketRuns={1}
          onWicketRunsChange={vi.fn()}
          playerOutId={101}
          onPlayerOutChange={onPlayerOutChange}
          strikerId={101}
          strikerName="Virat Kohli"
          nonStrikerId={102}
          nonStrikerName="Faf du Plessis"
          bowlingSquad={mockBowlingSquad}
        />
      );

      expect(screen.getByText('Dismissed Batter (Run Out)')).toBeInTheDocument();
      expect(screen.getByText('Virat Kohli')).toBeInTheDocument();
      expect(screen.getByText('Faf du Plessis')).toBeInTheDocument();

      // Click non-striker
      fireEvent.click(screen.getByText('Faf du Plessis'));
      expect(onPlayerOutChange).toHaveBeenCalledWith(102);

      // Click striker
      fireEvent.click(screen.getByText('Virat Kohli'));
      expect(onPlayerOutChange).toHaveBeenCalledWith(101);
    });

    it('does not render Run Out batter selector for non-run-out wickets (bowled/caught)', () => {
      render(
        <WicketModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          wicketType="bowled"
          onWicketTypeChange={vi.fn()}
          fielderId={undefined}
          onFielderChange={vi.fn()}
          wicketRuns={0}
          onWicketRunsChange={vi.fn()}
          playerOutId={101}
          onPlayerOutChange={vi.fn()}
          strikerId={101}
          strikerName="Virat Kohli"
          nonStrikerId={102}
          nonStrikerName="Faf du Plessis"
          bowlingSquad={mockBowlingSquad}
        />
      );

      expect(screen.queryByText('Dismissed Batter (Run Out)')).not.toBeInTheDocument();
    });
  });

  describe('2. WicketModal & useScorerActions - Stumping Designated Keeper Invariant', () => {
    it('displays designated keeper banner and synchronizes fielderId to keeper on stumping', () => {
      const onFielderChange = vi.fn();

      render(
        <WicketModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          wicketType="stumped"
          onWicketTypeChange={vi.fn()}
          fielderId={undefined}
          onFielderChange={onFielderChange}
          wicketRuns={0}
          onWicketRunsChange={vi.fn()}
          bowlingSquad={mockBowlingSquad}
        />
      );

      expect(screen.getByText('Designated Wicket-Keeper')).toBeInTheDocument();
      expect(screen.getByText('Ishan Kishan')).toBeInTheDocument();
      expect(
        screen.getByText(/Per cricket rules, stumpings are credited strictly to the fielding team's designated wicket-keeper/)
      ).toBeInTheDocument();

      expect(onFielderChange).toHaveBeenCalledWith(205);
    });

    it('useScorerActions submits bowlingSquad.wicket_keeper_id for stumped dismissal', async () => {
      const recordSpy = vi.spyOn(cricketApi, 'recordDelivery').mockResolvedValue(mockScorerState);

      const mockModals: UseScorerModalsReturn = {
        showWicketModal: true,
        setShowWicketModal: vi.fn(),
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),
        wicketType: 'stumped',
        setWicketType: vi.fn(),
        fielderId: undefined, // omitted from UI
        setFielderId: vi.fn(),
        wicketRuns: 0,
        setWicketRuns: vi.fn(),
        playerOutId: undefined,
        setPlayerOutId: vi.fn(),
        resetWicketForm: vi.fn(),
        startStrikerId: undefined,
        setStartStrikerId: vi.fn(),
        startNonStrikerId: undefined,
        setStartNonStrikerId: vi.fn(),
        startBowlerId: undefined,
        setStartBowlerId: vi.fn(),
        momPlayerId: undefined,
        setMomPlayerId: vi.fn(),
      };

      const queryClient = createTestQueryClient();
      const notify = vi.fn();

      const { result } = renderHook(
        () =>
          useScorerActions({
            matchId: 10,
            inningsNumber: 1,
            modals: mockModals,
            notify,
            getErrorMessage: (e) => String(e),
            invalidateAll: vi.fn(),
            scorerState: mockScorerState,
            bowlingSquad: mockBowlingSquad,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await act(async () => {
        result.current.handleWicketSubmit();
      });

      expect(recordSpy).toHaveBeenCalledWith(10, 1, {
        is_wicket: true,
        wicket_type: 'stumped',
        player_out_id: 101, // automatically assigned to active striker
        fielder_id: 205, // automatically assigned to designated keeper
        runs: 0,
      });
      expect(mockModals.setShowWicketModal).toHaveBeenCalledWith(false);
    });

    it('useScorerActions correctly submits selected player_out_id for run_out dismissal', async () => {
      const recordSpy = vi.spyOn(cricketApi, 'recordDelivery').mockResolvedValue(mockScorerState);

      const mockModals: UseScorerModalsReturn = {
        showWicketModal: true,
        setShowWicketModal: vi.fn(),
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),
        wicketType: 'run_out',
        setWicketType: vi.fn(),
        fielderId: 202,
        setFielderId: vi.fn(),
        wicketRuns: 1,
        setWicketRuns: vi.fn(),
        playerOutId: 102, // Non-striker was selected as run out
        setPlayerOutId: vi.fn(),
        resetWicketForm: vi.fn(),
        startStrikerId: undefined,
        setStartStrikerId: vi.fn(),
        startNonStrikerId: undefined,
        setStartNonStrikerId: vi.fn(),
        startBowlerId: undefined,
        setStartBowlerId: vi.fn(),
        momPlayerId: undefined,
        setMomPlayerId: vi.fn(),
      };

      const queryClient = createTestQueryClient();
      const notify = vi.fn();

      const { result } = renderHook(
        () =>
          useScorerActions({
            matchId: 10,
            inningsNumber: 1,
            modals: mockModals,
            notify,
            getErrorMessage: (e) => String(e),
            invalidateAll: vi.fn(),
            scorerState: mockScorerState,
            bowlingSquad: mockBowlingSquad,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await act(async () => {
        result.current.handleWicketSubmit();
      });

      expect(recordSpy).toHaveBeenCalledWith(10, 1, {
        is_wicket: true,
        wicket_type: 'run_out',
        player_out_id: 102, // non-striker
        fielder_id: 202,
        runs: 1,
      });
    });

    it('useScorerActions clears fielder_id for bowled dismissals to satisfy domain laws', async () => {
      const recordSpy = vi.spyOn(cricketApi, 'recordDelivery').mockResolvedValue(mockScorerState);

      const mockModals: UseScorerModalsReturn = {
        showWicketModal: true,
        setShowWicketModal: vi.fn(),
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),
        wicketType: 'bowled',
        setWicketType: vi.fn(),
        fielderId: 202, // leftover in state
        setFielderId: vi.fn(),
        wicketRuns: 0,
        setWicketRuns: vi.fn(),
        playerOutId: 101,
        setPlayerOutId: vi.fn(),
        resetWicketForm: vi.fn(),
        startStrikerId: undefined,
        setStartStrikerId: vi.fn(),
        startNonStrikerId: undefined,
        setStartNonStrikerId: vi.fn(),
        startBowlerId: undefined,
        setStartBowlerId: vi.fn(),
        momPlayerId: undefined,
        setMomPlayerId: vi.fn(),
      };

      const queryClient = createTestQueryClient();
      const notify = vi.fn();

      const { result } = renderHook(
        () =>
          useScorerActions({
            matchId: 10,
            inningsNumber: 1,
            modals: mockModals,
            notify,
            getErrorMessage: (e) => String(e),
            invalidateAll: vi.fn(),
            scorerState: mockScorerState,
            bowlingSquad: mockBowlingSquad,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await act(async () => {
        result.current.handleWicketSubmit();
      });

      expect(recordSpy).toHaveBeenCalledWith(10, 1, {
        is_wicket: true,
        wicket_type: 'bowled',
        player_out_id: 101,
        fielder_id: undefined, // sanitized
        runs: 0,
      });
      expect(mockModals.resetWicketForm).toHaveBeenCalled();
    });

    it('disables confirm button and displays warning when stumping is selected without designated keeper', () => {
      const squadWithoutKeeper: SquadResponse = {
        ...mockBowlingSquad,
        wicket_keeper_id: undefined,
      };

      render(
        <WicketModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          wicketType="stumped"
          onWicketTypeChange={vi.fn()}
          fielderId={undefined}
          onFielderChange={vi.fn()}
          wicketRuns={0}
          onWicketRunsChange={vi.fn()}
          bowlingSquad={squadWithoutKeeper}
        />
      );

      expect(
        screen.getByText('Cannot record stumping: Fielding team has no designated wicket-keeper assigned in squad.')
      ).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /Confirm Out/i });
      expect(confirmButton).toBeDisabled();
    });

    it('useScorerActions rejects stumping and notifies user when fielding squad has no designated keeper', async () => {
      const recordSpy = vi.spyOn(cricketApi, 'recordDelivery').mockResolvedValue(mockScorerState);

      const mockModals: UseScorerModalsReturn = {
        showWicketModal: true,
        setShowWicketModal: vi.fn(),
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),
        wicketType: 'stumped',
        setWicketType: vi.fn(),
        fielderId: undefined,
        setFielderId: vi.fn(),
        wicketRuns: 0,
        setWicketRuns: vi.fn(),
        playerOutId: undefined,
        setPlayerOutId: vi.fn(),
        resetWicketForm: vi.fn(),
        startStrikerId: undefined,
        setStartStrikerId: vi.fn(),
        startNonStrikerId: undefined,
        setStartNonStrikerId: vi.fn(),
        startBowlerId: undefined,
        setStartBowlerId: vi.fn(),
        momPlayerId: undefined,
        setMomPlayerId: vi.fn(),
      };

      const queryClient = createTestQueryClient();
      const notify = vi.fn();

      const { result } = renderHook(
        () =>
          useScorerActions({
            matchId: 10,
            inningsNumber: 1,
            modals: mockModals,
            notify,
            getErrorMessage: (e) => String(e),
            invalidateAll: vi.fn(),
            scorerState: mockScorerState,
            bowlingSquad: { ...mockBowlingSquad, wicket_keeper_id: undefined },
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await act(async () => {
        result.current.handleWicketSubmit();
      });

      expect(recordSpy).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith(
        'Cannot record stumping: fielding squad has no designated wicket-keeper.',
        'error'
      );
    });

    it('useScorerActions rejects run out when playerOutId is not an active crease batter', async () => {
      const recordSpy = vi.spyOn(cricketApi, 'recordDelivery').mockResolvedValue(mockScorerState);

      const mockModals: UseScorerModalsReturn = {
        showWicketModal: true,
        setShowWicketModal: vi.fn(),
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),
        wicketType: 'run_out',
        setWicketType: vi.fn(),
        fielderId: undefined,
        setFielderId: vi.fn(),
        wicketRuns: 0,
        setWicketRuns: vi.fn(),
        playerOutId: 999, // Inactive player
        setPlayerOutId: vi.fn(),
        resetWicketForm: vi.fn(),
        startStrikerId: undefined,
        setStartStrikerId: vi.fn(),
        startNonStrikerId: undefined,
        setStartNonStrikerId: vi.fn(),
        startBowlerId: undefined,
        setStartBowlerId: vi.fn(),
        momPlayerId: undefined,
        setMomPlayerId: vi.fn(),
      };

      const queryClient = createTestQueryClient();
      const notify = vi.fn();

      const { result } = renderHook(
        () =>
          useScorerActions({
            matchId: 10,
            inningsNumber: 1,
            modals: mockModals,
            notify,
            getErrorMessage: (e) => String(e),
            invalidateAll: vi.fn(),
            scorerState: mockScorerState,
            bowlingSquad: mockBowlingSquad,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await act(async () => {
        result.current.handleWicketSubmit();
      });

      expect(recordSpy).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith(
        'Dismissed player must be one of the active crease batters.',
        'error'
      );
    });

    it('useScorerActions sanitizes non-zero runs to 0 for bowled dismissals', async () => {
      const recordSpy = vi.spyOn(cricketApi, 'recordDelivery').mockResolvedValue(mockScorerState);

      const mockModals: UseScorerModalsReturn = {
        showWicketModal: true,
        setShowWicketModal: vi.fn(),
        showBowlerModal: false,
        setShowBowlerModal: vi.fn(),
        showIncomingBatterModal: false,
        setShowIncomingBatterModal: vi.fn(),
        showStartInningsModal: false,
        setShowStartInningsModal: vi.fn(),
        wicketType: 'bowled',
        setWicketType: vi.fn(),
        fielderId: undefined,
        setFielderId: vi.fn(),
        wicketRuns: 3, // leftover runs in form state
        setWicketRuns: vi.fn(),
        playerOutId: 101,
        setPlayerOutId: vi.fn(),
        resetWicketForm: vi.fn(),
        startStrikerId: undefined,
        setStartStrikerId: vi.fn(),
        startNonStrikerId: undefined,
        setStartNonStrikerId: vi.fn(),
        startBowlerId: undefined,
        setStartBowlerId: vi.fn(),
        momPlayerId: undefined,
        setMomPlayerId: vi.fn(),
      };

      const queryClient = createTestQueryClient();
      const notify = vi.fn();

      const { result } = renderHook(
        () =>
          useScorerActions({
            matchId: 10,
            inningsNumber: 1,
            modals: mockModals,
            notify,
            getErrorMessage: (e) => String(e),
            invalidateAll: vi.fn(),
            scorerState: mockScorerState,
            bowlingSquad: mockBowlingSquad,
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await act(async () => {
        result.current.handleWicketSubmit();
      });

      expect(recordSpy).toHaveBeenCalledWith(10, 1, {
        is_wicket: true,
        wicket_type: 'bowled',
        player_out_id: 101,
        fielder_id: undefined,
        runs: 0, // strictly sanitized
      });
    });
  });

  describe('3. Crease HUD - Data Starvation Fix with Live Match Metrics', () => {
    it('renders rich batter boundaries and bowler economy when liveTicker is provided', () => {
      render(
        <CreaseHud
          scorerState={mockScorerState}
          liveTicker={mockLiveTicker}
          onSwapStrike={vi.fn()}
          onChangeBowler={vi.fn()}
          onUndoBall={vi.fn()}
        />
      );

      // Striker card
      expect(screen.getByText('Virat Kohli')).toBeInTheDocument();
      expect(screen.getByText('32 balls faced')).toBeInTheDocument();
      expect(screen.getByText('5×4, 2×6')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();

      // Non-striker card
      expect(screen.getByText('Faf du Plessis')).toBeInTheDocument();
      expect(screen.getByText('26 balls faced')).toBeInTheDocument();
      expect(screen.getByText('4×4, 1×6')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();

      // Bowler card
      expect(screen.getByText('Jasprit Bumrah')).toBeInTheDocument();
      expect(screen.getByText('2.4 ov')).toBeInTheDocument();
      expect(screen.getByText(/Econ: 6.75 • 0m/)).toBeInTheDocument();
    });

    it('falls back safely to scorerState figures when liveTicker is absent', () => {
      render(
        <CreaseHud
          scorerState={mockScorerState}
          onSwapStrike={vi.fn()}
          onChangeBowler={vi.fn()}
          onUndoBall={vi.fn()}
        />
      );

      expect(screen.getByText('Virat Kohli')).toBeInTheDocument();
      expect(screen.getByText('32 balls faced')).toBeInTheDocument();
      expect(screen.queryByText('5×4, 2×6')).not.toBeInTheDocument();
      expect(screen.getByText('Faf du Plessis')).toBeInTheDocument();
      expect(screen.getByText('Jasprit Bumrah')).toBeInTheDocument();
    });

    it('ignores liveTicker figures when liveTicker innings number does not match scorerState innings number', () => {
      render(
        <CreaseHud
          scorerState={{ ...mockScorerState, innings_number: 1 }}
          liveTicker={{ ...mockLiveTicker, current_innings_number: 2 }}
          onSwapStrike={vi.fn()}
          onChangeBowler={vi.fn()}
          onUndoBall={vi.fn()}
        />
      );

      // Boundary counts from innings 2 should not be shown for innings 1
      expect(screen.queryByText('5×4, 2×6')).not.toBeInTheDocument();
      expect(screen.queryByText('4×4, 1×6')).not.toBeInTheDocument();
    });
  });

  describe('4. BowlerModal - Quota & Eligibility Enforcement', () => {
    it('disables bowlers not in eligibleBowlerIds with "Over quota / ineligible" badge', () => {
      const onSelectBowler = vi.fn();

      render(
        <BowlerModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectBowler={onSelectBowler}
          bowlingSquad={mockBowlingSquad}
          currentBowlerId={201}
          eligibleBowlerIds={[202]} // only Trent Boult is eligible; 201 is current, 203 & 205 ineligible
        />
      );

      // Current bowler: 201 (Jasprit Bumrah)
      const bumrahButton = screen.getByText('Jasprit Bumrah').closest('button')!;
      expect(bumrahButton).toBeDisabled();
      expect(screen.getByText('Just Bowled')).toBeInTheDocument();

      // Ineligible bowler: 203 (Hardik Pandya)
      const pandyaButton = screen.getByText('Hardik Pandya').closest('button')!;
      expect(pandyaButton).toBeDisabled();
      expect(screen.getAllByText('Over quota / ineligible').length).toBeGreaterThan(0);

      // Eligible bowler: 202 (Trent Boult)
      const boultButton = screen.getByText('Trent Boult').closest('button')!;
      expect(boultButton).not.toBeDisabled();
      expect(screen.getByText('Eligible')).toBeInTheDocument();

      // Clicking eligible bowler invokes callback
      fireEvent.click(boultButton);
      expect(onSelectBowler).toHaveBeenCalledWith(202);

      // Clicking disabled bowler does not invoke callback
      fireEvent.click(pandyaButton);
      expect(onSelectBowler).toHaveBeenCalledTimes(1);
    });
  });
});
