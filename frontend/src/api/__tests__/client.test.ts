import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, cricketApi, getApiErrorMessage } from '../client';

describe('API Client Environment & Configuration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('configures default baseURL to /api/v1 when VITE_API_URL is unset', () => {
    expect(api.defaults.baseURL).toBe('/api/v1');
  });

  it('configures default headers with application/json', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('dynamically respects VITE_API_URL override when defined', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://production-cricbuzz.internal/api/v1');

    const freshModule = await import('../client');
    expect(freshModule.api.defaults.baseURL).toBe('https://production-cricbuzz.internal/api/v1');
  });

  it('falls back to /api/v1 when VITE_API_URL is empty string', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', '');

    const freshModule = await import('../client');
    expect(freshModule.api.defaults.baseURL).toBe('/api/v1');
  });

  it('verifies cricketApi.getMatches calls expected endpoint and params', async () => {
    const mockMatches = [{ id: 1, venue: 'Wankhede', format: 't20', status: 'live' }];
    const spy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockMatches });

    const result = await cricketApi.getMatches({ status: 'live', limit: 10 });

    expect(spy).toHaveBeenCalledWith('/matches/', {
      params: { status: 'live', limit: 10 },
    });
    expect(result).toEqual(mockMatches);
  });

  it('verifies cricketApi.getScorecard calls /matches/:id/scorecard', async () => {
    const mockScorecard = { match_id: 42, innings: [] };
    const spy = vi.spyOn(api, 'get').mockResolvedValueOnce({ data: mockScorecard });

    const result = await cricketApi.getScorecard(42);

    expect(spy).toHaveBeenCalledWith('/matches/42/scorecard');
    expect(result).toEqual(mockScorecard);
  });

  it('verifies cricketApi.recordDelivery posts payload to innings delivery endpoint', async () => {
    const payload = {
      striker_id: 1,
      non_striker_id: 2,
      bowler_id: 3,
      runs_batter: 4,
      is_wide: false,
      is_no_ball: false,
      is_bye: false,
      is_leg_bye: false,
      is_wicket: false,
    };
    const mockResponse = { current_score: '10/0' };
    const spy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockResponse });

    const result = await cricketApi.recordDelivery(10, 1, payload);

    expect(spy).toHaveBeenCalledWith('/matches/10/innings/1/deliveries', payload);
    expect(result).toEqual(mockResponse);
  });

  it('verifies cricketApi.createMatch posts MatchCreateRequest payload', async () => {
    const data = {
      team_a: 1,
      team_b: 2,
      venue: 'Eden Gardens',
      format: 't20',
      match_date: '2026-11-03T00:00:00Z',
    };
    const mockMatch = { id: 7, ...data, status: 'scheduled' };
    const spy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockMatch });

    const result = await cricketApi.createMatch(data);

    expect(spy).toHaveBeenCalledWith('/matches/', data);
    expect(result).toEqual(mockMatch);
  });

  it('verifies swapStrike, setBowler, setIncomingBatter, and startInnings endpoints', async () => {
    const mockState = { match_id: 1, innings_number: 1, next_action: 'NEXT_BALL' };
    const spy = vi.spyOn(api, 'post').mockResolvedValue({ data: mockState });

    const res1 = await cricketApi.swapStrike(1, 1);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/swap-strike');
    expect(res1).toEqual(mockState);

    const res2 = await cricketApi.setBowler(1, 1, 42);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/set-bowler', { bowler_id: 42 });
    expect(res2).toEqual(mockState);

    const res3 = await cricketApi.setIncomingBatter(1, 1, 99);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/set-incoming-batter', { player_id: 99 });
    expect(res3).toEqual(mockState);

    const res4 = await cricketApi.startInnings(1, 1, 10, 11, 12);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/start', {
      striker_id: 10,
      non_striker_id: 11,
      bowler_id: 12,
    });
    expect(res4).toEqual(mockState);
  });

  it('verifies getApiErrorMessage handles Axios errors, Error instances, and fallbacks', () => {
    // Standard Error
    expect(getApiErrorMessage(new Error('Network disconnected'))).toBe('Network disconnected');

    // Axios error with detail
    const axiosErrWithDetail = {
      isAxiosError: true,
      response: { data: { detail: 'Toss already completed' } },
      message: 'Request failed with 400',
    };
    expect(getApiErrorMessage(axiosErrWithDetail)).toBe('Toss already completed');

    // Axios error with message only
    const axiosErrWithMessage = {
      isAxiosError: true,
      message: 'Network Error',
    };
    expect(getApiErrorMessage(axiosErrWithMessage)).toBe('Network Error');

    // Unknown string or object fallback
    expect(getApiErrorMessage('raw string failure')).toBe('Unknown error');
    expect(getApiErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });
});
