import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ScorerLayout } from '../layouts/ScorerLayout';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { RouteLoadingFallback } from '../../components/common/RouteLoadingFallback';

// Public Feature Pages (Code-split with React.lazy)
const HomePage = React.lazy(() => import('../../features/home/pages/HomePage').then((m) => ({ default: m.HomePage })));
const MatchesListPage = React.lazy(() => import('../../features/matches/pages/MatchesListPage').then((m) => ({ default: m.MatchesListPage })));
const MatchDetailPage = React.lazy(() => import('../../features/matches/pages/MatchDetailPage').then((m) => ({ default: m.MatchDetailPage })));
const TeamsListPage = React.lazy(() => import('../../features/teams/pages/TeamsListPage').then((m) => ({ default: m.TeamsListPage })));
const TeamDetailPage = React.lazy(() => import('../../features/teams/pages/TeamDetailPage').then((m) => ({ default: m.TeamDetailPage })));
const PlayersListPage = React.lazy(() => import('../../features/players/pages/PlayersListPage').then((m) => ({ default: m.PlayersListPage })));
const PlayerDetailPage = React.lazy(() => import('../../features/players/pages/PlayerDetailPage').then((m) => ({ default: m.PlayerDetailPage })));
const MatchSetupPage = React.lazy(() => import('../../features/match-management/pages/MatchSetupPage').then((m) => ({ default: m.MatchSetupPage })));
const LoginPage = React.lazy(() => import('../../features/authentication/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('../../features/authentication/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));

// Dashboard / Management Pages (Code-split with React.lazy)
const DashboardOverviewPage = React.lazy(() => import('../../features/dashboard/pages/DashboardOverviewPage').then((m) => ({ default: m.DashboardOverviewPage })));
const AdminMatchesPage = React.lazy(() => import('../../features/dashboard/pages/AdminMatchesPage').then((m) => ({ default: m.AdminMatchesPage })));
const AdminTeamsPage = React.lazy(() => import('../../features/dashboard/pages/AdminTeamsPage').then((m) => ({ default: m.AdminTeamsPage })));
const AdminPlayersPage = React.lazy(() => import('../../features/dashboard/pages/AdminPlayersPage').then((m) => ({ default: m.AdminPlayersPage })));
const ScheduleMatchPage = React.lazy(() => import('../../features/match-management/pages/ScheduleMatchPage').then((m) => ({ default: m.ScheduleMatchPage })));
const CreateTeamPage = React.lazy(() => import('../../features/teams/pages/CreateTeamPage').then((m) => ({ default: m.CreateTeamPage })));
const CreatePlayerPage = React.lazy(() => import('../../features/players/pages/CreatePlayerPage').then((m) => ({ default: m.CreatePlayerPage })));

// Scoring Page (Code-split with React.lazy)
const ScorerConsolePage = React.lazy(() => import('../../features/scoring/pages/ScorerConsolePage').then((m) => ({ default: m.ScorerConsolePage })));

// Auth Guard
import { ProtectedRoute } from './ProtectedRoute';

const withSuspense = (Component: React.ComponentType, fallbackTitle: string, key: string) => (
  <ErrorBoundary key={key} fallbackTitle={fallbackTitle}>
    <React.Suspense fallback={<RouteLoadingFallback />}>
      <Component />
    </React.Suspense>
  </ErrorBoundary>
);

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Cricket Experience */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={withSuspense(HomePage, 'Home Feed Error', 'home')} />
        <Route path="/matches" element={withSuspense(MatchesListPage, 'Match Fixtures Error', 'matches')} />
        <Route path="/matches/:id" element={withSuspense(MatchDetailPage, 'Match Center Error', 'match-detail')} />
        <Route path="/teams" element={withSuspense(TeamsListPage, 'Teams Directory Error', 'teams')} />
        <Route path="/teams/:id" element={withSuspense(TeamDetailPage, 'Team Profile Error', 'team-detail')} />
        <Route path="/players" element={withSuspense(PlayersListPage, 'Players Directory Error', 'players')} />
        <Route path="/players/:id" element={withSuspense(PlayerDetailPage, 'Player Profile Error', 'player-detail')} />
        <Route path="/setup" element={withSuspense(MatchSetupPage, 'Setup Wizard Error', 'setup')} />
        <Route path="/login" element={withSuspense(LoginPage, 'Login Error', 'login')} />
        <Route path="/register" element={withSuspense(RegisterPage, 'Registration Error', 'register')} />
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
        <Route index element={withSuspense(DashboardOverviewPage, 'Dashboard Error', 'dashboard-overview')} />
        <Route path="matches" element={withSuspense(AdminMatchesPage, 'Matches Management Error', 'dashboard-matches')} />
        <Route path="matches/new" element={withSuspense(ScheduleMatchPage, 'Schedule Match Error', 'dashboard-matches-new')} />
        <Route path="setup" element={withSuspense(MatchSetupPage, 'Setup & Toss Error', 'dashboard-setup')} />
        <Route path="teams" element={withSuspense(AdminTeamsPage, 'Teams Management Error', 'dashboard-teams')} />
        <Route path="teams/new" element={withSuspense(CreateTeamPage, 'Create Team Error', 'dashboard-teams-new')} />
        <Route path="players" element={withSuspense(AdminPlayersPage, 'Players Management Error', 'dashboard-players')} />
        <Route path="players/new" element={withSuspense(CreatePlayerPage, 'Add Player Error', 'dashboard-players-new')} />
      </Route>

      {/* 3. Live Scorer Workspace */}
      <Route element={<ScorerLayout />}>
        <Route path="/matches/:id/score" element={withSuspense(ScorerConsolePage, 'Scorer Console Error', 'scorer')} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
