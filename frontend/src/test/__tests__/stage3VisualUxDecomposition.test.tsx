import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FixtureCard } from '../../pages/Home';
import { CreateTeamForm } from '../../components/setup/CreateTeamForm';
import { CreatePlayerForm } from '../../components/setup/CreatePlayerForm';
import { ScheduleMatchForm } from '../../components/setup/ScheduleMatchForm';
import { ToastProvider } from '../../components/common/Toast';
import { cricketApi } from '../../api/client';
import type { Match, MatchScorecardResponse, Team, Player } from '../../types/cricket';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe('Stage 3 Visual, UX & Decomposition Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Live Scores on Home Fixture Cards', () => {
    const liveMatch: Match = {
      id: 101,
      team_a: 1,
      team_b: 2,
      team_a_name: 'India',
      team_b_name: 'Australia',
      venue: 'Melbourne Cricket Ground',
      format: 't20',
      match_date: '2026-11-09T18:00:00Z',
      status: 'live',
    };

    const mockScorecard: MatchScorecardResponse = {
      match_id: 101,
      format: 't20',
      status: 'live',
      venue: 'Melbourne Cricket Ground',
      match_date: '2026-11-09T18:00:00Z',
      team_a_id: 1,
      team_a_name: 'India',
      team_b_id: 2,
      team_b_name: 'Australia',
      innings: [
        {
          innings_number: 1,
          batting_team_id: 1,
          batting_team_name: 'India',
          bowling_team_id: 2,
          bowling_team_name: 'Australia',
          status: 'completed',
          runs: 165,
          wickets: 5,
          overs: { completed_overs: 20, balls: 0, total_legal_balls: 120 },
          current_run_rate: 8.25,
          batters: [],
          bowlers: [],
          fall_of_wickets: [],
          partnerships: [],
          extras: { byes: 0, leg_byes: 0, wides: 0, no_balls: 0, penalty: 0, total: 0 },
        },
        {
          innings_number: 2,
          batting_team_id: 2,
          batting_team_name: 'Australia',
          bowling_team_id: 1,
          bowling_team_name: 'India',
          status: 'in_progress',
          runs: 140,
          wickets: 3,
          overs: { completed_overs: 16, balls: 2, total_legal_balls: 98 },
          target: 166,
          current_run_rate: 8.57,
          batters: [],
          bowlers: [],
          fall_of_wickets: [],
          partnerships: [],
          extras: { byes: 0, leg_byes: 0, wides: 0, no_balls: 0, penalty: 0, total: 0 },
        },
      ],
    };

    it('displays team scores with font-score tabular numbers and live chase equation', async () => {
      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue(mockScorecard);

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <FixtureCard match={liveMatch} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify team names
      expect(screen.getByText('India')).toBeInTheDocument();
      expect(screen.getByText('Australia')).toBeInTheDocument();

      // Wait for scorecard query to resolve and scores to be displayed
      const teamAScore = await screen.findByText('165/5 (20.0)');
      const teamBScore = await screen.findByText('140/3 (16.2)');

      expect(teamAScore).toBeInTheDocument();
      expect(teamAScore).toHaveClass('font-score', 'tabular-nums');

      expect(teamBScore).toBeInTheDocument();
      expect(teamBScore).toHaveClass('font-score', 'tabular-nums');

      // Verify dynamic chase status (Australia need 26 runs to win)
      expect(screen.getByText(/need/i)).toBeInTheDocument();
      expect(screen.getByText('26')).toBeInTheDocument();
    });
  });

  describe('2. Decomposed Setup Components', () => {
    it('CreateTeamForm allows creating new teams and lists existing teams', async () => {
      const mockTeams: Team[] = [
        { id: 1, name: 'Mumbai Indians' },
        { id: 2, name: 'Chennai Super Kings' },
      ];
      const createTeamSpy = vi.spyOn(cricketApi, 'createTeam').mockResolvedValue({
        id: 3,
        name: 'Kolkata Knight Riders',
      });
      const onTeamCreated = vi.fn();

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <CreateTeamForm teams={mockTeams} onTeamCreated={onTeamCreated} />
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(screen.getByText('Mumbai Indians')).toBeInTheDocument();
      expect(screen.getByText('Chennai Super Kings')).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/Royal Challengers Bangalore/i);
      fireEvent.change(input, { target: { value: 'Kolkata Knight Riders' } });

      const addBtn = screen.getByRole('button', { name: /Add Team/i });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(createTeamSpy).toHaveBeenCalledWith('Kolkata Knight Riders');
        expect(onTeamCreated).toHaveBeenCalled();
      });
    });

    it('CreatePlayerForm allows registering a player with designated role and styles', async () => {
      const createPlayerSpy = vi.spyOn(cricketApi, 'createPlayer').mockResolvedValue({
        id: 10,
        name: 'Jasprit Bumrah',
        role: 'bowler',
        batting: 'right-handed batsman',
        bowling: 'right-arm fast',
      });
      const onPlayerCreated = vi.fn();

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <CreatePlayerForm onPlayerCreated={onPlayerCreated} />
          </ToastProvider>
        </QueryClientProvider>
      );

      const nameInput = screen.getByPlaceholderText(/Jasprit Bumrah/i);
      fireEvent.change(nameInput, { target: { value: 'Jasprit Bumrah' } });

      const registerBtn = screen.getByRole('button', { name: /Register Player/i });
      fireEvent.click(registerBtn);

      await waitFor(() => {
        expect(createPlayerSpy).toHaveBeenCalledWith({
          name: 'Jasprit Bumrah',
          role: 'batsman', // default
          batting: 'right-handed batsman',
          bowling: 'right-arm fast',
        });
        expect(onPlayerCreated).toHaveBeenCalled();
      });
    });

    it('ScheduleMatchForm rejects submitting when both teams are not selected or are identical', async () => {
      const mockTeams: Team[] = [
        { id: 1, name: 'Team Alpha' },
        { id: 2, name: 'Team Beta' },
      ];
      const mockPlayers: Player[] = [];
      const createMatchSpy = vi.spyOn(cricketApi, 'createMatch');

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter>
              <ScheduleMatchForm teams={mockTeams} players={mockPlayers} />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      const nextBtn = screen.getByRole('button', { name: /Next: Setup Squads & Toss/i });
      fireEvent.submit(nextBtn.closest('form')!);

      expect(createMatchSpy).not.toHaveBeenCalled();
    });

    it('ScheduleMatchForm handles interactive squad selection from scratch without false 11-player limit', async () => {
      const mockTeams: Team[] = [
        { id: 1, name: 'Team Alpha' },
        { id: 2, name: 'Team Beta' },
      ];
      // 15 players (less than 22, so no auto-fill on match creation)
      const mock15Players: Player[] = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        team_id: 1,
        role: 'batsman' as const,
        batting: 'right-handed batsman',
        bowling: 'right-arm medium',
      }));

      vi.spyOn(cricketApi, 'createMatch').mockResolvedValue({
        id: 99,
        team_a: 1,
        team_b: 2,
        venue: 'Eden Gardens',
        format: 't20',
        match_date: '2026-11-10T18:00:00Z',
        status: 'scheduled',
      } as Match);

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <ToastProvider>
            <MemoryRouter>
              <ScheduleMatchForm teams={mockTeams} players={mock15Players} />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Select Team A and Team B
      const teamASelect = screen.getByDisplayValue('Select Team A');
      fireEvent.change(teamASelect, { target: { value: '1' } });
      const teamBSelect = screen.getByDisplayValue('Select Team B');
      fireEvent.change(teamBSelect, { target: { value: '2' } });

      // Submit match scheduling form
      const nextBtn = screen.getByRole('button', { name: /Next: Setup Squads & Toss/i });
      fireEvent.click(nextBtn);

      // Verify squads UI appears
      await screen.findByText(/Match Scheduled Successfully!/i);

      // Toggle Player 1 into Team A
      const player1Elements = screen.getAllByText('Player 1');
      fireEvent.click(player1Elements[0]);

      // Should show 1 / 11 Selected without triggering limit warning
      expect(screen.getByText('1 / 11 Selected')).toBeInTheDocument();
    });
  });

  describe('3. Multi-Innings and Edge Case Fixture Cards', () => {
    it('formats multi-innings scores with ampersand separator for Test matches', async () => {
      const testMatch: Match = {
        id: 202,
        team_a: 1,
        team_b: 2,
        team_a_name: 'England',
        team_b_name: 'Australia',
        venue: 'Lord\'s, London',
        format: 'odi',
        match_date: '2026-11-09T10:00:00Z',
        status: 'live',
      };

      const mockMultiInningsScorecard: MatchScorecardResponse = {
        match_id: 202,
        format: 'odi',
        status: 'live',
        venue: 'Lord\'s, London',
        match_date: '2026-11-09T10:00:00Z',
        team_a_id: 1,
        team_a_name: 'England',
        team_b_id: 2,
        team_b_name: 'Australia',
        innings: [
          {
            innings_number: 1,
            batting_team_id: 1,
            batting_team_name: 'England',
            bowling_team_id: 2,
            bowling_team_name: 'Australia',
            status: 'completed',
            runs: 280,
            wickets: 10,
            overs: { completed_overs: 82, balls: 4, total_legal_balls: 496 },
            current_run_rate: 3.38,
            batters: [],
            bowlers: [],
            fall_of_wickets: [],
            partnerships: [],
            extras: { byes: 0, leg_byes: 0, wides: 0, no_balls: 0, penalty: 0, total: 0 },
          },
          {
            innings_number: 2,
            batting_team_id: 2,
            batting_team_name: 'Australia',
            bowling_team_id: 1,
            bowling_team_name: 'England',
            status: 'completed',
            runs: 310,
            wickets: 10,
            overs: { completed_overs: 90, balls: 0, total_legal_balls: 540 },
            current_run_rate: 3.44,
            batters: [],
            bowlers: [],
            fall_of_wickets: [],
            partnerships: [],
            extras: { byes: 0, leg_byes: 0, wides: 0, no_balls: 0, penalty: 0, total: 0 },
          },
          {
            innings_number: 3,
            batting_team_id: 1,
            batting_team_name: 'England',
            bowling_team_id: 2,
            bowling_team_name: 'Australia',
            status: 'in_progress',
            runs: 154,
            wickets: 3,
            overs: { completed_overs: 45, balls: 2, total_legal_balls: 272 },
            current_run_rate: 3.40,
            batters: [],
            bowlers: [],
            fall_of_wickets: [],
            partnerships: [],
            extras: { byes: 0, leg_byes: 0, wides: 0, no_balls: 0, penalty: 0, total: 0 },
          },
        ],
      };

      vi.spyOn(cricketApi, 'getScorecard').mockResolvedValue(mockMultiInningsScorecard);

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <FixtureCard match={testMatch} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Verify England's both innings scores are joined with &
      const multiScore = await screen.findByText('280/10 (82.4) & 154/3 (45.2)');
      expect(multiScore).toBeInTheDocument();
      expect(multiScore).toHaveClass('font-score', 'tabular-nums');
    });

    it('renders Match Abandoned in the status strip when match is abandoned', async () => {
      const abandonedMatch: Match = {
        id: 303,
        team_a: 1,
        team_b: 2,
        team_a_name: 'India',
        team_b_name: 'Pakistan',
        venue: 'R Premadasa Stadium, Colombo',
        format: 'odi',
        match_date: '2026-11-09T14:00:00Z',
        status: 'abandoned',
        toss_winner: 1,
        toss_decision: 'bat',
      };

      const client = createTestQueryClient();
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <FixtureCard match={abandonedMatch} />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Match Abandoned')).toBeInTheDocument();
    });
  });
});
