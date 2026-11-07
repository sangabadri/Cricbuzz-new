import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getApiErrorMessage, cricketApi } from '../../api/client';
import { MatchCenter } from '../../pages/MatchCenter';
import { ScorerConsole } from '../../pages/ScorerConsole';
import { ToastProvider } from '../../components/common/Toast';
import type { LiveMatchResponse, LiveScorerStateResponse } from '../../types/cricket';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

const mockLiveTicker: LiveMatchResponse = {
  match_id: 101,
  status: 'live',
  format: 't20',
  venue: 'Eden Gardens',
  team_a_name: 'Kolkata',
  team_b_name: 'Mumbai',
  current_innings_number: 1,
  batting_team_name: 'Kolkata',
  bowling_team_name: 'Mumbai',
  runs: 120,
  wickets: 3,
  overs: { completed_overs: 12, balls: 4, total_legal_balls: 76 },
  current_run_rate: 9.47,
  striker: { player_id: 1, name: 'Batter 1', runs: 45, balls: 28, fours: 4, sixes: 2, strike_rate: 160.7 },
  non_striker: { player_id: 2, name: 'Batter 2', runs: 20, balls: 14, fours: 2, sixes: 0, strike_rate: 142.9 },
  current_bowler: {
    player_id: 3,
    name: 'Bowler 1',
    overs: { completed_overs: 2, balls: 4, total_legal_balls: 16 },
    maidens: 0,
    runs: 22,
    wickets: 1,
    economy: 8.25,
  },
  current_over_balls: [],
  last_event_is_wicket: false,
};

const mockScorerState: LiveScorerStateResponse = {
  match_id: 202,
  innings_number: 1,
  match_status: 'live',
  innings_status: 'in_progress',
  total_runs: 85,
  total_wickets: 2,
  current_over: 9,
  balls_in_over: 2,
  overs_display: '9.2',
  legal_balls: 56,
  current_run_rate: 9.1,
  striker_id: 10,
  striker_name: 'Striker A',
  striker_runs: 30,
  striker_balls: 20,
  non_striker_id: 11,
  non_striker_name: 'NonStriker B',
  non_striker_runs: 15,
  non_striker_balls: 12,
  current_bowler_id: 12,
  current_bowler_name: 'Bowler C',
  current_bowler_overs: '3.2',
  current_bowler_runs: 25,
  current_bowler_wickets: 1,
  current_over_balls: ['1', '0'],
  next_action: 'NEXT_BALL',
};

describe('Milestone 4 Adversarial Challenger Stress Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. getApiErrorMessage Stress Testing with Non-Standard Throwing Entities', () => {
    it('handles null, undefined, and empty primitives gracefully without throwing', () => {
      expect(getApiErrorMessage(null)).toBe('Unknown error');
      expect(getApiErrorMessage(undefined)).toBe('Unknown error');
      expect(getApiErrorMessage(null, 'Custom fallback message')).toBe('Custom fallback message');
      expect(getApiErrorMessage(undefined, 'Fallback for undefined')).toBe('Fallback for undefined');
    });

    it('handles primitive non-error thrown values (string, number, boolean, symbol, bigint)', () => {
      // In JS, users can throw arbitrary primitives: throw "raw string error"
      expect(getApiErrorMessage('Server connection refused')).toBe('Unknown error');
      expect(getApiErrorMessage('Server connection refused', 'Connection Failed')).toBe('Connection Failed');
      expect(getApiErrorMessage(503)).toBe('Unknown error');
      expect(getApiErrorMessage(0)).toBe('Unknown error');
      expect(getApiErrorMessage(NaN)).toBe('Unknown error');
      expect(getApiErrorMessage(false)).toBe('Unknown error');
      expect(getApiErrorMessage(true)).toBe('Unknown error');
      expect(getApiErrorMessage(Symbol('error_symbol'))).toBe('Unknown error');
      expect(getApiErrorMessage(BigInt(9007199254740991))).toBe('Unknown error');
    });

    it('handles circular object structures without triggering circular JSON or recursion faults', () => {
      const circularObj: Record<string, unknown> = {
        name: 'CircularError',
        status: 500,
      };
      circularObj.self = circularObj;
      circularObj.child = { parent: circularObj };

      expect(() => getApiErrorMessage(circularObj)).not.toThrow();
      expect(getApiErrorMessage(circularObj)).toBe('Unknown error');
      expect(getApiErrorMessage(circularObj, 'Handled circular')).toBe('Handled circular');
    });

    it('handles native Error instances and Error subclasses', () => {
      expect(getApiErrorMessage(new Error('Network timeout after 10000ms'))).toBe('Network timeout after 10000ms');
      expect(getApiErrorMessage(new TypeError('Cannot read properties of null'))).toBe('Cannot read properties of null');
      expect(getApiErrorMessage(new RangeError('Maximum call stack size exceeded'))).toBe('Maximum call stack size exceeded');

      // Error with empty message
      expect(getApiErrorMessage(new Error(''))).toBe('');
    });

    it('handles plain dictionary objects mimicking Error or Axios error shapes', () => {
      expect(getApiErrorMessage({ message: 'Plain message' })).toBe('Unknown error');
      expect(getApiErrorMessage({ detail: 'Unauthenticated' })).toBe('Unknown error');
      expect(getApiErrorMessage({})).toBe('Unknown error');
    });

    it('stress tests AxiosError with detailed response payloads', () => {
      // 1. Standard AxiosError with string detail
      const axiosWithDetail = {
        isAxiosError: true,
        response: {
          data: { detail: 'Match has already concluded' },
          status: 400,
        },
        message: 'Request failed with status code 400',
      };
      expect(getApiErrorMessage(axiosWithDetail)).toBe('Match has already concluded');

      // 2. AxiosError with numeric detail
      const axiosWithNumericDetail = {
        isAxiosError: true,
        response: {
          data: { detail: 404 },
        },
        message: 'Request failed',
      };
      expect(getApiErrorMessage(axiosWithNumericDetail)).toBe('404');

      // 3. AxiosError with FastAPI validation array detail [{ loc, msg, type }]
      const axiosWithArrayDetail = {
        isAxiosError: true,
        response: {
          data: {
            detail: [
              { loc: ['body', 'runs_batter'], msg: 'field required', type: 'value_error.missing' },
            ],
          },
        },
        message: 'Unprocessable Entity',
      };
      expect(() => getApiErrorMessage(axiosWithArrayDetail)).not.toThrow();
      expect(getApiErrorMessage(axiosWithArrayDetail)).toBe('[object Object]');

      // 4. AxiosError with empty string detail (should fall through to message)
      const axiosWithEmptyDetail = {
        isAxiosError: true,
        response: {
          data: { detail: '' },
        },
        message: 'Request failed with status 422',
      };
      expect(getApiErrorMessage(axiosWithEmptyDetail)).toBe('Request failed with status 422');

      // 5. AxiosError with null/undefined detail (should fall through to message)
      const axiosWithNullDetail = {
        isAxiosError: true,
        response: {
          data: { detail: null },
        },
        message: 'Fallback message on null detail',
      };
      expect(getApiErrorMessage(axiosWithNullDetail)).toBe('Fallback message on null detail');
    });

    it('stress tests AxiosError without response (network disconnection, DNS failure, timeout)', () => {
      // Network failure (no response object)
      const networkError = {
        isAxiosError: true,
        message: 'Network Error: ERR_CONNECTION_REFUSED',
      };
      expect(getApiErrorMessage(networkError)).toBe('Network Error: ERR_CONNECTION_REFUSED');

      // Timeout failure
      const timeoutError = {
        isAxiosError: true,
        message: 'timeout of 5000ms exceeded',
      };
      expect(getApiErrorMessage(timeoutError)).toBe('timeout of 5000ms exceeded');

      // AxiosError with neither response nor message
      const emptyAxiosError = {
        isAxiosError: true,
      };
      expect(getApiErrorMessage(emptyAxiosError)).toBe('Unknown error');
      expect(getApiErrorMessage(emptyAxiosError, 'Network failed')).toBe('Network failed');
    });

    it('stress tests AxiosError with circular references in response.data', () => {
      const circularData: Record<string, unknown> = {
        detail: 'Circular response detail message',
      };
      circularData.loop = circularData;

      const circularAxiosError = {
        isAxiosError: true,
        response: {
          data: circularData,
        },
        message: 'Axios circular error',
      };

      expect(() => getApiErrorMessage(circularAxiosError)).not.toThrow();
      expect(getApiErrorMessage(circularAxiosError)).toBe('Circular response detail message');
    });

    it('stress tests AxiosError with non-object response.data (HTML error page from gateway/proxy)', () => {
      const html502Error = {
        isAxiosError: true,
        response: {
          data: '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>',
          status: 502,
        },
        message: 'Request failed with status code 502',
      };

      expect(getApiErrorMessage(html502Error)).toBe('Request failed with status code 502');
    });
  });

  describe('2. MatchCenter.tsx Empirical Error State & Recovery Verification', () => {
    it('empirically verifies error card renders on ticker failure and prevents false "Match not found"', async () => {
      vi.spyOn(cricketApi, 'getLiveTicker').mockRejectedValue(new Error('Connection timed out'));
      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue({
        match_id: 101,
        status: 'live',
        format: 't20',
        venue: 'Eden Gardens',
        match_date: '2026-11-03',
        team_a_id: 1,
        team_a_name: 'Kolkata',
        team_b_id: 2,
        team_b_name: 'Mumbai',
        innings: [],
      });

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/matches/101']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify that error card appears with all key elements
      expect(await screen.findByText('Failed to load match data')).toBeInTheDocument();
      expect(
        screen.getByText("We couldn't connect to the match server. Check your connection or retry.")
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Connection/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Return to Matches/i })).toHaveAttribute('href', '/');

      // Crucial empirical check: "Match not found." MUST NOT be displayed
      expect(screen.queryByText('Match not found.')).not.toBeInTheDocument();
    });

    it('empirically verifies retry recovery in MatchCenter when connection restores', async () => {
      // First call fails, second call succeeds
      const tickerSpy = vi.spyOn(cricketApi, 'getLiveTicker')
        .mockRejectedValueOnce(new Error('500 Internal Server Error'))
        .mockResolvedValueOnce(mockLiveTicker);

      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue({
        match_id: 101,
        status: 'live',
        format: 't20',
        venue: 'Eden Gardens',
        match_date: '2026-11-03',
        team_a_id: 1,
        team_a_name: 'Kolkata',
        team_b_id: 2,
        team_b_name: 'Mumbai',
        innings: [],
      });
      vi.spyOn(cricketApi, 'getDeliveries').mockResolvedValue([]);

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/matches/101']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify error state first
      const retryButton = await screen.findByRole('button', { name: /Retry Connection/i });
      expect(screen.getByText('Failed to load match data')).toBeInTheDocument();

      // Click retry
      fireEvent.click(retryButton);

      // Verify recovery: error state unmounts and live match header appears
      await waitFor(() => {
        expect(screen.queryByText('Failed to load match data')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Eden Gardens')).toBeInTheDocument();
      expect(tickerSpy).toHaveBeenCalledTimes(2);
    });

    it('empirically verifies MatchCenter behavior when matchId is NaN (/matches/invalid)', async () => {
      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/matches/invalid-id']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // When matchId is NaN, query is disabled and legitimate "Match not found." is rendered
      expect(await screen.findByText('Match not found.')).toBeInTheDocument();
      expect(screen.queryByText('Failed to load match data')).not.toBeInTheDocument();
    });
  });

  describe('3. ScorerConsole.tsx Empirical Error State & Recovery Verification', () => {
    it('empirically verifies error card renders on getScorerState failure with navigation and retry options', async () => {
      vi.spyOn(cricketApi, 'getMatch').mockResolvedValue({
        id: 202,
        team_a: 10,
        team_b: 20,
        venue: 'Melbourne',
        format: 't20',
        match_date: '2026-11-03',
        status: 'live',
      });
      vi.spyOn(cricketApi, 'getScorerState').mockRejectedValue(new Error('Match engine offline'));

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/matches/202/score']}>
              <Routes>
                <Route path="/matches/:id/score" element={<ScorerConsole />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Verify Scorer error UI
      expect(await screen.findByText('Failed to load scorer state')).toBeInTheDocument();
      expect(
        screen.getByText('Unable to connect to match #202 scorer engine or match does not exist.')
      ).toBeInTheDocument();

      // Verify interactive controls
      expect(screen.getByRole('button', { name: /Retry Scorer Connection/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Match Center/i })).toHaveAttribute('href', '/matches/202');
      expect(screen.getByRole('link', { name: /Fixtures/i })).toHaveAttribute('href', '/');

      // Verify that scorer controls (e.g. runs, wickets buttons) are NOT rendered in broken state
      expect(screen.queryByText('WICKET')).not.toBeInTheDocument();
      expect(screen.queryByText('WIDE')).not.toBeInTheDocument();
    });

    it('empirically verifies retry recovery in ScorerConsole when engine comes back online', async () => {
      vi.spyOn(cricketApi, 'getMatch').mockResolvedValue({
        id: 202,
        team_a: 10,
        team_b: 20,
        venue: 'Melbourne',
        format: 't20',
        match_date: '2026-11-03',
        status: 'live',
        toss_winner: 10,
        toss_decision: 'bat',
      });

      const scorerSpy = vi.spyOn(cricketApi, 'getScorerState')
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce(mockScorerState);

      vi.spyOn(cricketApi, 'getSquad').mockResolvedValue({
        id: 1,
        match_id: 202,
        team_id: 10,
        captain_id: 10,
        wicket_keeper_id: 11,
        players: [
          { player_id: 10, player_name: 'Striker A', role: 'batter', is_playing_xi: true },
          { player_id: 11, player_name: 'NonStriker B', role: 'batter', is_playing_xi: true },
          { player_id: 12, player_name: 'Bowler C', role: 'bowler', is_playing_xi: true },
        ],
      });

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/matches/202/score']}>
              <Routes>
                <Route path="/matches/:id/score" element={<ScorerConsole />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Find retry button
      const retryBtn = await screen.findByRole('button', { name: /Retry Scorer Connection/i });
      expect(screen.getByText('Failed to load scorer state')).toBeInTheDocument();

      // Trigger retry
      fireEvent.click(retryBtn);

      // Verify transition to active scorer console
      await waitFor(() => {
        expect(screen.queryByText('Failed to load scorer state')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Striker A')).toBeInTheDocument();
      expect(screen.getByText('NonStriker B')).toBeInTheDocument();
      expect(scorerSpy).toHaveBeenCalledTimes(2);
    });

    it('empirically verifies ScorerConsole persists error state stably across repeated retry clicks', async () => {
      vi.spyOn(cricketApi, 'getMatch').mockResolvedValue({
        id: 202,
        team_a: 10,
        team_b: 20,
        venue: 'Melbourne',
        format: 't20',
        match_date: '2026-11-03',
        status: 'live',
      });

      const scorerSpy = vi.spyOn(cricketApi, 'getScorerState')
        .mockRejectedValue(new Error('Persistent 500 Network failure'));

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/matches/202/score']}>
              <Routes>
                <Route path="/matches/:id/score" element={<ScorerConsole />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      const retryBtn = await screen.findByRole('button', { name: /Retry Scorer Connection/i });
      expect(screen.getByText('Failed to load scorer state')).toBeInTheDocument();

      // TanStack Query deduplicates concurrent in-flight refetch calls.
      // Sequential retries after in-flight completion:
      fireEvent.click(retryBtn);
      await waitFor(() => expect(scorerSpy).toHaveBeenCalledTimes(2));

      fireEvent.click(retryBtn);
      await waitFor(() => expect(scorerSpy).toHaveBeenCalledTimes(3));

      // Verify it remains stable in error state without throwing
      expect(screen.getByText('Failed to load scorer state')).toBeInTheDocument();
    });
  });

  describe('4. Partial Failure & Fallback Resilience in MatchCenter', () => {
    it('survives scorecard query failure when liveTicker succeeds (partial service degradation)', async () => {
      vi.spyOn(cricketApi, 'getLiveTicker').mockResolvedValue(mockLiveTicker);
      vi.spyOn(cricketApi, 'getScorecard').mockRejectedValue(new Error('Scorecard database timeout'));
      vi.spyOn(cricketApi, 'getDeliveries').mockResolvedValue([]);

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/matches/101']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify that live ticker elements render successfully
      expect(await screen.findByText('Eden Gardens')).toBeInTheDocument();
      expect(screen.getByText('Batter 1')).toBeInTheDocument();
      // Verify that the ticker error card is NOT triggered
      expect(screen.queryByText('Failed to load match data')).not.toBeInTheDocument();
    });

    it('survives repeated retry clicks in MatchCenter when ticker network error persists', async () => {
      const tickerSpy = vi.spyOn(cricketApi, 'getLiveTicker')
        .mockRejectedValue(new Error('Continuous Network Timeout'));

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/matches/101']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      const retryBtn = await screen.findByRole('button', { name: /Retry Connection/i });
      expect(screen.getByText('Failed to load match data')).toBeInTheDocument();

      // Sequential retries after in-flight query settles
      fireEvent.click(retryBtn);
      await waitFor(() => expect(tickerSpy).toHaveBeenCalledTimes(2));

      fireEvent.click(retryBtn);
      await waitFor(() => expect(tickerSpy).toHaveBeenCalledTimes(3));

      expect(screen.getByText('Failed to load match data')).toBeInTheDocument();
    });
  });
});

