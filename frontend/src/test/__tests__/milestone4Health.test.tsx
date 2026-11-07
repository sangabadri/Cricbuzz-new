import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchCenter } from '../../pages/MatchCenter';
import { ScorerConsole } from '../../pages/ScorerConsole';
import { SetupWizard } from '../../pages/SetupWizard';
import { CreaseTab } from '../../components/match/CreaseTab';
import { BattingTable } from '../../components/match/BattingTable';
import { ToastProvider } from '../../components/common/Toast';
import { cricketApi } from '../../api/client';
import type { LiveMatchResponse, OversRecord } from '../../types/cricket';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('Milestone 4 Codebase Health & Resilience Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('MatchCenter Retryable Error State', () => {
    it('renders retryable error UI instead of false "Match not found" when liveTicker fails', async () => {
      vi.spyOn(cricketApi, 'getLiveTicker').mockRejectedValue(new Error('Network error 500'));
      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue({
        match_id: 42,
        status: 'live',
        format: 't20',
        venue: 'Eden Gardens',
        match_date: '2026-11-03T00:00:00Z',
        team_a_id: 1,
        team_a_name: 'Team A',
        team_b_id: 2,
        team_b_name: 'Team B',
        innings: [],
      });

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/matches/42']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Loading state disappears, then error state appears
      expect(await screen.findByText('Failed to load match data')).toBeInTheDocument();
      expect(screen.getByText('Retry Connection')).toBeInTheDocument();
      expect(screen.getByText('Return to Matches')).toBeInTheDocument();
      expect(screen.queryByText('Match not found.')).not.toBeInTheDocument();
    });

    it('triggers refetch when Retry Connection is clicked in MatchCenter', async () => {
      const tickerSpy = vi.spyOn(cricketApi, 'getLiveTicker').mockRejectedValue(new Error('503 Service Unavailable'));
      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue({
        match_id: 42,
        status: 'live',
        format: 't20',
        venue: 'Eden Gardens',
        match_date: '2026-11-03T00:00:00Z',
        team_a_id: 1,
        team_a_name: 'Team A',
        team_b_id: 2,
        team_b_name: 'Team B',
        innings: [],
      });

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/matches/42']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      const retryBtn = await screen.findByText('Retry Connection');
      fireEvent.click(retryBtn);

      expect(tickerSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('ScorerConsole Initial Load Error State', () => {
    it('renders retryable error UI when getScorerState fails on initial load', async () => {
      vi.spyOn(cricketApi, 'getMatch').mockResolvedValue({
        id: 99,
        team_a: 1,
        team_b: 2,
        venue: 'Wankhede',
        format: 't20',
        match_date: '2026-11-03',
        status: 'live',
      });
      vi.spyOn(cricketApi, 'getScorerState').mockRejectedValue(new Error('Match engine unreachable'));

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/matches/99/score']}>
              <Routes>
                <Route path="/matches/:id/score" element={<ScorerConsole />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(await screen.findByText('Failed to load scorer state')).toBeInTheDocument();
      expect(screen.getByText('Retry Scorer Connection')).toBeInTheDocument();
      expect(screen.getByText('Match Center')).toBeInTheDocument();
      expect(screen.getByText('Fixtures')).toBeInTheDocument();
    });
  });

  describe('SetupWizard Query Error Warning Banner', () => {
    it('displays inline warning banner when teams or players query fails', async () => {
      vi.spyOn(cricketApi, 'getTeams').mockRejectedValue(new Error('Failed to fetch teams'));
      vi.spyOn(cricketApi, 'getPlayers').mockResolvedValue([]);

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

      expect(await screen.findByText(/Failed to load teams from server/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  describe('CreaseTab and BattingTable Safeguards', () => {
    it('CreaseTab safely handles bowler with missing overs object without runtime TypeError', () => {
      const mockTicker: LiveMatchResponse = {
        match_id: 1,
        status: 'live',
        format: 't20',
        venue: 'Melbourne',
        team_a_name: 'India',
        team_b_name: 'Australia',
        current_innings_number: 1,
        batting_team_name: 'India',
        bowling_team_name: 'Australia',
        runs: 50,
        wickets: 1,
        overs: { completed_overs: 5, balls: 0, total_legal_balls: 30 },
        current_run_rate: 10.0,
        striker: { player_id: 1, name: 'Striker', runs: 20, balls: 10, fours: 2, sixes: 1, strike_rate: 200.0 },
        non_striker: { player_id: 2, name: 'NonStriker', runs: 10, balls: 5, fours: 1, sixes: 0, strike_rate: 200.0 },
        current_bowler: {
          player_id: 3,
          name: 'Pat Cummins',
          overs: undefined as unknown as OversRecord,
          maidens: 0,
          runs: 15,
          wickets: 1,
          economy: 7.5,
        },
        current_over_balls: [],
        last_event_is_wicket: false,
      };

      expect(() => render(<CreaseTab ticker={mockTicker} />)).not.toThrow();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('BattingTable renders computed strike rate 0.0 when strike_rate is undefined', () => {
      render(
        <BattingTable
          batters={[
            {
              player_id: 1,
              player_name: 'Rohit Sharma',
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              strike_rate: undefined,
              is_out: false,
            },
          ]}
        />
      );

      expect(screen.getByText('0.0')).toBeInTheDocument();
    });
  });
});
