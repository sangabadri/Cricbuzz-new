import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type {
  DeliveryResponse,
  LiveMatchResponse,
  MatchScorecardResponse,
  SquadResponse,
  InningsScorecard,
  OversRecord,
} from '../../types/cricket';
import { MatchCenterHero } from '../../components/match/MatchCenterHero';
import { CreaseTab } from '../../components/match/CreaseTab';
import { ScorecardTab } from '../../components/match/ScorecardTab';
import { SquadsTab } from '../../components/match/SquadsTab';
import { CommentaryTab } from '../../components/match/CommentaryTab';

const baseTicker: LiveMatchResponse = {
  match_id: 101,
  status: 'live',
  format: 't20',
  venue: 'Wankhede Stadium, Mumbai',
  team_a_name: 'Mumbai Indians',
  team_b_name: 'Chennai Super Kings',
  current_innings_number: 1,
  batting_team_name: 'Mumbai Indians',
  bowling_team_name: 'Chennai Super Kings',
  runs: 100,
  wickets: 2,
  overs: { completed_overs: 10, balls: 0, total_legal_balls: 60 },
  current_run_rate: 10.0,
  target: null,
  runs_needed: null,
  balls_remaining: null,
  required_run_rate: null,
  striker: {
    player_id: 1,
    name: 'Rohit Sharma',
    runs: 45,
    balls: 30,
    fours: 4,
    sixes: 2,
    strike_rate: 150.0,
  },
  non_striker: {
    player_id: 2,
    name: 'Ishan Kishan',
    runs: 35,
    balls: 25,
    fours: 3,
    sixes: 1,
    strike_rate: 140.0,
  },
  current_bowler: {
    player_id: 3,
    name: 'Ravindra Jadeja',
    overs: { completed_overs: 2, balls: 0, total_legal_balls: 12 },
    maidens: 0,
    runs: 18,
    wickets: 1,
    economy: 9.0,
  },
  current_over_balls: [
    { ball_number: 1, runs: 1, extras: 0, is_wicket: false },
    { ball_number: 2, runs: 6, extras: 0, is_wicket: false },
  ],
  last_event_runs: 6,
  last_event_is_wicket: false,
};

describe('Milestone 3 Challenger Empirical Boundary & Stress Suite', () => {
  describe('Boundary Condition 1: 0 Balls Faced & Zero Division Stress', () => {
    it('handles 0 balls faced with null strike_rate safely in CreaseTab (no NaN, returns 0.0)', () => {
      const ticker: LiveMatchResponse = {
        ...baseTicker,
        striker: {
          player_id: 1,
          name: 'Zero Ball Striker',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strike_rate: null,
        },
      };

      render(<CreaseTab ticker={ticker} />);
      expect(screen.getByText('Zero Ball Striker')).toBeInTheDocument();
      expect(screen.getByText('(0b)')).toBeInTheDocument();
      expect(screen.getByText('SR: 0.0')).toBeInTheDocument();
    });

    it('handles 0 balls faced with undefined strike_rate in CreaseTab', () => {
      const ticker: LiveMatchResponse = {
        ...baseTicker,
        striker: {
          player_id: 1,
          name: 'Undefined SR Striker',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strike_rate: undefined,
        },
      };

      render(<CreaseTab ticker={ticker} />);
      expect(screen.getByText('SR: 0.0')).toBeInTheDocument();
    });

    it('handles non-striker with 0 balls faced and 0 runs safely', () => {
      const ticker: LiveMatchResponse = {
        ...baseTicker,
        non_striker: {
          player_id: 2,
          name: 'New Non-Striker',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strike_rate: null,
        },
      };

      render(<CreaseTab ticker={ticker} />);
      expect(screen.getByText('New Non-Striker')).toBeInTheDocument();
      expect(screen.getByText('SR: 0.0')).toBeInTheDocument();
    });

    it('handles 0 balls in live current over (new over started)', () => {
      const ticker: LiveMatchResponse = {
        ...baseTicker,
        current_over_balls: [],
      };

      const { container: heroContainer } = render(<MatchCenterHero ticker={ticker} />);
      expect(heroContainer.textContent).toContain('Starting new over...');

      const { container: creaseContainer } = render(<CreaseTab ticker={ticker} />);
      expect(creaseContainer.textContent).toContain('Starting new over...');
    });
  });

  describe('Boundary Condition 2: Undefined / Null Strike Rate Fallback Calculation', () => {
    it('computes strike rate dynamically when strike_rate is undefined but balls > 0', () => {
      const ticker: LiveMatchResponse = {
        ...baseTicker,
        striker: {
          player_id: 1,
          name: 'Dynamic SR Batter',
          runs: 37,
          balls: 20,
          fours: 4,
          sixes: 1,
          strike_rate: undefined,
        },
      };

      render(<CreaseTab ticker={ticker} />);
      // 37 / 20 * 100 = 185.0
      expect(screen.getByText('SR: 185.0')).toBeInTheDocument();
    });

    it('computes strike rate dynamically when strike_rate is null and balls > 0', () => {
      const ticker: LiveMatchResponse = {
        ...baseTicker,
        non_striker: {
          player_id: 2,
          name: 'Null SR NonStriker',
          runs: 10,
          balls: 8,
          fours: 1,
          sixes: 0,
          strike_rate: null,
        },
      };

      render(<CreaseTab ticker={ticker} />);
      // 10 / 8 * 100 = 125.0
      expect(screen.getByText('SR: 125.0')).toBeInTheDocument();
    });

    it('respects explicitly 0.0 strike_rate when balls > 0 but runs = 0', () => {
      const ticker: LiveMatchResponse = {
        ...baseTicker,
        striker: {
          player_id: 1,
          name: 'Struggling Striker',
          runs: 0,
          balls: 7,
          fours: 0,
          sixes: 0,
          strike_rate: 0.0,
        },
      };

      render(<CreaseTab ticker={ticker} />);
      expect(screen.getByText('SR: 0.0')).toBeInTheDocument();
    });
  });

  describe('Boundary Condition 3: Negative Values Robustness', () => {
    it('handles negative penalty or negative runs safely in MatchCenterHero', () => {
      const negativeTicker: LiveMatchResponse = {
        ...baseTicker,
        runs: -5,
        wickets: -1,
        overs: { completed_overs: -1, balls: -2, total_legal_balls: -8 },
        current_run_rate: -2.5,
        target: -10,
        runs_needed: -5,
        balls_remaining: -2,
        required_run_rate: -1.2,
      };

      const { container } = render(<MatchCenterHero ticker={negativeTicker} />);
      const scoreBug = container.querySelector('.font-score');
      expect(scoreBug?.textContent).toContain('-5');
      expect(scoreBug?.textContent).toContain('-1');
      expect(screen.getByText('(-1.-2 ov)')).toBeInTheDocument();
      expect(screen.getByText('-2.50')).toBeInTheDocument();
      expect(screen.getByText('-10')).toBeInTheDocument();
      expect(screen.getByText('-1.20')).toBeInTheDocument();
    });

    it('handles negative bowler runs and wickets in CreaseTab without crashing', () => {
      const negativeBowlerTicker: LiveMatchResponse = {
        ...baseTicker,
        current_bowler: {
          player_id: 4,
          name: 'Negative Bowler',
          overs: { completed_overs: -2, balls: -1, total_legal_balls: -13 },
          maidens: -1,
          runs: -10,
          wickets: -2,
          economy: -5.0,
        },
      };

      render(<CreaseTab ticker={negativeBowlerTicker} />);
      expect(screen.getByText('Negative Bowler')).toBeInTheDocument();
      expect(screen.getByText('-2.-1')).toBeInTheDocument();
      expect(screen.getByText('-10')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
      expect(screen.getByText('-5.00')).toBeInTheDocument();
    });
  });

  describe('Boundary Condition 4: Missing Bowler Overs', () => {
    it('handles bowler with undefined or null overs safely in BowlingTable', () => {
      const scorecard: MatchScorecardResponse = {
        match_id: 101,
        format: 't20',
        status: 'live',
        venue: 'Eden Gardens',
        match_date: '2026-05-15',
        team_a_id: 1,
        team_a_name: 'Team A',
        team_b_id: 2,
        team_b_name: 'Team B',
        innings: [
          {
            innings_number: 1,
            batting_team_id: 1,
            batting_team_name: 'Team A',
            bowling_team_id: 2,
            bowling_team_name: 'Team B',
            status: 'completed',
            runs: 120,
            wickets: 4,
            overs: { completed_overs: 15, balls: 0, total_legal_balls: 90 },
            batters: [],
            bowlers: [
              {
                player_id: 99,
                player_name: 'Mystery Bowler',
                overs: undefined as unknown as OversRecord,
                maidens: 0,
                runs: 15,
                wickets: 1,
                economy: null,
                wides: 0,
                no_balls: 0,
              },
            ],
            extras: { wides: 0, no_balls: 0, byes: 0, leg_byes: 0, penalty: 0, total: 0 },
            partnerships: [],
            fall_of_wickets: [],
          },
        ],
      };

      render(<ScorecardTab scorecard={scorecard} />);
      expect(screen.getByText('Mystery Bowler')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument(); // overs fallback
    });

    it('examines current_bowler.overs null safety in CreaseTab', () => {
      const tickerWithNoBowlerOvers: LiveMatchResponse = {
        ...baseTicker,
        current_bowler: {
          player_id: 99,
          name: 'No Overs Bowler',
          overs: undefined as unknown as OversRecord,
          maidens: 0,
          runs: 12,
          wickets: 1,
          economy: 6.0,
        },
      };

      // With optional chaining (?.overs?.completed_overs ?? 0), CreaseTab renders gracefully without throwing
      expect(() => render(<CreaseTab ticker={tickerWithNoBowlerOvers} />)).not.toThrow();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });
  });

  describe('Boundary Condition 5: Empty Innings & Missing Arrays', () => {
    it('renders empty scorecard message when scorecard is null', () => {
      render(<ScorecardTab scorecard={null} />);
      expect(screen.getByText('Scorecard not yet initialized.')).toBeInTheDocument();
    });

    it('renders empty scorecard message when innings array is empty', () => {
      const emptyScorecard: MatchScorecardResponse = {
        match_id: 101,
        format: 't20',
        status: 'scheduled',
        venue: 'Eden Gardens',
        match_date: '2026-05-15',
        team_a_id: 1,
        team_a_name: 'Team A',
        team_b_id: 2,
        team_b_name: 'Team B',
        innings: [],
      };

      render(<ScorecardTab scorecard={emptyScorecard} />);
      expect(screen.getByText('Scorecard not yet initialized.')).toBeInTheDocument();
    });

    it('renders innings with empty batters, bowlers, partnerships, and fall_of_wickets without crashing', () => {
      const minimalInningsScorecard: MatchScorecardResponse = {
        match_id: 101,
        format: 't20',
        status: 'live',
        venue: 'Eden Gardens',
        match_date: '2026-05-15',
        team_a_id: 1,
        team_a_name: 'Team A',
        team_b_id: 2,
        team_b_name: 'Team B',
        innings: [
          {
            innings_number: 1,
            batting_team_id: 1,
            batting_team_name: 'Team A',
            bowling_team_id: 2,
            bowling_team_name: 'Team B',
            status: 'in_progress',
            runs: 0,
            wickets: 0,
            overs: { completed_overs: 0, balls: 0, total_legal_balls: 0 },
            batters: [],
            bowlers: [],
            extras: { wides: 0, no_balls: 0, byes: 0, leg_byes: 0, penalty: 0, total: 0 },
            partnerships: [],
            fall_of_wickets: [],
          },
        ],
      };

      render(<ScorecardTab scorecard={minimalInningsScorecard} />);
      expect(screen.getByText(/Team A — Innings 1/)).toBeInTheDocument();
      expect(screen.getByText('No batting data available')).toBeInTheDocument();
      expect(screen.getByText('No bowling data available')).toBeInTheDocument();
      expect(screen.queryByText('Partnerships Breakdown')).not.toBeInTheDocument();
      expect(screen.queryByText('Fall of Wickets')).not.toBeInTheDocument();
    });

    it('safely supports innings using batting/bowling aliases when batters/bowlers are undefined', () => {
      const aliasedInnings: InningsScorecard = {
        innings_number: 1,
        batting_team_id: 1,
        batting_team_name: 'Team A',
        bowling_team_id: 2,
        bowling_team_name: 'Team B',
        status: 'in_progress',
        runs: 50,
        wickets: 1,
        overs: { completed_overs: 5, balls: 0, total_legal_balls: 30 },
        batters: undefined as unknown as InningsScorecard['batters'],
        bowlers: undefined as unknown as InningsScorecard['bowlers'],
        batting: [
          {
            player_id: 10,
            player_name: 'Alias Batter',
            runs: 30,
            balls: 20,
            fours: 3,
            sixes: 1,
            strike_rate: 150.0,
            is_out: false,
          },
        ],
        bowling: [
          {
            player_id: 20,
            player_name: 'Alias Bowler',
            overs: { completed_overs: 2, balls: 0, total_legal_balls: 12 },
            maidens: 0,
            runs: 14,
            wickets: 1,
            economy: 7.0,
            wides: 0,
            no_balls: 0,
          },
        ],
        extras: { wides: 0, no_balls: 0, byes: 0, leg_byes: 0, penalty: 0, total: 0 },
        partnerships: [],
        fall_of_wickets: [],
      };

      const scorecard: MatchScorecardResponse = {
        match_id: 101,
        format: 't20',
        status: 'live',
        venue: 'Eden Gardens',
        match_date: '2026-05-15',
        team_a_id: 1,
        team_a_name: 'Team A',
        team_b_id: 2,
        team_b_name: 'Team B',
        innings: [aliasedInnings],
      };

      render(<ScorecardTab scorecard={scorecard} />);
      expect(screen.getByText('Alias Batter')).toBeInTheDocument();
      expect(screen.getByText('Alias Bowler')).toBeInTheDocument();
    });
  });

  describe('Boundary Condition 6: Empty Squads & Missing Metadata', () => {
    it('renders "Squad not available." when squads are null or undefined', () => {
      render(
        <SquadsTab
          teamAName="India"
          teamBName="Australia"
          squadA={null}
          squadB={undefined}
        />
      );

      expect(screen.getByText('India Squad')).toBeInTheDocument();
      expect(screen.getByText('Australia Squad')).toBeInTheDocument();
      const notAvailable = screen.getAllByText('Squad not available.');
      expect(notAvailable.length).toBe(2);
    });

    it('renders empty list gracefully when squad has players: []', () => {
      const emptySquadA: SquadResponse = {
        id: 1,
        match_id: 101,
        team_id: 1,
        captain_id: 0,
        wicket_keeper_id: 0,
        players: [],
      };

      const emptySquadB: SquadResponse = {
        id: 2,
        match_id: 101,
        team_id: 2,
        captain_id: 0,
        wicket_keeper_id: 0,
        players: [],
      };

      render(
        <SquadsTab
          teamAName="Team Alpha"
          teamBName="Team Beta"
          squadA={emptySquadA}
          squadB={emptySquadB}
        />
      );

      expect(screen.getByText('Team Alpha Squad')).toBeInTheDocument();
      expect(screen.getByText('Team Beta Squad')).toBeInTheDocument();
      expect(screen.queryByText('Squad not available.')).not.toBeInTheDocument();
    });

    it('falls back to "Player #ID" and "Player" role when player name and role are null', () => {
      const anonymousSquad: SquadResponse = {
        id: 1,
        match_id: 101,
        team_id: 1,
        captain_id: 42,
        wicket_keeper_id: 99,
        players: [
          {
            player_id: 42,
            player_name: null,
            role: null,
            is_playing_xi: true,
          },
        ],
      };

      render(
        <SquadsTab
          teamAName="Mystery Team"
          squadA={anonymousSquad}
          squadB={null}
        />
      );

      expect(screen.getByText(/Player #42/)).toBeInTheDocument();
      expect(screen.getByText('(c)')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
    });
  });

  describe('Behavioral & Functional Parity Verification', () => {
    it('hero ball bubbles use size="sm" class and crease ball bubbles use size="md" class', () => {
      const { container: heroContainer } = render(
        <MatchCenterHero ticker={baseTicker} />
      );
      // sm ball bubbles have w-6 h-6
      const smBubbles = heroContainer.querySelectorAll('.w-6.h-6');
      expect(smBubbles.length).toBe(2);

      const { container: creaseContainer } = render(
        <CreaseTab ticker={baseTicker} />
      );
      // md ball bubbles have w-7 h-7
      const mdBubbles = creaseContainer.querySelectorAll('.w-7.h-7');
      expect(mdBubbles.length).toBe(2);
    });

    it('matches CommentaryTab custom classNames and title props', () => {
      const mockDeliveries: DeliveryResponse[] = [
        {
          id: 1,
          innings_id: 1,
          over: 0,
          ball: 1,
          bowler_id: 3,
          bowler_name: 'Jadeja',
          batsman_id: 1,
          batsman_name: 'Rohit',
          non_striker_id: 2,
          runs: 1,
          extras: 0,
          commentary: 'Single pushed to mid-on.',
        },
      ];

      render(
        <CommentaryTab
          className="custom-test-class"
          deliveries={mockDeliveries}
          title="Custom Challenger Stream"
        />
      );

      expect(screen.getByText('Custom Challenger Stream')).toBeInTheDocument();
      expect(screen.getByText(/Single pushed to mid-on/)).toBeInTheDocument();
    });
  });
});
