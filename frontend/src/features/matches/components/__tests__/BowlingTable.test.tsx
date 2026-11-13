import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { BowlerScorecard } from '../../../types/cricket';
import { BowlingTable } from '../BowlingTable';

describe('BowlingTable Component', () => {
  it('renders empty state when bowlers array is empty', () => {
    render(<BowlingTable bowlers={[]} />);
    expect(screen.getByText('No bowling data available')).toBeInTheDocument();
  });

  it('renders bowler figures accurately', () => {
    const bowler: BowlerScorecard = {
      player_id: 1,
      player_name: 'Jasprit Bumrah',
      overs: {
        completed_overs: 4,
        balls: 0,
        total_legal_balls: 24,
      },
      maidens: 2,
      runs: 14,
      wickets: 3,
      economy: 3.5,
      wides: 1,
      no_balls: 0,
    };

    render(<BowlingTable bowlers={[bowler]} />);

    expect(screen.getByText('Jasprit Bumrah')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument(); // overs
    expect(screen.getByText('2')).toBeInTheDocument(); // maidens
    expect(screen.getByText('14')).toBeInTheDocument(); // runs
    expect(screen.getByText('3')).toBeInTheDocument(); // wickets
    expect(screen.getByText('3.50')).toBeInTheDocument(); // economy formatted
    expect(screen.getByText('1')).toBeInTheDocument(); // wides
    expect(screen.getByText('0')).toBeInTheDocument(); // no balls
  });

  it('formats partial overs accurately', () => {
    const bowler: BowlerScorecard = {
      player_id: 2,
      player_name: 'Mohammed Shami',
      overs: {
        completed_overs: 3,
        balls: 4,
        total_legal_balls: 22,
      },
      maidens: 0,
      runs: 28,
      wickets: 2,
      economy: 7.64,
      wides: 2,
      no_balls: 0,
    };

    render(<BowlingTable bowlers={[bowler]} />);
    expect(screen.getByText('3.4')).toBeInTheDocument();
  });

  it('handles missing overs safely by defaulting to 0.0', () => {
    const bowler = {
      player_id: 3,
      player_name: 'Part-time Bowler',
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      no_balls: 0,
    } as unknown as BowlerScorecard;

    render(<BowlingTable bowlers={[bowler]} />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('formats economy dash and slate-300 color when economy is 0 or nullish', () => {
    const bowlerWithZeroEcon: BowlerScorecard = {
      player_id: 4,
      player_name: 'New Bowler',
      overs: { completed_overs: 0, balls: 0, total_legal_balls: 0 },
      maidens: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      wides: 0,
      no_balls: 0,
    };

    render(<BowlingTable bowlers={[bowlerWithZeroEcon]} />);
    const dashElement = screen.getByText('-');
    expect(dashElement).toBeInTheDocument();
    expect(dashElement).toHaveClass('text-slate-300');
  });

  it('applies economy rate threshold color classes correctly', () => {
    const bowlers: BowlerScorecard[] = [
      {
        player_id: 1,
        player_name: 'Economical Bowler',
        overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
        maidens: 1,
        runs: 20,
        wickets: 2,
        economy: 5.0, // <= 6.0: text-emerald-400 font-bold
        wides: 0,
        no_balls: 0,
      },
      {
        player_id: 2,
        player_name: 'Standard Bowler',
        overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
        maidens: 0,
        runs: 30,
        wickets: 1,
        economy: 7.5, // > 6.0 && <= 8.5: text-sky-400
        wides: 0,
        no_balls: 0,
      },
      {
        player_id: 3,
        player_name: 'Expensive Bowler',
        overs: { completed_overs: 2, balls: 0, total_legal_balls: 12 },
        maidens: 0,
        runs: 26,
        wickets: 0,
        economy: 13.0, // > 11.0: text-amber-400/90
        wides: 0,
        no_balls: 0,
      },
      {
        player_id: 4,
        player_name: 'Moderate Bowler',
        overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
        maidens: 0,
        runs: 38,
        wickets: 0,
        economy: 9.5, // 8.5 < econ <= 11.0: text-slate-300
        wides: 0,
        no_balls: 0,
      },
    ];

    render(<BowlingTable bowlers={bowlers} />);

    expect(screen.getByText('5.00')).toHaveClass('text-emerald-400', 'font-bold');
    expect(screen.getByText('7.50')).toHaveClass('text-sky-400');
    expect(screen.getByText('13.00')).toHaveClass('text-amber-400/90');
    expect(screen.getByText('9.50')).toHaveClass('text-slate-300');
  });

  it('applies custom className to the wrapper container', () => {
    const { container } = render(<BowlingTable bowlers={[]} className="bowling-table-custom" />);
    expect(container.firstChild).toHaveClass('bowling-table-custom');
  });

  it('applies sticky left-0 styling to bowler header and cells for mobile horizontal scrolling', () => {
    const bowler: BowlerScorecard = {
      player_id: 1,
      player_name: 'Jasprit Bumrah',
      overs: { completed_overs: 4, balls: 0, total_legal_balls: 24 },
      maidens: 1,
      runs: 14,
      wickets: 2,
      economy: 3.5,
      wides: 0,
      no_balls: 0,
    };

    const { container } = render(<BowlingTable bowlers={[bowler]} />);
    const th = container.querySelector('th');
    expect(th).toHaveClass('sticky', 'left-0', 'bg-[#161b22]', 'z-10');

    const td = container.querySelector('tbody td');
    expect(td).toHaveClass('sticky', 'left-0', 'bg-[#161b22]', 'z-10');
  });
});

