import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchCenter } from '../../pages/MatchCenter';
import { MatchCenterHero } from '../../components/match/MatchCenterHero';
import { CreaseTab } from '../../components/match/CreaseTab';
import { ScorecardTab } from '../../components/match/ScorecardTab';
import { BallBubble } from '../../components/common/BallBubble';
import { cricketApi } from '../../api/client';
import type {
  LiveMatchResponse,
  MatchScorecardResponse,
  DeliveryResponse,
  InningsScorecard,
} from '../../types/cricket';

// Sample mock data for testing
const baseTicker: LiveMatchResponse = {
  match_id: 42,
  status: 'live',
  format: 't20',
  venue: 'Eden Gardens, Kolkata',
  team_a_name: 'Kolkata Knight Riders',
  team_b_name: 'Royal Challengers Bengaluru',
  current_innings_number: 2,
  batting_team_name: 'Royal Challengers Bengaluru',
  bowling_team_name: 'Kolkata Knight Riders',
  runs: 160,
  wickets: 4,
  overs: { completed_overs: 17, balls: 3, total_legal_balls: 105 },
  current_run_rate: 9.14,
  target: 195,
  runs_needed: 35,
  balls_remaining: 15,
  required_run_rate: 14.0,
  striker: {
    player_id: 18,
    name: 'Virat Kohli',
    runs: 75,
    balls: 42,
    fours: 6,
    sixes: 4,
    strike_rate: 178.57,
  },
  non_striker: {
    player_id: 97,
    name: 'Dinesh Karthik',
    runs: 18,
    balls: 8,
    fours: 2,
    sixes: 1,
    strike_rate: 225.0,
  },
  current_bowler: {
    player_id: 74,
    name: 'Sunil Narine',
    overs: { completed_overs: 3, balls: 3, total_legal_balls: 21 },
    maidens: 0,
    runs: 26,
    wickets: 2,
    economy: 7.43,
  },
  current_over_balls: [
    { ball_number: 1, runs: 1, extras: 0, is_wicket: false },
    { ball_number: 2, runs: 6, extras: 0, is_wicket: false },
    { ball_number: 3, runs: 0, extras: 0, is_wicket: true },
  ],
  last_event_runs: 0,
  last_event_is_wicket: true,
};

const baseDeliveries: DeliveryResponse[] = [
  {
    id: 1,
    innings_id: 2,
    over: 17,
    ball: 1,
    bowler_id: 74,
    bowler_name: 'Sunil Narine',
    batsman_id: 18,
    batsman_name: 'Virat Kohli',
    non_striker_id: 97,
    runs: 1,
    extras: 0,
    commentary: 'Flat on middle and leg, punched down to long-on for a single.',
  },
  {
    id: 2,
    innings_id: 2,
    over: 17,
    ball: 2,
    bowler_id: 74,
    bowler_name: 'Sunil Narine',
    batsman_id: 97,
    batsman_name: 'Dinesh Karthik',
    non_striker_id: 18,
    runs: 6,
    extras: 0,
    commentary: 'SIX! Slog swept deep into the mid-wicket stands! Massive hit!',
  },
];

const baseScorecard: MatchScorecardResponse = {
  match_id: 42,
  format: 't20',
  status: 'live',
  venue: 'Eden Gardens, Kolkata',
  match_date: '2026-05-20',
  team_a_id: 1,
  team_a_name: 'Kolkata Knight Riders',
  team_b_id: 2,
  team_b_name: 'Royal Challengers Bengaluru',
  innings: [
    {
      innings_number: 1,
      batting_team_id: 1,
      batting_team_name: 'Kolkata Knight Riders',
      bowling_team_id: 2,
      bowling_team_name: 'Royal Challengers Bengaluru',
      status: 'completed',
      runs: 194,
      wickets: 5,
      overs: { completed_overs: 20, balls: 0, total_legal_balls: 120 },
      batters: [
        {
          player_id: 12,
          player_name: 'Shreyas Iyer',
          runs: 82,
          balls: 45,
          fours: 7,
          sixes: 4,
          strike_rate: 182.2,
          is_out: true,
          dismissal: {
            wicket_type: 'caught',
            bowler_id: 99,
            bowler_name: 'Mohammed Siraj',
          },
        },
      ],
      bowlers: [
        {
          player_id: 99,
          player_name: 'Mohammed Siraj',
          overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
          maidens: 0,
          runs: 38,
          wickets: 2,
          economy: 9.5,
          wides: 1,
          no_balls: 0,
        },
      ],
      extras: { wides: 5, no_balls: 1, byes: 1, leg_byes: 2, penalty: 0, total: 9 },
      partnerships: [
        {
          wicket_number: 1,
          runs: 72,
          balls: 44,
          batters: [
            { player_id: 12, player_name: 'Shreyas Iyer', runs: 42 },
            { player_id: 14, player_name: 'Phil Salt', runs: 30 },
          ],
        },
      ],
      fall_of_wickets: [
        {
          wicket_number: 1,
          player_id: 14,
          player_name: 'Phil Salt',
          score: 72,
          overs: { completed_overs: 7, balls: 2, total_legal_balls: 44 },
        },
      ],
    },
  ],
};

describe('Empirical Challenger: MatchCenter Decomposition Stress Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.restoreAllMocks();
  });

  describe('Task 1: Responsive Layout Verification', () => {
    it('empirically verifies commentary tab button is hidden on desktop (lg:hidden) while other tabs are visible across all breakpoints', async () => {
      vi.spyOn(cricketApi, 'getLiveTicker').mockResolvedValue(baseTicker);
      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue(baseScorecard);
      vi.spyOn(cricketApi, 'getDeliveries').mockResolvedValue(baseDeliveries);
      vi.spyOn(cricketApi, 'getSquad').mockResolvedValue(null as any);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/matches/42']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Wait for ticker to load
      await screen.findByText('Match #42 Center');

      // 1. Locate Commentary tab button
      const commentaryTabBtn = screen.getByRole('button', { name: /Commentary/i });
      expect(commentaryTabBtn).toBeInTheDocument();
      // Must contain lg:hidden class so it is not visible on desktop
      expect(commentaryTabBtn.className).toContain('lg:hidden');

      // 2. Locate non-mobile-only tabs and verify they do NOT have lg:hidden
      const creaseTabBtn = screen.getByRole('button', { name: /Crease Analysis/i });
      const scorecardTabBtn = screen.getByRole('button', { name: /Full Scorecard/i });
      const squadsTabBtn = screen.getByRole('button', { name: /Playing XI & Squads/i });

      expect(creaseTabBtn.className).not.toContain('lg:hidden');
      expect(scorecardTabBtn.className).not.toContain('lg:hidden');
      expect(squadsTabBtn.className).not.toContain('lg:hidden');
    });

    it('empirically verifies mobile commentary tab content renders with lg:hidden when active', async () => {
      vi.spyOn(cricketApi, 'getLiveTicker').mockResolvedValue(baseTicker);
      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue(baseScorecard);
      vi.spyOn(cricketApi, 'getDeliveries').mockResolvedValue(baseDeliveries);
      vi.spyOn(cricketApi, 'getSquad').mockResolvedValue(null as any);

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/matches/42']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await screen.findByText('Match #42 Center');

      // Switch to commentary tab
      const commentaryTabBtn = screen.getByRole('button', { name: /Commentary/i });
      fireEvent.click(commentaryTabBtn);

      // Verify that the rendered CommentaryTab component wrapper has the lg:hidden class
      const commentaryTabWrapper = container.querySelector('.lg\\:col-span-7 .lg\\:hidden');
      expect(commentaryTabWrapper).not.toBeNull();
      expect(commentaryTabWrapper?.className).toContain('lg:hidden');
    });

    it('empirically verifies persistent desktop right column commentary feed has hidden lg:block lg:col-span-5 sticky top-20', async () => {
      vi.spyOn(cricketApi, 'getLiveTicker').mockResolvedValue(baseTicker);
      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue(baseScorecard);
      vi.spyOn(cricketApi, 'getDeliveries').mockResolvedValue(baseDeliveries);
      vi.spyOn(cricketApi, 'getSquad').mockResolvedValue(null as any);

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/matches/42']}>
            <Routes>
              <Route path="/matches/:id" element={<MatchCenter />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await screen.findByText('Match #42 Center');

      // Locate desktop right column
      const desktopColumn = container.querySelector('.hidden.lg\\:block.lg\\:col-span-5.sticky.top-20');
      expect(desktopColumn).not.toBeNull();
      expect(desktopColumn).toBeInTheDocument();

      // Ensure CommentaryFeed is rendered within the desktop column
      expect(desktopColumn?.textContent).toContain('Live Commentary Stream');
      expect(desktopColumn?.textContent).toContain('SIX! Slog swept deep');
    });
  });

  describe('Task 2: BallBubble Sizes Empirical Verification', () => {
    it('empirically verifies MatchCenterHero live current over ribbon applies size="sm" (w-6 h-6 text-[11px])', () => {
      render(
        <MatchCenterHero ticker={baseTicker} scorecard={baseScorecard} />
      );

      // Locate the live current over section
      const liveOverSection = screen.getByText('Live Current Over:').parentElement;
      expect(liveOverSection).toBeInTheDocument();

      // Find all ball bubbles in this section
      const bubbles = liveOverSection?.querySelectorAll('span.rounded-full');
      expect(bubbles?.length).toBe(3);

      bubbles?.forEach((bubble) => {
        expect(bubble.className).toContain('w-6');
        expect(bubble.className).toContain('h-6');
        expect(bubble.className).toContain('text-[11px]');
        expect(bubble.className).toContain('font-semibold');
        // Must NOT have md or lg classes
        expect(bubble.className).not.toContain('w-7');
        expect(bubble.className).not.toContain('w-9');
      });
    });

    it('empirically verifies CreaseTab active bowler current over deliveries applies size="md" (w-7 h-7 text-xs)', () => {
      render(<CreaseTab ticker={baseTicker} />);

      const bowlerSection = screen.getByText('Current Over Deliveries:').parentElement;
      expect(bowlerSection).toBeInTheDocument();

      const bubbles = bowlerSection?.querySelectorAll('span.rounded-full');
      expect(bubbles?.length).toBe(3);

      bubbles?.forEach((bubble) => {
        expect(bubble.className).toContain('w-7');
        expect(bubble.className).toContain('h-7');
        expect(bubble.className).toContain('text-xs');
        expect(bubble.className).toContain('font-bold');
        // Must NOT have sm or lg classes
        expect(bubble.className).not.toContain('w-6');
        expect(bubble.className).not.toContain('w-9');
      });
    });

    it('empirically verifies direct BallBubble size prop contract (sm, md, lg, default)', () => {
      const { container, rerender } = render(<BallBubble ball={4} size="sm" />);
      expect(container.firstChild).toHaveClass('w-6', 'h-6', 'text-[11px]', 'font-semibold');

      rerender(<BallBubble ball={4} size="md" />);
      expect(container.firstChild).toHaveClass('w-7', 'h-7', 'text-xs', 'font-bold');

      rerender(<BallBubble ball={4} size="lg" />);
      expect(container.firstChild).toHaveClass('w-9', 'h-9', 'text-sm', 'font-extrabold');

      rerender(<BallBubble ball={4} />); // default
      expect(container.firstChild).toHaveClass('w-7', 'h-7', 'text-xs', 'font-bold');
    });
  });

  describe('Task 3: ScorecardTab Partnerships Breakdown & Fall of Wickets Formatting', () => {
    it('empirically verifies standard partnerships breakdown with batters array and balls', () => {
      const scorecardWithPartnership: MatchScorecardResponse = {
        ...baseScorecard,
        innings: [
          {
            ...baseScorecard.innings[0],
            partnerships: [
              {
                wicket_number: 1,
                runs: 85,
                balls: 52,
                batters: [
                  { player_id: 1, player_name: 'Rohit Sharma', runs: 55 },
                  { player_id: 2, player_name: 'Shubman Gill', runs: 30 },
                ],
              },
            ],
          },
        ],
      };

      render(<ScorecardTab scorecard={scorecardWithPartnership} />);

      expect(screen.getByText('Partnerships Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Rohit Sharma')).toBeInTheDocument();
      expect(screen.getByText('Shubman Gill')).toBeInTheDocument();
      expect(screen.getByText('&')).toBeInTheDocument();
      expect(screen.getByText(/85/)).toBeInTheDocument();
      expect(screen.getByText('(52b)')).toBeInTheDocument();
    });

    it('empirically verifies alternative backend partnership schema (batter_1, batter_2, total_runs)', () => {
      const scorecardWithAltPartnership: MatchScorecardResponse = {
        ...baseScorecard,
        innings: [
          {
            ...baseScorecard.innings[0],
            partnerships: [
              {
                wicket_number: 2,
                total_runs: 64,
                balls: 38,
                batter_1: { player_id: 3, player_name: 'Ravindra Jadeja', runs: 40 },
                batter_2: { player_id: 4, player_name: 'Axar Patel', runs: 24 },
              },
            ],
          },
        ],
      };

      render(<ScorecardTab scorecard={scorecardWithAltPartnership} />);

      expect(screen.getByText('Ravindra Jadeja')).toBeInTheDocument();
      expect(screen.getByText('Axar Patel')).toBeInTheDocument();
      expect(screen.getByText(/64/)).toBeInTheDocument();
      expect(screen.getByText('(38b)')).toBeInTheDocument();
    });

    it('empirically verifies missing batter names in partnerships safely fall back to "Batter 1" & "Batter 2"', () => {
      const scorecardWithAnonymousPartnership: MatchScorecardResponse = {
        ...baseScorecard,
        innings: [
          {
            ...baseScorecard.innings[0],
            partnerships: [
              {
                wicket_number: 1,
                runs: 15,
                balls: 10,
              },
            ],
          },
        ],
      };

      render(<ScorecardTab scorecard={scorecardWithAnonymousPartnership} />);

      expect(screen.getByText('Batter 1')).toBeInTheDocument();
      expect(screen.getByText('Batter 2')).toBeInTheDocument();
      expect(screen.getByText(/15/)).toBeInTheDocument();
      expect(screen.getByText('(10b)')).toBeInTheDocument();
    });

    it('empirically verifies fall of wickets formatting: score/wicket_number (player_name, completed_overs.balls ov)', () => {
      const scorecardWithFOW: MatchScorecardResponse = {
        ...baseScorecard,
        innings: [
          {
            ...baseScorecard.innings[0],
            fall_of_wickets: [
              {
                wicket_number: 1,
                player_id: 14,
                player_name: 'Phil Salt',
                score: 72,
                overs: { completed_overs: 7, balls: 2, total_legal_balls: 44 },
              },
              {
                wicket_number: 2,
                player_id: 15,
                player_name: 'Sunil Narine',
                score: 110,
                overs: { completed_overs: 11, balls: 4, total_legal_balls: 70 },
              },
            ],
          },
        ],
      };

      render(<ScorecardTab scorecard={scorecardWithFOW} />);

      expect(screen.getByText('Fall of Wickets')).toBeInTheDocument();
      // First wicket
      expect(screen.getByText('72/1')).toBeInTheDocument();
      expect(screen.getByText(/Phil Salt, 7\.2 ov/)).toBeInTheDocument();
      // Second wicket
      expect(screen.getByText('110/2')).toBeInTheDocument();
      expect(screen.getByText(/Sunil Narine, 11\.4 ov/)).toBeInTheDocument();
    });

    it('empirically verifies fall of wickets with golden duck (0/1) and undefined overs safely formats as 0.0 ov', () => {
      const scorecardGoldenDuck: MatchScorecardResponse = {
        ...baseScorecard,
        innings: [
          {
            ...baseScorecard.innings[0],
            fall_of_wickets: [
              {
                wicket_number: 1,
                player_id: 10,
                player_name: 'Opener',
                score: 0,
                overs: undefined as unknown as InningsScorecard['overs'],
              },
            ],
          },
        ],
      };

      render(<ScorecardTab scorecard={scorecardGoldenDuck} />);

      expect(screen.getByText('0/1')).toBeInTheDocument();
      expect(screen.getByText(/Opener, 0\.0 ov/)).toBeInTheDocument();
    });

    it('empirically verifies that empty or undefined partnerships and fall_of_wickets do not render empty sections', () => {
      const scorecardEmptySections: MatchScorecardResponse = {
        ...baseScorecard,
        innings: [
          {
            ...baseScorecard.innings[0],
            partnerships: [],
            fall_of_wickets: [],
          },
        ],
      };

      render(<ScorecardTab scorecard={scorecardEmptySections} />);

      expect(screen.queryByText('Partnerships Breakdown')).not.toBeInTheDocument();
      expect(screen.queryByText('Fall of Wickets')).not.toBeInTheDocument();
    });
  });
});
