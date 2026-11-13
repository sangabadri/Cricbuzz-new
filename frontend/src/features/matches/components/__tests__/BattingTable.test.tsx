import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { BatterScorecard, ExtrasBreakdown } from '../../../types/cricket';
import type { BattingTableTotals } from '../BattingTable';
import { BattingTable } from '../BattingTable';

describe('BattingTable Component', () => {
  it('renders empty state when batters array is empty', () => {
    render(<BattingTable batters={[]} />);
    expect(screen.getByText('No batting data available')).toBeInTheDocument();
  });

  it('renders active (not out) batter with asterisk, not out text, and highlight border', () => {
    const activeBatter: BatterScorecard = {
      player_id: 1,
      player_name: 'Virat Kohli',
      runs: 82,
      balls: 53,
      fours: 6,
      sixes: 4,
      strike_rate: 154.7,
      is_out: false,
    };

    const { container } = render(<BattingTable batters={[activeBatter]} />);

    expect(screen.getByText(/Virat Kohli/i)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('not out')).toBeInTheDocument();

    const row = container.querySelector('tbody tr');
    expect(row).toHaveClass('border-[#38bdf8]');
  });

  it('renders dismissed batter with formatted dismissal details', () => {
    const dismissedBatter: BatterScorecard = {
      player_id: 2,
      player_name: 'Rohit Sharma',
      runs: 45,
      balls: 28,
      fours: 5,
      sixes: 2,
      strike_rate: 160.7,
      is_out: true,
      dismissal: {
        wicket_type: 'caught',
        bowler_id: 10,
        bowler_name: 'Pat Cummins',
        fielder_id: 11,
        fielder_name: 'Steve Smith',
      },
    };

    const { container } = render(<BattingTable batters={[dismissedBatter]} />);

    expect(screen.getByText(/Rohit Sharma/i)).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
    expect(screen.getByText(/Caught/i)).toBeInTheDocument();
    expect(screen.getByText(/c Steve Smith/i)).toBeInTheDocument();
    expect(screen.getByText(/b Pat Cummins/i)).toBeInTheDocument();

    const row = container.querySelector('tbody tr');
    expect(row).toHaveClass('border-transparent');
  });

  it('formats dismissals without a fielder correctly', () => {
    const bowledBatter: BatterScorecard = {
      player_id: 3,
      player_name: 'KL Rahul',
      runs: 12,
      balls: 15,
      fours: 1,
      sixes: 0,
      strike_rate: 80.0,
      is_out: true,
      dismissal: {
        wicket_type: 'bowled',
        bowler_id: 12,
        bowler_name: 'Mitchell Starc',
      },
    };

    render(<BattingTable batters={[bowledBatter]} />);

    expect(screen.getByText(/Bowled/i)).toBeInTheDocument();
    expect(screen.getByText(/b Mitchell Starc/i)).toBeInTheDocument();
  });

  it('formats underscore wicket types like run_out with spaces', () => {
    const runOutBatter: BatterScorecard = {
      player_id: 4,
      player_name: 'Suryakumar Yadav',
      runs: 25,
      balls: 16,
      fours: 3,
      sixes: 1,
      strike_rate: 156.25,
      is_out: true,
      dismissal: {
        wicket_type: 'run_out',
        bowler_id: 12,
        bowler_name: 'Mitchell Starc',
      },
    };

    render(<BattingTable batters={[runOutBatter]} />);
    expect(screen.getByText(/Run out/i)).toBeInTheDocument();
  });

  it('applies strike rate threshold color classes correctly', () => {
    const batters: BatterScorecard[] = [
      {
        player_id: 1,
        player_name: 'Fast Batter',
        runs: 30,
        balls: 18,
        fours: 2,
        sixes: 2,
        strike_rate: 166.7, // >= 150: text-emerald-400 font-bold
        is_out: false,
      },
      {
        player_id: 2,
        player_name: 'Medium Batter',
        runs: 26,
        balls: 20,
        fours: 2,
        sixes: 0,
        strike_rate: 130.0, // >= 120: text-sky-400 font-semibold
        is_out: false,
      },
      {
        player_id: 3,
        player_name: 'Slow Batter',
        runs: 6,
        balls: 10,
        fours: 0,
        sixes: 0,
        strike_rate: 60.0, // < 90 && balls > 5: text-amber-400/90
        is_out: false,
      },
      {
        player_id: 4,
        player_name: 'Anchor Batter',
        runs: 10,
        balls: 10,
        fours: 1,
        sixes: 0,
        strike_rate: 100.0, // Default: text-slate-300
        is_out: false,
      },
    ];

    render(<BattingTable batters={batters} />);

    expect(screen.getByText('166.7')).toHaveClass('text-emerald-400', 'font-bold');
    expect(screen.getByText('130.0')).toHaveClass('text-sky-400', 'font-semibold');
    expect(screen.getByText('60.0')).toHaveClass('text-amber-400/90');
    expect(screen.getByText('100.0')).toHaveClass('text-slate-300');
  });

  it('renders boundary counts with appropriate styling when zero vs positive', () => {
    const batter: BatterScorecard = {
      player_id: 1,
      player_name: 'Batter One',
      runs: 16,
      balls: 8,
      fours: 4,
      sixes: 0,
      strike_rate: 200.0,
      is_out: false,
    };

    render(<BattingTable batters={[batter]} />);

    const foursElement = screen.getByText('4');
    expect(foursElement).toHaveClass('text-sky-400');

    const sixesZero = screen.getByText('0');
    expect(sixesZero).toHaveClass('text-slate-600');
  });

  it('renders extras breakdown row when extras prop is passed', () => {
    const extras: ExtrasBreakdown = {
      total: 12,
      byes: 2,
      leg_byes: 3,
      wides: 5,
      no_balls: 2,
      penalty: 0,
    };

    render(<BattingTable batters={[]} extras={extras} />);

    expect(screen.getByText('Extras')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('(b 2, lb 3, w 5, nb 2)')).toBeInTheDocument();
  });

  it('renders totals row when totals prop is passed', () => {
    const totals: BattingTableTotals = {
      runs: 195,
      wickets: 4,
      overs: {
        completed_overs: 20,
        balls: 0,
        total_legal_balls: 120,
      },
    };

    render(<BattingTable batters={[]} totals={totals} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('195/4')).toBeInTheDocument();
    expect(screen.getByText('(20.0 Overs)')).toBeInTheDocument();
  });

  it('applies custom className to the wrapper container', () => {
    const { container } = render(<BattingTable batters={[]} className="custom-test-class" />);
    expect(container.firstChild).toHaveClass('custom-test-class');
  });

  it('safely formats strike rate using computed numeric sr when strike_rate is undefined or null', () => {
    const batterWithNoSr: BatterScorecard = {
      player_id: 3,
      player_name: 'Test Batter',
      runs: 10,
      balls: 8,
      fours: 1,
      sixes: 0,
      strike_rate: undefined,
      is_out: false,
    };

    render(<BattingTable batters={[batterWithNoSr]} />);
    // With sr = Number(b.strike_rate) || 0, 0.toFixed(1) produces "0.0" without throwing
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('applies sticky left-0 styling to batter header and cells for mobile horizontal scrolling', () => {
    const batter: BatterScorecard = {
      player_id: 1,
      player_name: 'Rohit Sharma',
      runs: 50,
      balls: 30,
      fours: 5,
      sixes: 2,
      strike_rate: 166.7,
      is_out: false,
    };

    const { container } = render(<BattingTable batters={[batter]} />);
    const th = container.querySelector('th');
    expect(th).toHaveClass('sticky', 'left-0', 'bg-[#161b22]', 'z-10');

    const td = container.querySelector('tbody td');
    expect(td).toHaveClass('sticky', 'left-0', 'bg-[#161b22]', 'z-10');
  });
});

