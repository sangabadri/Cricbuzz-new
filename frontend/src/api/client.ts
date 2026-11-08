import axios from 'axios';
import type {
  DeliveryCreate,
  DeliveryResponse,
  InningsResponse,
  InningsScorecard,
  LiveMatchResponse,
  LiveScorerStateResponse,
  ManualDeliveryUpdate,
  Match,
  MatchCreateRequest,
  MatchResponse,
  MatchScorecardResponse,
  Player,
  SeedResponse,
  SquadResponse,
  Team,
} from '../types/cricket';

// Using relative /api prefix which is proxied by Vite in dev and routes to backend in prod
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getApiErrorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    if (detail) return String(detail);
    if (err.message) return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

export const cricketApi = {
  // Matches
  getMatches: async (params?: { status?: string; team_id?: number; limit?: number; offset?: number }): Promise<Match[]> => {
    const res = await api.get<Match[]>('/matches/', { params });
    return res.data;
  },

  getMatch: async (matchId: number): Promise<Match> => {
    const res = await api.get<Match>(`/matches/${matchId}`);
    return res.data;
  },

  createMatch: async (data: MatchCreateRequest): Promise<Match> => {
    const res = await api.post<Match>('/matches/', data);
    return res.data;
  },

  conductToss: async (matchId: number, tossWinner: number, tossDecision: 'bat' | 'bowl'): Promise<Match> => {
    const res = await api.post<Match>(`/matches/${matchId}/toss`, {
      toss_winner: tossWinner,
      toss_decision: tossDecision,
    });
    return res.data;
  },

  awardMOM: async (matchId: number, playerId: number): Promise<Match> => {
    const res = await api.post<Match>(`/matches/${matchId}/mom`, { player_id: playerId });
    return res.data;
  },

  abandonMatch: async (matchId: number): Promise<MatchResponse> => {
    const res = await api.post<MatchResponse>(`/matches/${matchId}/abandon`);
    return res.data;
  },

  // Scorecards & Live Match
  getLiveTicker: async (matchId: number): Promise<LiveMatchResponse> => {
    const res = await api.get<LiveMatchResponse>(`/matches/${matchId}/live`);
    return res.data;
  },

  getScorecard: async (matchId: number): Promise<MatchScorecardResponse> => {
    const res = await api.get<MatchScorecardResponse>(`/matches/${matchId}/scorecard`);
    return res.data;
  },

  getInningsScorecard: async (matchId: number, inningsNumber: number): Promise<InningsScorecard> => {
    const res = await api.get<InningsScorecard>(`/matches/${matchId}/innings/${inningsNumber}/scorecard`);
    return res.data;
  },

  // Scorer Console Operations
  getScorerState: async (matchId: number, inningsNumber: number): Promise<LiveScorerStateResponse> => {
    const res = await api.get<LiveScorerStateResponse>(`/matches/${matchId}/innings/${inningsNumber}/scorer-state`);
    return res.data;
  },

  recordDelivery: async (
    matchId: number,
    inningsNumber: number,
    data: DeliveryCreate
  ): Promise<LiveScorerStateResponse> => {
    const res = await api.post<LiveScorerStateResponse>(
      `/matches/${matchId}/innings/${inningsNumber}/deliveries`,
      data
    );
    return res.data;
  },

  undoLastDelivery: async (matchId: number, inningsNumber: number): Promise<DeliveryResponse> => {
    const res = await api.delete<DeliveryResponse>(
      `/matches/${matchId}/innings/${inningsNumber}/deliveries/last`
    );
    return res.data;
  },

  patchLastDelivery: async (
    matchId: number,
    inningsNumber: number,
    data: ManualDeliveryUpdate
  ): Promise<DeliveryResponse> => {
    const res = await api.patch<DeliveryResponse>(
      `/matches/${matchId}/innings/${inningsNumber}/deliveries/last`,
      data
    );
    return res.data;
  },

  swapStrike: async (matchId: number, inningsNumber: number): Promise<InningsResponse> => {
    const res = await api.post<InningsResponse>(`/matches/${matchId}/innings/${inningsNumber}/swap-strike`);
    return res.data;
  },

  setBowler: async (matchId: number, inningsNumber: number, bowlerId: number): Promise<InningsResponse> => {
    const res = await api.post<InningsResponse>(`/matches/${matchId}/innings/${inningsNumber}/set-bowler`, {
      bowler_id: bowlerId,
    });
    return res.data;
  },

  setIncomingBatter: async (matchId: number, inningsNumber: number, playerId: number): Promise<InningsResponse> => {
    const res = await api.post<InningsResponse>(`/matches/${matchId}/innings/${inningsNumber}/set-incoming-batter`, {
      player_id: playerId,
    });
    return res.data;
  },

  startInnings: async (
    matchId: number,
    inningsNumber: number,
    strikerId: number,
    nonStrikerId: number,
    bowlerId: number
  ): Promise<InningsResponse> => {
    const res = await api.post<InningsResponse>(`/matches/${matchId}/innings/${inningsNumber}/start`, {
      striker_id: strikerId,
      non_striker_id: nonStrikerId,
      bowler_id: bowlerId,
    });
    return res.data;
  },

  getDeliveries: async (matchId: number, inningsNumber: number): Promise<DeliveryResponse[]> => {
    const res = await api.get<DeliveryResponse[]>(`/matches/${matchId}/innings/${inningsNumber}/deliveries`);
    return res.data;
  },

  // Squads
  getSquad: async (matchId: number, teamId: number): Promise<SquadResponse> => {
    const res = await api.get<SquadResponse>(`/matches/${matchId}/squad/${teamId}`);
    return res.data;
  },

  submitSquad: async (
    matchId: number,
    data: {
      team_id: number;
      captain_id: number;
      wicket_keeper_id: number;
      players: { player_id: number; is_playing_xi: boolean }[];
    }
  ): Promise<SquadResponse> => {
    const res = await api.post<SquadResponse>(`/matches/${matchId}/squad`, data);
    return res.data;
  },

  // Teams & Players
  getTeams: async (): Promise<Team[]> => {
    const res = await api.get<Team[]>('/teams/');
    return res.data;
  },

  createTeam: async (name: string): Promise<Team> => {
    const res = await api.post<Team>('/teams/', { name });
    return res.data;
  },

  getPlayers: async (search?: string): Promise<Player[]> => {
    const res = await api.get<Player[]>('/players/', { params: { search, limit: 100 } });
    return res.data;
  },

  createPlayer: async (data: {
    name: string;
    role: string;
    batting?: string;
    bowling?: string;
  }): Promise<Player> => {
    const res = await api.post<Player>('/players/', data);
    return res.data;
  },

  // 1-Click Demo Seed
  seedDemoMatch: async (): Promise<SeedResponse> => {
    const res = await api.post<SeedResponse>('/seed/demo-match');
    return res.data;
  },
};
