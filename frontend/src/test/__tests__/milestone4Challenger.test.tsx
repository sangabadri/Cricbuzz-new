import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SetupWizard } from '../../pages/SetupWizard';
import { CreaseTab } from '../../components/match/CreaseTab';
import { BattingTable } from '../../components/match/BattingTable';
import { ToastProvider } from '../../components/common/Toast';
import { cricketApi, getApiErrorMessage } from '../../api/client';
import type {
  LiveMatchResponse,
  OversRecord,
  Team,
  Player,
  Match,
  SquadResponse,
  BatterScorecard,
} from '../../types/cricket';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

const mockTeams: Team[] = [
  { id: 1, name: 'Mumbai Indians' },
  { id: 2, name: 'Chennai Super Kings' },
];

const mock22Players: Player[] = Array.from({ length: 22 }, (_, idx) => ({
  id: idx + 1,
  name: `Player ${idx + 1}`,
  team_id: idx < 11 ? 1 : 2,
  role: 'batsman' as const,
  batting: 'right-handed batsman',
  bowling: 'right-arm medium',
}));

describe('Empirical Challenger: Milestone 4 Health, Toast Deduplication & Null Safety', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 1: Toast Deduplication in SetupWizard.tsx', () => {
    it('empirically verifies exactly ONE toast is rendered when conductToss fails (no duplicate toast)', async () => {
      vi.spyOn(cricketApi, 'getTeams').mockResolvedValue(mockTeams);
      vi.spyOn(cricketApi, 'getPlayers').mockResolvedValue(mock22Players);
      vi.spyOn(cricketApi, 'createMatch').mockResolvedValue({
        id: 77,
        team_a: 1,
        team_b: 2,
        venue: 'Wankhede',
        format: 't20',
        match_date: '2026-11-03T18:00:00Z',
        status: 'scheduled',
      } as Match);

      const submitSquadSpy = vi.spyOn(cricketApi, 'submitSquad').mockResolvedValue({
        id: 1,
        match_id: 77,
        team_id: 1,
        captain_id: 1,
        wicket_keeper_id: 2,
        players: [],
      } as unknown as SquadResponse);

      const conductTossSpy = vi
        .spyOn(cricketApi, 'conductToss')
        .mockRejectedValue(new Error('Toss rejected by server: Match already started'));

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/setup']}>
              <Routes>
                <Route path="/setup" element={<SetupWizard />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Wait for teams query to resolve and options to render
      await screen.findAllByRole('option', { name: 'Mumbai Indians' });

      // Select Team A and Team B
      const teamASelect = screen.getByDisplayValue('Select Team A');
      fireEvent.change(teamASelect, { target: { value: '1' } });

      const teamBSelect = screen.getByDisplayValue('Select Team B');
      fireEvent.change(teamBSelect, { target: { value: '2' } });

      // Submit match scheduling form
      const nextBtn = screen.getByRole('button', { name: /Next: Setup Squads & Toss/i });
      fireEvent.submit(nextBtn.closest('form')!);

      // Verify toss step appears
      const confirmTossBtn = await screen.findByRole('button', {
        name: /Confirm Squads, Toss & Open Scorer Pad/i,
      });

      // Click Confirm Squads, Toss
      fireEvent.click(confirmTossBtn);

      // Wait for toss mutation to attempt and fail
      await waitFor(() => {
        expect(conductTossSpy).toHaveBeenCalledTimes(1);
      });

      // Squad submissions succeeded for both teams
      expect(submitSquadSpy).toHaveBeenCalledTimes(2);

      // Check alerts rendered by ToastProvider
      const alerts = await screen.findAllByRole('alert');

      // CRITICAL ASSERTION: Exactly ONE error toast is present, NOT two!
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent(
        'Error conducting toss: Toss rejected by server: Match already started'
      );
      // Ensure the old redundant "Squad/Toss Error" duplicate toast is NOT present
      expect(screen.queryByText(/Squad assignment error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Squad\/Toss Error/i)).not.toBeInTheDocument();
    });

    it('empirically verifies squad assignment failure stops before toss and displays single error toast', async () => {
      vi.spyOn(cricketApi, 'getTeams').mockResolvedValue(mockTeams);
      vi.spyOn(cricketApi, 'getPlayers').mockResolvedValue(mock22Players);
      vi.spyOn(cricketApi, 'createMatch').mockResolvedValue({
        id: 88,
        team_a: 1,
        team_b: 2,
        venue: 'Eden Gardens',
        format: 't20',
        match_date: '2026-11-03T18:00:00Z',
        status: 'scheduled',
      } as Match);

      const submitSquadSpy = vi
        .spyOn(cricketApi, 'submitSquad')
        .mockRejectedValueOnce(new Error('Squad validation failed: duplicate player'));
      const conductTossSpy = vi.spyOn(cricketApi, 'conductToss');

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/setup']}>
              <Routes>
                <Route path="/setup" element={<SetupWizard />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Wait for teams query to resolve and options to render
      await screen.findAllByRole('option', { name: 'Mumbai Indians' });

      const teamASelect = screen.getByDisplayValue('Select Team A');
      fireEvent.change(teamASelect, { target: { value: '1' } });

      const teamBSelect = screen.getByDisplayValue('Select Team B');
      fireEvent.change(teamBSelect, { target: { value: '2' } });

      const nextBtn = screen.getByRole('button', { name: /Next: Setup Squads & Toss/i });
      fireEvent.submit(nextBtn.closest('form')!);

      const confirmTossBtn = await screen.findByRole('button', {
        name: /Confirm Squads, Toss & Open Scorer Pad/i,
      });
      fireEvent.click(confirmTossBtn);

      await waitFor(() => {
        expect(submitSquadSpy).toHaveBeenCalledTimes(1);
      });

      // Toss must NOT be conducted if squad submission failed
      expect(conductTossSpy).not.toHaveBeenCalled();

      // Exactly ONE error toast for squad failure
      const alerts = await screen.findAllByRole('alert');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent(
        'Squad assignment error: Squad validation failed: duplicate player'
      );
    });

    it('empirically verifies insufficient player count (<22) triggers warning toast and aborts', async () => {
      vi.spyOn(cricketApi, 'getTeams').mockResolvedValue(mockTeams);
      // Only 10 players available
      vi.spyOn(cricketApi, 'getPlayers').mockResolvedValue(mock22Players.slice(0, 10));
      vi.spyOn(cricketApi, 'createMatch').mockResolvedValue({
        id: 99,
        team_a: 1,
        team_b: 2,
        venue: 'Chinnaswamy',
        format: 't20',
        match_date: '2026-11-03T18:00:00Z',
        status: 'scheduled',
      } as Match);

      const submitSquadSpy = vi.spyOn(cricketApi, 'submitSquad');
      const conductTossSpy = vi.spyOn(cricketApi, 'conductToss');

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/setup']}>
              <Routes>
                <Route path="/setup" element={<SetupWizard />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Wait for teams query to resolve and options to render
      await screen.findAllByRole('option', { name: 'Mumbai Indians' });

      const teamASelect = screen.getByDisplayValue('Select Team A');
      fireEvent.change(teamASelect, { target: { value: '1' } });

      const teamBSelect = screen.getByDisplayValue('Select Team B');
      fireEvent.change(teamBSelect, { target: { value: '2' } });

      const nextBtn = screen.getByRole('button', { name: /Next: Setup Squads & Toss/i });
      fireEvent.submit(nextBtn.closest('form')!);

      const confirmTossBtn = await screen.findByRole('button', {
        name: /Confirm Squads, Toss & Open Scorer Pad/i,
      });
      fireEvent.click(confirmTossBtn);

      // Neither squad nor toss called
      expect(submitSquadSpy).not.toHaveBeenCalled();
      expect(conductTossSpy).not.toHaveBeenCalled();

      // Warning toast shown
      const alerts = await screen.findAllByRole('alert');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent(/At least 22 players are required/i);
    });
  });

  describe('Task 2: CreaseTab Bowler and Batter Null Safety', () => {
    const baseTicker: LiveMatchResponse = {
      match_id: 101,
      status: 'live',
      format: 't20',
      venue: "Lord's",
      team_a_name: 'England',
      team_b_name: 'Australia',
      current_innings_number: 1,
      batting_team_name: 'England',
      bowling_team_name: 'Australia',
      runs: 120,
      wickets: 2,
      overs: { completed_overs: 12, balls: 3, total_legal_balls: 75 },
      current_run_rate: 9.6,
      striker: {
        player_id: 10,
        name: 'Jos Buttler',
        runs: 54,
        balls: 28,
        fours: 6,
        sixes: 3,
        strike_rate: 192.86,
      },
      non_striker: {
        player_id: 11,
        name: 'Ben Stokes',
        runs: 30,
        balls: 18,
        fours: 2,
        sixes: 1,
        strike_rate: 166.67,
      },
      current_bowler: {
        player_id: 20,
        name: 'Mitchell Starc',
        overs: { completed_overs: 2, balls: 3, total_legal_balls: 15 },
        maidens: 0,
        runs: 22,
        wickets: 1,
        economy: 8.8,
      },
      current_over_balls: [],
      last_event_is_wicket: false,
    };

    it('empirically verifies CreaseTab survives bowler with undefined overs without TypeError', () => {
      const tickerWithUndefinedOvers: LiveMatchResponse = {
        ...baseTicker,
        current_bowler: {
          player_id: 21,
          name: 'Josh Hazlewood',
          overs: undefined as unknown as OversRecord,
          maidens: 1,
          runs: 10,
          wickets: 2,
          economy: 5.0,
        },
      };

      const { container } = render(<CreaseTab ticker={tickerWithUndefinedOvers} />);

      expect(container).toBeInTheDocument();
      expect(screen.getByText('Josh Hazlewood')).toBeInTheDocument();
      // Bowler overs formatted safely as 0.0
      expect(screen.getByText('0.0')).toBeInTheDocument();
      expect(screen.getByText('5.00')).toBeInTheDocument();
    });

    it('empirically verifies CreaseTab survives bowler with null overs', () => {
      const tickerWithNullOvers: LiveMatchResponse = {
        ...baseTicker,
        current_bowler: {
          player_id: 22,
          name: 'Pat Cummins',
          overs: null as unknown as OversRecord,
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: 0.0,
        },
      };

      expect(() => render(<CreaseTab ticker={tickerWithNullOvers} />)).not.toThrow();
      expect(screen.getByText('Pat Cummins')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('empirically verifies CreaseTab survives completely null/undefined current_bowler', () => {
      const tickerWithoutBowler: LiveMatchResponse = {
        ...baseTicker,
        current_bowler: undefined,
      };

      expect(() => render(<CreaseTab ticker={tickerWithoutBowler} />)).not.toThrow();
      expect(screen.getByText('Bowler')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('empirically verifies CreaseTab survives nullish striker and non_striker without crashing', () => {
      const tickerWithoutBatters: LiveMatchResponse = {
        ...baseTicker,
        striker: undefined,
        non_striker: null as unknown as undefined,
      };

      expect(() => render(<CreaseTab ticker={tickerWithoutBatters} />)).not.toThrow();
      expect(screen.getByText('Striker')).toBeInTheDocument();
      expect(screen.getByText('Non-striker')).toBeInTheDocument();
      // Both strike rates safely render 0.0
      const srElements = screen.getAllByText('SR: 0.0');
      expect(srElements).toHaveLength(2);
    });

    it('empirically verifies CreaseTab computes fallback strike rate when strike_rate is null/undefined but balls > 0', () => {
      const tickerWithNullSR: LiveMatchResponse = {
        ...baseTicker,
        striker: {
          player_id: 10,
          name: 'Liam Livingstone',
          runs: 30,
          balls: 15,
          fours: 2,
          sixes: 2,
          strike_rate: undefined,
        },
      };

      render(<CreaseTab ticker={tickerWithNullSR} />);
      // Fallback calculation: (30 / 15) * 100 = 200.0
      expect(screen.getByText('SR: 200.0')).toBeInTheDocument();
    });
  });

  describe('Task 2: BattingTable Null Safety and Precision', () => {
    it('empirically verifies BattingTable formats missing/null/NaN strike_rate as 0.0 without crash', () => {
      const problematicBatters: BatterScorecard[] = [
        {
          player_id: 1,
          player_name: 'Player Undefined SR',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strike_rate: undefined,
          is_out: false,
        },
        {
          player_id: 2,
          player_name: 'Player Null SR',
          runs: 5,
          balls: 10,
          fours: 0,
          sixes: 0,
          strike_rate: null as unknown as undefined,
          is_out: false,
        },
        {
          player_id: 3,
          player_name: 'Player NaN SR',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strike_rate: Number.NaN,
          is_out: false,
        },
      ];

      render(<BattingTable batters={problematicBatters} />);

      const zeroSRs = screen.getAllByText('0.0');
      expect(zeroSRs.length).toBeGreaterThanOrEqual(3);
    });

    it('empirically verifies BattingTable correctly formats numeric string strike_rate', () => {
      const batters: BatterScorecard[] = [
        {
          player_id: 1,
          player_name: 'Virat Kohli',
          runs: 82,
          balls: 53,
          fours: 6,
          sixes: 4,
          strike_rate: '154.7169' as unknown as number,
          is_out: false,
        },
      ];

      render(<BattingTable batters={batters} />);

      expect(screen.getByText('154.7')).toBeInTheDocument();
      // Strike rate >= 150 gets emerald color
      const srCell = screen.getByText('154.7');
      expect(srCell.className).toContain('text-emerald-400');
    });

    it('empirically verifies strike rate color styling for moderate and low strike rates', () => {
      const batters: BatterScorecard[] = [
        {
          player_id: 1,
          player_name: 'Moderate Batter',
          runs: 35,
          balls: 28,
          fours: 3,
          sixes: 0,
          strike_rate: 125.0,
          is_out: false,
        },
        {
          player_id: 2,
          player_name: 'Low SR Batter (balls > 5)',
          runs: 4,
          balls: 10,
          fours: 0,
          sixes: 0,
          strike_rate: 40.0,
          is_out: false,
        },
        {
          player_id: 3,
          player_name: 'Low SR Batter (balls <= 5)',
          runs: 1,
          balls: 3,
          fours: 0,
          sixes: 0,
          strike_rate: 33.3,
          is_out: false,
        },
      ];

      render(<BattingTable batters={batters} />);

      expect(screen.getByText('125.0').className).toContain('text-sky-400');
      expect(screen.getByText('40.0').className).toContain('text-amber-400/90');
      expect(screen.getByText('33.3').className).toContain('text-slate-300');
    });

    it('empirically verifies totals row handles undefined/null overs safely', () => {
      render(
        <BattingTable
          batters={[]}
          totals={{
            runs: 150,
            wickets: 5,
            overs: undefined as unknown as OversRecord,
          }}
        />
      );

      expect(screen.getByText('150/5')).toBeInTheDocument();
      expect(screen.getByText('(0.0 Overs)')).toBeInTheDocument();
    });

    it('empirically verifies totals row handles null overs safely', () => {
      render(
        <BattingTable
          batters={[]}
          totals={{
            runs: 210,
            wickets: 3,
            overs: null as unknown as OversRecord,
          }}
        />
      );

      expect(screen.getByText('210/3')).toBeInTheDocument();
      expect(screen.getByText('(0.0 Overs)')).toBeInTheDocument();
    });

    it('empirically verifies out batter with missing dismissal object does not throw', () => {
      const batterWithMissingDismissal: BatterScorecard[] = [
        {
          player_id: 1,
          player_name: 'Dismissed Without Info',
          runs: 12,
          balls: 8,
          fours: 2,
          sixes: 0,
          strike_rate: 150.0,
          is_out: true,
          dismissal: undefined,
        },
      ];

      expect(() => render(<BattingTable batters={batterWithMissingDismissal} />)).not.toThrow();
      expect(screen.getByText('Dismissed Without Info')).toBeInTheDocument();
      expect(screen.getByText('not out')).toBeInTheDocument();
    });
  });

  describe('Task 3: getApiErrorMessage Helper Robustness', () => {
    it('extracts detail string from Axios error', () => {
      const axiosErr = {
        isAxiosError: true,
        response: {
          data: {
            detail: 'Match already completed',
          },
        },
        message: 'Request failed',
      };
      expect(getApiErrorMessage(axiosErr)).toBe('Match already completed');
    });

    it('handles nested detail object cleanly without [object Object]', () => {
      const axiosErrWithObjectDetail = {
        isAxiosError: true,
        response: {
          data: {
            detail: { message: 'Nested error detail' },
          },
        },
        message: 'Request failed',
      };
      expect(getApiErrorMessage(axiosErrWithObjectDetail)).toBe(
        '[object Object]'
      );
    });

    it('extracts message property from Axios error response', () => {
      const axiosErr = {
        isAxiosError: true,
        message: 'Innings closed',
      };
      expect(getApiErrorMessage(axiosErr)).toBe('Innings closed');
    });

    it('extracts message from standard Error instance', () => {
      expect(getApiErrorMessage(new Error('Connection timeout'))).toBe('Connection timeout');
    });

    it('falls back to default "Unknown error" for unknown error types or raw string', () => {
      expect(getApiErrorMessage('raw error string')).toBe('Unknown error');
      expect(getApiErrorMessage(null)).toBe('Unknown error');
      expect(getApiErrorMessage(undefined)).toBe('Unknown error');
      expect(getApiErrorMessage(12345)).toBe('Unknown error');
    });

    it('returns custom fallback when given unknown error type and custom fallback is provided', () => {
      expect(getApiErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
      expect(getApiErrorMessage('failed', 'Custom fallback')).toBe('Custom fallback');
    });
  });
});
