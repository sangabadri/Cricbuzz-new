export type MatchFormat = 't20' | 'odi';

export type MatchStatus =
  | 'scheduled'
  | 'toss_done'
  | 'live'
  | 'innings_break'
  | 'completed'
  | 'abandoned';

export type InningsStatus = 'not_started' | 'in_progress' | 'completed';

export type TossDecision = 'bat' | 'bowl';

export type Role = 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper';

export type ExtraType = 'wide' | 'noball' | 'bye' | 'leg-bye';

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket';

export interface Team {
  id: number;
  name: string;
}

export interface Player {
  id: number;
  name: string;
  role: Role;
  batting?: string;
  bowling?: string;
}

export interface Match {
  id: number;
  team_a: number;
  team_b: number;
  team_a_name?: string;
  team_b_name?: string;
  venue: string;
  format: MatchFormat;
  match_date: string;
  status: MatchStatus;
  toss_winner?: number;
  toss_decision?: TossDecision;
  winner?: number;
  win_margin_runs?: number;
  win_margin_wickets?: number;
  mom?: number;
}

export interface MatchCreateRequest {
  team_a: number;
  team_b: number;
  venue: string;
  format: MatchFormat | string;
  match_date: string;
}

export interface OversRecord {
  completed_overs: number;
  balls: number;
  total_legal_balls: number;
}

export interface DismissalInfo {
  wicket_type: WicketType;
  bowler_id: number;
  bowler_name: string;
  fielder_id?: number | null;
  fielder_name?: string | null;
}

export interface BatterScorecard {
  player_id: number;
  player_name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate?: number | null;
  is_out: boolean;
  dismissal?: DismissalInfo | null;
}

export interface BowlerScorecard {
  player_id: number;
  player_name: string;
  overs: OversRecord;
  maidens: number;
  runs: number;
  wickets: number;
  economy?: number | null;
  wides: number;
  no_balls: number;
}

export interface FallOfWicket {
  wicket_number: number;
  player_id: number;
  player_name: string;
  score: number;
  overs: OversRecord;
}

export interface PartnershipBatter {
  player_id: number;
  player_name: string;
  runs: number;
  balls?: number;
}

export interface Partnership {
  wicket_number?: number;
  runs?: number;
  total_runs?: number;
  balls: number;
  overs?: OversRecord;
  batters?: PartnershipBatter[];
  batter_1?: PartnershipBatter | null;
  batter_2?: PartnershipBatter | null;
}

export interface ExtrasBreakdown {
  wides: number;
  no_balls: number;
  byes: number;
  leg_byes: number;
  penalty: number;
  total: number;
}

export interface InningsScorecard {
  innings_number: number;
  batting_team_id: number;
  batting_team_name: string;
  bowling_team_id: number;
  bowling_team_name: string;
  status: InningsStatus;
  runs: number;
  wickets: number;
  overs: OversRecord;
  batters: BatterScorecard[];
  bowlers: BowlerScorecard[];
  batting?: BatterScorecard[];
  bowling?: BowlerScorecard[];
  fall_of_wickets: FallOfWicket[];
  partnerships: Partnership[];
  extras: ExtrasBreakdown;
}

export interface MatchScorecardResponse {
  match_id: number;
  format: MatchFormat;
  status: MatchStatus;
  venue: string;
  match_date: string;
  team_a_id: number;
  team_a_name: string;
  team_b_id: number;
  team_b_name: string;
  toss_winner_id?: number | null;
  toss_winner_name?: string | null;
  toss_decision?: TossDecision | null;
  winner_id?: number | null;
  winner_name?: string | null;
  mom_id?: number | null;
  mom_name?: string | null;
  innings: InningsScorecard[];
}

export interface LiveCurrentOverBall {
  ball_number: number;
  runs: number;
  extra_type?: ExtraType | null;
  extras: number;
  is_wicket: boolean;
  wicket_type?: WicketType | null;
}

export interface LiveBatter {
  player_id: number;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate?: number | null;
}

export interface LiveBowler {
  player_id: number;
  name: string;
  overs: OversRecord;
  maidens: number;
  runs: number;
  wickets: number;
  economy?: number | null;
}

export interface LiveMatchResponse {
  match_id: number;
  status: MatchStatus;
  format: MatchFormat;
  venue: string;
  team_a_name: string;
  team_b_name: string;
  current_innings_number?: number;
  batting_team_name?: string;
  bowling_team_name?: string;
  runs: number;
  wickets: number;
  overs: OversRecord;
  current_run_rate: number;
  target?: number | null;
  runs_needed?: number | null;
  balls_remaining?: number | null;
  required_run_rate?: number | null;
  striker?: LiveBatter | null;
  non_striker?: LiveBatter | null;
  current_bowler?: LiveBowler | null;
  current_over_balls: LiveCurrentOverBall[];
  last_event_runs?: number | null;
  last_event_is_wicket: boolean;
}

export interface LiveScorerStateResponse {
  match_id: number;
  innings_number: number;
  match_status: MatchStatus;
  innings_status: InningsStatus;
  total_runs: number;
  total_wickets: number;
  current_over: number;
  balls_in_over: number;
  overs_display: string;
  legal_balls: number;
  current_run_rate: number;
  target?: number | null;
  runs_needed?: number | null;
  balls_remaining?: number | null;
  required_run_rate?: number | null;
  striker_id?: number | null;
  striker_name?: string | null;
  striker_runs: number;
  striker_balls: number;
  non_striker_id?: number | null;
  non_striker_name?: string | null;
  non_striker_runs: number;
  non_striker_balls: number;
  current_bowler_id?: number | null;
  current_bowler_name?: string | null;
  current_bowler_overs: string;
  current_bowler_runs: number;
  current_bowler_wickets: number;
  over_completed?: boolean;
  current_over_balls: string[];
  next_action:
    | 'NEXT_BALL'
    | 'START_INNINGS'
    | 'SET_BOWLER'
    | 'SET_BATTER'
    | 'INNINGS_BREAK'
    | 'MATCH_COMPLETED';
  eligible_bowler_ids?: number[];
  match_winner?: number | null;
  win_margin_runs?: number | null;
  win_margin_wickets?: number | null;
  error_context?: string | null;
}

export interface DeliveryCreate {
  runs?: number;
  extra_type?: ExtraType | null;
  extras?: number;
  is_wicket?: boolean;
  wicket_type?: WicketType | null;
  player_out_id?: number | null;
  fielder_id?: number | null;
  commentary?: string | null;
}

export interface DeliveryResponse {
  id: number;
  innings_id: number;
  over: number;
  ball: number;
  bowler_id: number;
  batsman_id: number;
  non_striker_id: number;
  runs: number;
  extra_type?: ExtraType | null;
  extras: number;
  wicket_type?: WicketType | null;
  player_out_id?: number | null;
  fielder_id?: number | null;
  commentary?: string | null;
  bowler_name?: string | null;
  batsman_name?: string | null;
}

export interface SquadPlayerItem {
  player_id: number;
  is_playing_xi: boolean;
  player_name?: string | null;
  role?: string | null;
}

export interface SquadResponse {
  id: number;
  match_id: number;
  team_id: number;
  captain_id: number;
  wicket_keeper_id: number;
  players: SquadPlayerItem[];
}

export interface SeedResponse {
  message: string;
  match_id: number;
  team_a_id: number;
  team_a_name: string;
  team_b_id: number;
  team_b_name: string;
  innings_number: number;
}
