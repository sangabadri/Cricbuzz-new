import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ScorerLayout } from '../layouts/ScorerLayout';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// Public Feature Pages
import { HomePage } from '../../features/home/pages/HomePage';
import { MatchesListPage } from '../../features/matches/pages/MatchesListPage';
import { MatchDetailPage } from '../../features/matches/pages/MatchDetailPage';
import { TeamsListPage } from '../../features/teams/pages/TeamsListPage';
import { TeamDetailPage } from '../../features/teams/pages/TeamDetailPage';
import { PlayersListPage } from '../../features/players/pages/PlayersListPage';
import { PlayerDetailPage } from '../../features/players/pages/PlayerDetailPage';

// Dashboard / Management Pages
import { DashboardOverviewPage } from '../../features/dashboard/pages/DashboardOverviewPage';
import { AdminMatchesPage } from '../../features/dashboard/pages/AdminMatchesPage';
import { AdminTeamsPage } from '../../features/dashboard/pages/AdminTeamsPage';
import { AdminPlayersPage } from '../../features/dashboard/pages/AdminPlayersPage';
import { ScheduleMatchPage } from '../../features/match-management/pages/ScheduleMatchPage';
import { MatchSetupPage } from '../../features/match-management/pages/MatchSetupPage';
import { CreateTeamPage } from '../../features/teams/pages/CreateTeamPage';
import { CreatePlayerPage } from '../../features/players/pages/CreatePlayerPage';

// Scoring Page
import { ScorerConsolePage } from '../../features/scoring/pages/ScorerConsolePage';

// Auth Pages & Guards
import { LoginPage } from '../../features/authentication/pages/LoginPage';
import { RegisterPage } from '../../features/authentication/pages/RegisterPage';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Cricket Experience */}
      <Route element={<PublicLayout />}>
        <Route
          path="/"
          element={
            <ErrorBoundary key="home" fallbackTitle="Home Feed Error">
              <HomePage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/matches"
          element={
            <ErrorBoundary key="matches" fallbackTitle="Match Fixtures Error">
              <MatchesListPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/matches/:id"
          element={
            <ErrorBoundary key="match-detail" fallbackTitle="Match Center Error">
              <MatchDetailPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/teams"
          element={
            <ErrorBoundary key="teams" fallbackTitle="Teams Directory Error">
              <TeamsListPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/teams/:id"
          element={
            <ErrorBoundary key="team-detail" fallbackTitle="Team Profile Error">
              <TeamDetailPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/players"
          element={
            <ErrorBoundary key="players" fallbackTitle="Players Directory Error">
              <PlayersListPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/players/:id"
          element={
            <ErrorBoundary key="player-detail" fallbackTitle="Player Profile Error">
              <PlayerDetailPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/setup"
          element={
            <ErrorBoundary key="setup" fallbackTitle="Setup Wizard Error">
              <MatchSetupPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/login"
          element={
            <ErrorBoundary key="login" fallbackTitle="Login Error">
              <LoginPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/register"
          element={
            <ErrorBoundary key="register" fallbackTitle="Registration Error">
              <RegisterPage />
            </ErrorBoundary>
          }
        />
      </Route>

      {/* 2. Admin & Management Console Experience (Protected) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <ErrorBoundary key="dashboard-overview" fallbackTitle="Dashboard Error">
              <DashboardOverviewPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="matches"
          element={
            <ErrorBoundary key="dashboard-matches" fallbackTitle="Matches Management Error">
              <AdminMatchesPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="matches/new"
          element={
            <ErrorBoundary key="dashboard-matches-new" fallbackTitle="Schedule Match Error">
              <ScheduleMatchPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="setup"
          element={
            <ErrorBoundary key="dashboard-setup" fallbackTitle="Setup & Toss Error">
              <MatchSetupPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="teams"
          element={
            <ErrorBoundary key="dashboard-teams" fallbackTitle="Teams Management Error">
              <AdminTeamsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="teams/new"
          element={
            <ErrorBoundary key="dashboard-teams-new" fallbackTitle="Create Team Error">
              <CreateTeamPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="players"
          element={
            <ErrorBoundary key="dashboard-players" fallbackTitle="Players Management Error">
              <AdminPlayersPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="players/new"
          element={
            <ErrorBoundary key="dashboard-players-new" fallbackTitle="Add Player Error">
              <CreatePlayerPage />
            </ErrorBoundary>
          }
        />
      </Route>

      {/* 3. Live Scorer Workspace */}
      <Route element={<ScorerLayout />}>
        <Route
          path="/matches/:id/score"
          element={
            <ErrorBoundary key="scorer" fallbackTitle="Scorer Console Error">
              <ScorerConsolePage />
            </ErrorBoundary>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
