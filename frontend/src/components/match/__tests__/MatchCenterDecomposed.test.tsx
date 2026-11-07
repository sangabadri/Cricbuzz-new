import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type {
  DeliveryResponse,
  LiveMatchResponse,
  MatchScorecardResponse,
  SquadResponse,
} from '../../../types/cricket';
import { MatchCenterHero } from '../MatchCenterHero';
import { CreaseTab } from '../CreaseTab';
import { ScorecardTab } from '../ScorecardTab';
import { SquadsTab } from '../SquadsTab';
import { CommentaryTab } from '../CommentaryTab';

const mockTicker: LiveMatchResponse = {
  match_id: 101,
  status: 'live',
  format: 't20',
  venue: 'Wankhede Stadium, Mumbai',
  team_a_name: 'Mumbai Indians',
  team_b_name: 'Chennai Super Kings',
  current_innings_number: 2,
  batting_team_name: 'Mumbai Indians',
  bowling_team_name: 'Chennai Super Kings',
  runs: 145,
  wickets: 3,
  overs: { completed_overs: 16, balls: 2, total_legal_balls: 98 },
  current_run_rate: 8.88,
  target: 180,
  runs_needed: 35,
  balls_remaining: 22,
  required_run_rate: 9.55,
  striker: {
    player_id: 1,
    name: 'Suryakumar Yadav',
    runs: 48,
    balls: 26,
    fours: 5,
    sixes: 2,
    strike_rate: 184.6,
  },
  non_striker: {
    player_id: 2,
    name: 'Tilak Varma',
    runs: 22,
    balls: 15,
    fours: 2,
    sixes: 1,
    strike_rate: 146.7,
  },
  current_bowler: {
    player_id: 3,
    name: 'Jasprit Bumrah',
    overs: { completed_overs: 3, balls: 2, total_legal_balls: 20 },
    maidens: 0,
    runs: 24,
    wickets: 2,
    economy: 7.2,
  },
  current_over_balls: [
    { ball_number: 1, runs: 1, extras: 0, is_wicket: false },
    { ball_number: 2, runs: 4, extras: 0, is_wicket: false },
  ],
  last_event_runs: 4,
  last_event_is_wicket: false,
};

const mockScorecard: MatchScorecardResponse = {
  match_id: 101,
  format: 't20',
  status: 'live',
  venue: 'Wankhede Stadium, Mumbai',
  match_date: '2026-05-15',
  team_a_id: 1,
  team_a_name: 'Mumbai Indians',
  team_b_id: 2,
  team_b_name: 'Chennai Super Kings',
  innings: [
    {
      innings_number: 1,
      batting_team_id: 2,
      batting_team_name: 'Chennai Super Kings',
      bowling_team_id: 1,
      bowling_team_name: 'Mumbai Indians',
      status: 'completed',
      runs: 179,
      wickets: 6,
      overs: { completed_overs: 20, balls: 0, total_legal_balls: 120 },
      batters: [
        {
          player_id: 10,
          player_name: 'Ruturaj Gaikwad',
          runs: 65,
          balls: 45,
          fours: 6,
          sixes: 2,
          strike_rate: 144.4,
          is_out: true,
          dismissal: {
            wicket_type: 'caught',
            bowler_id: 3,
            bowler_name: 'Jasprit Bumrah',
          },
        },
      ],
      bowlers: [
        {
          player_id: 3,
          player_name: 'Jasprit Bumrah',
          overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
          maidens: 1,
          runs: 22,
          wickets: 3,
          economy: 5.5,
          wides: 0,
          no_balls: 0,
        },
      ],
      extras: { wides: 4, no_balls: 1, byes: 0, leg_byes: 2, penalty: 0, total: 7 },
      partnerships: [
        {
          wicket_number: 1,
          runs: 50,
          balls: 35,
          batter_1: { player_id: 10, player_name: 'Ruturaj Gaikwad', runs: 30 },
          batter_2: { player_id: 11, player_name: 'Devon Conway', runs: 20 },
        },
      ],
      fall_of_wickets: [
        {
          wicket_number: 1,
          player_id: 11,
          player_name: 'Devon Conway',
          score: 50,
          overs: { completed_overs: 5, balls: 5, total_legal_balls: 35 },
        },
      ],
    },
  ],
};

const mockSquadA: SquadResponse = {
  id: 1,
  match_id: 101,
  team_id: 1,
  captain_id: 100,
  wicket_keeper_id: 101,
  players: [
    { player_id: 100, player_name: 'Hardik Pandya', role: 'all-rounder', is_playing_xi: true },
    { player_id: 101, player_name: 'Ishan Kishan', role: 'wicketkeeper', is_playing_xi: true },
    { player_id: 102, player_name: 'Jasprit Bumrah', role: 'bowler', is_playing_xi: true },
  ],
};

const mockSquadB: SquadResponse = {
  id: 2,
  match_id: 101,
  team_id: 2,
  captain_id: 200,
  wicket_keeper_id: 201,
  players: [
    { player_id: 200, player_name: 'Ruturaj Gaikwad', role: 'batsman', is_playing_xi: true },
    { player_id: 201, player_name: 'MS Dhoni', role: 'wicketkeeper', is_playing_xi: true },
  ],
};

const mockDeliveries: DeliveryResponse[] = [
  {
    id: 1,
    innings_id: 1,
    over: 0,
    ball: 1,
    bowler_id: 3,
    bowler_name: 'Jasprit Bumrah',
    batsman_id: 10,
    batsman_name: 'Ruturaj Gaikwad',
    non_striker_id: 11,
    runs: 0,
    extras: 0,
    commentary: 'Good length delivery outside off, pushed to cover.',
  },
  {
    id: 2,
    innings_id: 1,
    over: 0,
    ball: 2,
    bowler_id: 3,
    bowler_name: 'Jasprit Bumrah',
    batsman_id: 10,
    batsman_name: 'Ruturaj Gaikwad',
    non_striker_id: 11,
    runs: 4,
    extras: 0,
    commentary: 'FOUR! Driven through the covers with exquisite timing.',
  },
];

describe('MatchCenterHero Component', () => {
  it('renders venue, format, team names, and status badge', () => {
    render(<MatchCenterHero ticker={mockTicker} scorecard={mockScorecard} />);

    expect(screen.getByText('T20')).toBeInTheDocument();
    expect(screen.getByText('Wankhede Stadium, Mumbai')).toBeInTheDocument();
    expect(screen.getByText('Mumbai Indians')).toBeInTheDocument();
    expect(screen.getByText('Chennai Super Kings')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('renders score bug with runs, wickets, overs, CRR, target, and RRR', () => {
    const { container } = render(<MatchCenterHero ticker={mockTicker} scorecard={mockScorecard} />);

    const scoreBug = container.querySelector('.font-score');
    expect(scoreBug?.textContent).toContain('145');
    expect(scoreBug?.textContent).toContain('3');
    expect(screen.getByText(/16\.2 ov/)).toBeInTheDocument();
    expect(screen.getByText('8.88')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('9.55')).toBeInTheDocument();
  });

  it('renders live current over ribbon and bowler figures', () => {
    render(<MatchCenterHero ticker={mockTicker} scorecard={mockScorecard} />);

    expect(screen.getByText('Live Current Over:')).toBeInTheDocument();
    expect(screen.getByText('Jasprit Bumrah')).toBeInTheDocument();
    expect(screen.getByText(/2\/24/)).toBeInTheDocument();
  });

  it('renders empty over placeholder when current_over_balls is empty', () => {
    const emptyTicker = { ...mockTicker, current_over_balls: [] };
    render(<MatchCenterHero ticker={emptyTicker} />);

    expect(screen.getByText('Starting new over...')).toBeInTheDocument();
  });

  it('renders chase equation when status is live with target', () => {
    render(<MatchCenterHero ticker={mockTicker} scorecard={mockScorecard} />);

    expect(screen.getByText(/Mumbai Indians need 35 runs from 22 balls/i)).toBeInTheDocument();
  });

  it('renders match winner banner when status is completed', () => {
    const completedTicker: LiveMatchResponse = { ...mockTicker, status: 'completed' };
    const completedScorecard: MatchScorecardResponse = {
      ...mockScorecard,
      status: 'completed',
      winner_name: 'Mumbai Indians',
      mom_name: 'Jasprit Bumrah',
    };

    render(<MatchCenterHero ticker={completedTicker} scorecard={completedScorecard} />);

    expect(screen.getByText('Mumbai Indians won the match!')).toBeInTheDocument();
    expect(screen.getByText('Player of the Match: Jasprit Bumrah')).toBeInTheDocument();
  });

  it('renders innings break message when status is innings_break', () => {
    const breakTicker: LiveMatchResponse = { ...mockTicker, status: 'innings_break', target: null };
    render(<MatchCenterHero ticker={breakTicker} />);

    expect(screen.getByText('Innings 1 Completed. Innings Break in progress.')).toBeInTheDocument();
  });
});

describe('CreaseTab Component', () => {
  it('renders striker details with ON STRIKE badge, runs, balls, boundaries, and strike rate', () => {
    render(<CreaseTab ticker={mockTicker} />);

    expect(screen.getByText('Suryakumar Yadav')).toBeInTheDocument();
    expect(screen.getByText(/ON STRIKE/i)).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('(26b)')).toBeInTheDocument();
    expect(screen.getByText('5x4')).toBeInTheDocument();
    expect(screen.getByText('2x6')).toBeInTheDocument();
    expect(screen.getByText('SR: 184.6')).toBeInTheDocument();
  });

  it('calculates fallback strike rate when strike_rate is null/undefined', () => {
    const tickerWithoutSR: LiveMatchResponse = {
      ...mockTicker,
      striker: {
        player_id: 1,
        name: 'Hardik Pandya',
        runs: 25,
        balls: 10,
        fours: 2,
        sixes: 2,
        strike_rate: null,
      },
    };

    render(<CreaseTab ticker={tickerWithoutSR} />);
    expect(screen.getByText('SR: 250.0')).toBeInTheDocument();
  });

  it('renders non-striker details and strike rate', () => {
    render(<CreaseTab ticker={mockTicker} />);

    expect(screen.getByText('Tilak Varma')).toBeInTheDocument();
    expect(screen.getByText('NON-STRIKER')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('(15b)')).toBeInTheDocument();
    expect(screen.getByText('2x4')).toBeInTheDocument();
    expect(screen.getByText('1x6')).toBeInTheDocument();
    expect(screen.getByText('SR: 146.7')).toBeInTheDocument();
  });

  it('renders bowler 5-metric ribbon (O, M, R, W, ECON) and current over balls', () => {
    render(<CreaseTab ticker={mockTicker} />);

    expect(screen.getByText('Jasprit Bumrah')).toBeInTheDocument();
    expect(screen.getByText('BOWLING')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument(); // Overs
    expect(screen.getByText('0')).toBeInTheDocument(); // Maidens
    expect(screen.getByText('24')).toBeInTheDocument(); // Runs
    expect(screen.getByText('2')).toBeInTheDocument(); // Wickets
    expect(screen.getByText('7.20')).toBeInTheDocument(); // ECON
    expect(screen.getByText('Current Over Deliveries:')).toBeInTheDocument();
  });

  it('handles null striker, non-striker, and bowler gracefully', () => {
    const minimalTicker: LiveMatchResponse = {
      ...mockTicker,
      striker: null,
      non_striker: null,
      current_bowler: null,
      current_over_balls: [],
    };

    render(<CreaseTab ticker={minimalTicker} />);
    expect(screen.getByText('Striker')).toBeInTheDocument();
    expect(screen.getByText('Non-striker')).toBeInTheDocument();
    expect(screen.getByText('Bowler')).toBeInTheDocument();
    expect(screen.getByText('Starting new over...')).toBeInTheDocument();
  });
});

describe('ScorecardTab Component', () => {
  it('renders loading spinner when isLoading is true', () => {
    render(<ScorecardTab isLoading={true} />);
    expect(screen.getByText('Loading detailed scorecard...')).toBeInTheDocument();
  });

  it('renders error message when isError is true', () => {
    render(<ScorecardTab isError={true} />);
    expect(screen.getByText('Failed to load scorecard data. Please try again.')).toBeInTheDocument();
  });

  it('renders empty message when scorecard is null or has no innings', () => {
    render(<ScorecardTab scorecard={null} />);
    expect(screen.getByText('Scorecard not yet initialized.')).toBeInTheDocument();
  });

  it('renders innings details, BattingTable, and BowlingTable', () => {
    render(<ScorecardTab scorecard={mockScorecard} />);

    expect(screen.getByText(/Chennai Super Kings — Innings 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Bowling: Mumbai Indians/i)).toBeInTheDocument();
    expect(screen.getAllByText(/179\/6/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/20\.0 ov/i).length).toBeGreaterThanOrEqual(1);

    // From BattingTable
    expect(screen.getAllByText('Ruturaj Gaikwad').length).toBeGreaterThanOrEqual(1);
    // From BowlingTable
    expect(screen.getByText('Jasprit Bumrah')).toBeInTheDocument();
  });

  it('renders partnerships breakdown and fall of wickets', () => {
    render(<ScorecardTab scorecard={mockScorecard} />);

    expect(screen.getByText('Partnerships Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('Ruturaj Gaikwad').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Devon Conway')).toBeInTheDocument();
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/(35b)/)).toBeInTheDocument();

    expect(screen.getByText('Fall of Wickets')).toBeInTheDocument();
    expect(screen.getByText(/50\/1/)).toBeInTheDocument();
    expect(screen.getByText(/5\.5 ov/)).toBeInTheDocument();
  });
});

describe('SquadsTab Component', () => {
  it('renders resolved team names and player lists with roles', () => {
    render(
      <SquadsTab
        teamAName="Mumbai Indians"
        teamBName="Chennai Super Kings"
        squadA={mockSquadA}
        squadB={mockSquadB}
      />
    );

    expect(screen.getByText('Mumbai Indians Squad')).toBeInTheDocument();
    expect(screen.getByText('Chennai Super Kings Squad')).toBeInTheDocument();
    expect(screen.getByText(/Hardik Pandya/)).toBeInTheDocument();
    expect(screen.getByText(/Ruturaj Gaikwad/)).toBeInTheDocument();
    expect(screen.getByText(/MS Dhoni/)).toBeInTheDocument();
  });

  it('renders captain (c) and wicket-keeper (wk) badges', () => {
    render(<SquadsTab squadA={mockSquadA} squadB={mockSquadB} scorecard={mockScorecard} />);

    // Hardik Pandya is captain of team A
    const captainBadge = screen.getAllByText('(c)');
    expect(captainBadge.length).toBeGreaterThanOrEqual(1);

    // Ishan Kishan and MS Dhoni are wicketkeepers
    const wkBadge = screen.getAllByText('(wk)');
    expect(wkBadge.length).toBeGreaterThanOrEqual(1);
  });

  it('renders squad not available when squads are null', () => {
    render(<SquadsTab squadA={null} squadB={null} />);

    const notAvailable = screen.getAllByText('Squad not available.');
    expect(notAvailable.length).toBe(2);
  });
});

describe('CommentaryTab Component', () => {
  it('renders commentary stream with deliveries and title', () => {
    render(<CommentaryTab deliveries={mockDeliveries} title="Live Commentary Stream" />);

    expect(screen.getByText('Live Commentary Stream')).toBeInTheDocument();
    expect(
      screen.getByText(/FOUR! Driven through the covers with exquisite timing/i)
    ).toBeInTheDocument();
  });

  it('handles empty deliveries list with emptyMessage', () => {
    render(
      <CommentaryTab
        deliveries={[]}
        emptyMessage="No deliveries recorded yet."
      />
    );

    expect(screen.getByText('No deliveries recorded yet.')).toBeInTheDocument();
  });

  it('forwards onInningsChange when switching innings', () => {
    const handleInningsChange = vi.fn();
    render(
      <CommentaryTab
        deliveries={mockDeliveries}
        inningsNumber={1}
        availableInnings={[1, 2]}
        onInningsChange={handleInningsChange}
      />
    );

    const inn2Button = screen.getByRole('button', { name: /Inn 2/i });
    fireEvent.click(inn2Button);
    expect(handleInningsChange).toHaveBeenCalledWith(2);
  });
});
