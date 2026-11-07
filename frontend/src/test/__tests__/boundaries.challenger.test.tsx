import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTeamIdentity } from '../../utils/teamColors';
import { BattingTable } from '../../components/match/BattingTable';
import type { BattingTableTotals } from '../../components/match/BattingTable';
import { BowlingTable } from '../../components/match/BowlingTable';
import type { BatterScorecard, BowlerScorecard, ExtrasBreakdown } from '../../types/cricket';

describe('Challenger Empirical Boundary & Stress Suite', () => {
  describe('teamColors.ts Boundary Stress', () => {
    it('handles tabs, newlines, and irregular whitespace in multi-word team names', () => {
      const identity = getTeamIdentity('  Kolkata \t\n Knight   Riders  ');
      expect(identity.shortCode).toBe('KKR');
      expect(identity.name).toBe('  Kolkata \t\n Knight   Riders  ');
    });

    it('handles two-word team names where the second word is a single letter', () => {
      const identity = getTeamIdentity('Team X', 7);
      // words[0][0] = 'T', words[1][0] = 'X', words[2] is undefined, words[1][1] is undefined
      // -> 'TX'
      expect(identity.shortCode).toBe('TX');
    });

    it('handles 1-letter single-word team name by falling back to T + teamId', () => {
      const identity = getTeamIdentity('A', 4);
      expect(identity.shortCode).toBe('T4');
    });

    it('handles teamId = 0 falling back to T1 when word is < 3 chars', () => {
      const identity = getTeamIdentity('X', 0);
      expect(identity.shortCode).toBe('T1');
    });

    it('handles teamId as undefined and teamName as empty string', () => {
      const identity = getTeamIdentity('', undefined);
      expect(identity.name).toBe('Team');
      expect(identity.shortCode).toBe('T1');
    });

    it('evaluates palette selection when teamId is a large integer', () => {
      const identity = getTeamIdentity('Punjab Kings', 999999);
      expect(identity.shortCode).toBe('PKI');
      expect(['#0284c7', '#7c3aed', '#ea580c', '#0d9488']).toContain(identity.primaryColor);
    });

    it('safely handles negative teamId without throwing exceptions', () => {
      // (-1 + 65) % 4 = 64 % 4 = 0
      const identity = getTeamIdentity('Alpha', -1);
      expect(identity.name).toBe('Alpha');
      expect(identity.shortCode).toBe('ALP');

      // Empty name with negative teamId produces negative hash (-1 % 4 = -1)
      const edgeIdentity = getTeamIdentity('', -1);
      expect(edgeIdentity.name).toBe('Team');
      expect(edgeIdentity.shortCode).toBe('T-1');
      // Palette is undefined because JS % preserves negative sign
      expect(edgeIdentity.primaryColor).toBeUndefined();
    });
  });

  describe('BattingTable.tsx Boundary Stress', () => {
    it('renders gracefully when strike_rate is null', () => {
      const batter: BatterScorecard = {
        player_id: 101,
        player_name: 'Dinesh Karthik',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strike_rate: null,
        is_out: false,
      };

      render(<BattingTable batters={[batter]} />);
      expect(screen.getByText('Dinesh Karthik')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('renders gracefully when strike_rate is undefined', () => {
      const batter: BatterScorecard = {
        player_id: 102,
        player_name: 'R Ashwin',
        runs: 5,
        balls: 4,
        fours: 1,
        sixes: 0,
        strike_rate: undefined,
        is_out: true,
        dismissal: {
          wicket_type: 'hit_wicket',
          bowler_id: 20,
          bowler_name: 'Bumrah',
        },
      };

      render(<BattingTable batters={[batter]} />);
      expect(screen.getByText(/hit wicket/i)).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('verifies exact strike-rate color boundary thresholds', () => {
      const exactBoundaries: BatterScorecard[] = [
        {
          player_id: 1,
          player_name: 'Exact 150',
          runs: 15,
          balls: 10,
          fours: 0,
          sixes: 0,
          strike_rate: 150.0,
          is_out: false,
        },
        {
          player_id: 2,
          player_name: 'Sub 150 (149.9)',
          runs: 15,
          balls: 10,
          fours: 0,
          sixes: 0,
          strike_rate: 149.9,
          is_out: false,
        },
        {
          player_id: 3,
          player_name: 'Exact 120',
          runs: 12,
          balls: 10,
          fours: 0,
          sixes: 0,
          strike_rate: 120.0,
          is_out: false,
        },
        {
          player_id: 4,
          player_name: 'Sub 120 (119.9, balls <= 5)',
          runs: 6,
          balls: 5,
          fours: 0,
          sixes: 0,
          strike_rate: 119.9,
          is_out: false,
        },
        {
          player_id: 5,
          player_name: 'Exact 90 (balls > 5)',
          runs: 9,
          balls: 10,
          fours: 0,
          sixes: 0,
          strike_rate: 90.0,
          is_out: false,
        },
        {
          player_id: 6,
          player_name: 'Sub 90 with balls exactly 5 (should NOT be amber)',
          runs: 4,
          balls: 5,
          fours: 0,
          sixes: 0,
          strike_rate: 80.0,
          is_out: false,
        },
        {
          player_id: 7,
          player_name: 'Sub 90 with balls = 6 (SHOULD be amber)',
          runs: 5,
          balls: 6,
          fours: 0,
          sixes: 0,
          strike_rate: 83.3,
          is_out: false,
        },
      ];

      render(<BattingTable batters={exactBoundaries} />);

      expect(screen.getByText('150.0')).toHaveClass('text-emerald-400', 'font-bold');
      expect(screen.getByText('149.9')).toHaveClass('text-sky-400', 'font-semibold');
      expect(screen.getByText('120.0')).toHaveClass('text-sky-400', 'font-semibold');
      expect(screen.getByText('119.9')).toHaveClass('text-slate-300');
      expect(screen.getByText('90.0')).toHaveClass('text-slate-300');
      expect(screen.getByText('80.0')).toHaveClass('text-slate-300'); // balls = 5 -> not amber
      expect(screen.getByText('83.3')).toHaveClass('text-amber-400/90'); // balls = 6 -> amber
    });

    it('renders totals row safely when overs object is incomplete or nullish', () => {
      const totalsWithoutOvers: BattingTableTotals = {
        runs: 50,
        wickets: 1,
        overs: undefined as unknown as BattingTableTotals['overs'],
      };

      render(<BattingTable batters={[]} totals={totalsWithoutOvers} />);
      expect(screen.getByText('50/1')).toBeInTheDocument();
      expect(screen.getByText('(0.0 Overs)')).toBeInTheDocument();
    });

    it('renders all zero values for extras without rendering NaN or failing', () => {
      const zeroExtras: ExtrasBreakdown = {
        total: 0,
        byes: 0,
        leg_byes: 0,
        wides: 0,
        no_balls: 0,
        penalty: 0,
      };

      render(<BattingTable batters={[]} extras={zeroExtras} />);
      expect(screen.getByText('Extras')).toBeInTheDocument();
      expect(screen.getByText('(b 0, lb 0, w 0, nb 0)')).toBeInTheDocument();
    });
  });

  describe('BowlingTable.tsx Boundary Stress', () => {
    it('verifies exact economy color boundary thresholds', () => {
      const boundaryBowlers: BowlerScorecard[] = [
        {
          player_id: 1,
          player_name: 'Min Positive (0.01)',
          overs: { completed_overs: 1, balls: 0, total_legal_balls: 6 },
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: 0.01,
          wides: 0,
          no_balls: 0,
        },
        {
          player_id: 2,
          player_name: 'Exact 6.00',
          overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
          maidens: 0,
          runs: 24,
          wickets: 1,
          economy: 6.0,
          wides: 0,
          no_balls: 0,
        },
        {
          player_id: 3,
          player_name: 'Just Over 6.00 (6.01)',
          overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
          maidens: 0,
          runs: 25,
          wickets: 1,
          economy: 6.01,
          wides: 0,
          no_balls: 0,
        },
        {
          player_id: 4,
          player_name: 'Exact 8.50',
          overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
          maidens: 0,
          runs: 34,
          wickets: 1,
          economy: 8.5,
          wides: 0,
          no_balls: 0,
        },
        {
          player_id: 5,
          player_name: 'Just Over 8.50 (8.51)',
          overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
          maidens: 0,
          runs: 35,
          wickets: 0,
          economy: 8.51,
          wides: 0,
          no_balls: 0,
        },
        {
          player_id: 6,
          player_name: 'Exact 11.00',
          overs: { completed_overs: 3, balls: 0, total_legal_balls: 18 },
          maidens: 0,
          runs: 33,
          wickets: 0,
          economy: 11.0,
          wides: 0,
          no_balls: 0,
        },
        {
          player_id: 7,
          player_name: 'Just Over 11.00 (11.01)',
          overs: { completed_overs: 2, balls: 0, total_legal_balls: 12 },
          maidens: 0,
          runs: 23,
          wickets: 0,
          economy: 11.01,
          wides: 0,
          no_balls: 0,
        },
      ];

      render(<BowlingTable bowlers={boundaryBowlers} />);

      expect(screen.getByText('0.01')).toHaveClass('text-emerald-400', 'font-bold');
      expect(screen.getByText('6.00')).toHaveClass('text-emerald-400', 'font-bold');
      expect(screen.getByText('6.01')).toHaveClass('text-sky-400');
      expect(screen.getByText('8.50')).toHaveClass('text-sky-400');
      expect(screen.getByText('8.51')).toHaveClass('text-slate-300');
      expect(screen.getByText('11.00')).toHaveClass('text-slate-300');
      expect(screen.getByText('11.01')).toHaveClass('text-amber-400/90');
    });

    it('safely renders when overs balls is 5 (last ball before complete over)', () => {
      const bowler: BowlerScorecard = {
        player_id: 9,
        player_name: 'Over Boundary Bowler',
        overs: { completed_overs: 3, balls: 5, total_legal_balls: 23 },
        maidens: 0,
        runs: 29,
        wickets: 1,
        economy: 7.57,
        wides: 0,
        no_balls: 0,
      };

      render(<BowlingTable bowlers={[bowler]} />);
      expect(screen.getByText('3.5')).toBeInTheDocument();
    });
  });
});
