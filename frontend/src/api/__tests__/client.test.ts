import axios from 'axios';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, cricketApi, getApiErrorMessage, getAccessToken, setAccessToken } from '../client';

describe('API Client Environment & Configuration', () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setAccessToken(null);
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    localStorage.clear();
    setAccessToken(null);
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

  it('verifies abandonMatch endpoint', async () => {
    const mockMatch = { id: 1, status: 'abandoned' };
    const spy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: mockMatch });

    const result = await cricketApi.abandonMatch(1);
    expect(spy).toHaveBeenCalledWith('/matches/1/abandon');
    expect(result).toEqual(mockMatch);
  });

  it('verifies patchLastDelivery endpoint', async () => {
    const mockDelivery = { id: 5, runs: 4, is_wicket: false };
    const spy = vi.spyOn(api, 'patch').mockResolvedValueOnce({ data: mockDelivery });

    const result = await cricketApi.patchLastDelivery(1, 1, { runs: 4 });
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/deliveries/last', { runs: 4 });
    expect(result).toEqual(mockDelivery);
  });

  it('verifies swapStrike, setBowler, setIncomingBatter, and startInnings return InningsResponse', async () => {
    const mockInnings = { id: 1, match_id: 1, innings_number: 1, status: 'in_progress' };
    const spy = vi.spyOn(api, 'post').mockResolvedValue({ data: mockInnings });

    const res1 = await cricketApi.swapStrike(1, 1);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/swap-strike');
    expect(res1).toEqual(mockInnings);

    const res2 = await cricketApi.setBowler(1, 1, 42);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/set-bowler', { bowler_id: 42 });
    expect(res2).toEqual(mockInnings);

    const res3 = await cricketApi.setIncomingBatter(1, 1, 99);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/set-incoming-batter', { player_id: 99 });
    expect(res3).toEqual(mockInnings);

    const res4 = await cricketApi.startInnings(1, 1, 10, 11, 12);
    expect(spy).toHaveBeenCalledWith('/matches/1/innings/1/start', {
      striker_id: 10,
      non_striker_id: 11,
      bowler_id: 12,
    });
    expect(res4).toEqual(mockInnings);
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

  it('coalesces multiple concurrent 401 errors into a single refresh request', async () => {
    localStorage.setItem('cricbuzz_refresh_token', 'initial-refresh-token');
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        access_token: 'new-access-token-999',
        refresh_token: 'rotated-refresh-token-000',
        token_type: 'bearer',
        expires_in: 900,
      },
    });

    let callCount = 0;
    api.defaults.adapter = async (config) => {
      callCount++;
      const authHeader = config.headers?.Authorization;
      if (!authHeader || !String(authHeader).includes('new-access-token-999')) {
        const error = new axios.AxiosError('Unauthorized', '401', config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: { detail: 'Token expired' },
        });
        return Promise.reject(error);
      }
      return {
        data: { success: true, count: callCount },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const [res1, res2, res3] = await Promise.all([
      api.get('/matches/'),
      api.get('/matches/1/scorecard'),
      api.get('/auth/me'),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refresh_token: 'initial-refresh-token' }
    );
    expect(localStorage.getItem('cricbuzz_refresh_token')).toBe('rotated-refresh-token-000');
    expect(getAccessToken()).toBe('new-access-token-999');
    expect(res1.data.success).toBe(true);
    expect(res2.data.success).toBe(true);
    expect(res3.data.success).toBe(true);
  });

  it('clears session and rejects all concurrent requests when refresh fails', async () => {
    localStorage.setItem('cricbuzz_refresh_token', 'expired-refresh-token');
    const postSpy = vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Invalid refresh token'));

    api.defaults.adapter = async (config) => {
      const error = new axios.AxiosError('Unauthorized', '401', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { detail: 'Token expired' },
      });
      return Promise.reject(error);
    };

    const results = await Promise.allSettled([
      api.get('/matches/'),
      api.get('/matches/1/scorecard'),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    expect(localStorage.getItem('cricbuzz_refresh_token')).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('does not attempt token refresh when /auth/refresh returns 401', async () => {
    localStorage.setItem('cricbuzz_refresh_token', 'bad-refresh-token');
    const postSpy = vi.spyOn(axios, 'post');

    api.defaults.adapter = async (config) => {
      const error = new axios.AxiosError('Unauthorized', '401', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { detail: 'Invalid refresh token' },
      });
      return Promise.reject(error);
    };

    await expect(api.post('/auth/refresh', { refresh_token: 'bad-refresh-token' })).rejects.toThrow();
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('rejects 401 immediately without refresh when no refresh token in localStorage', async () => {
    localStorage.clear();
    const postSpy = vi.spyOn(axios, 'post');

    api.defaults.adapter = async (config) => {
      const error = new axios.AxiosError('Unauthorized', '401', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { detail: 'No auth' },
      });
      return Promise.reject(error);
    };

    await expect(api.get('/auth/me')).rejects.toThrow();
    expect(postSpy).not.toHaveBeenCalled();
  });
});
