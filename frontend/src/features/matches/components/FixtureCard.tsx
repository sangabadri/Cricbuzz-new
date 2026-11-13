import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  MapPin,
  PlayCircle,
  Trophy,
} from 'lucide-react';
import { cricketApi } from '../../../lib/api/client';
import type { Match } from '../../../types/cricket';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { getTeamIdentity } from '../../../utils/teamColors';

export interface FixtureCardProps {
  match: Match;
}

export const FixtureCard: React.FC<FixtureCardProps> = ({ match }) => {
  const teamAName = match.team_a_name || `Team ${match.team_a}`;
  const teamBName = match.team_b_name || `Team ${match.team_b}`;
  const teamAIdentity = getTeamIdentity(teamAName, match.team_a);
  const teamBIdentity = getTeamIdentity(teamBName, match.team_b);

  const isScorecardEligible =
    match.status === 'live' ||
    match.status === 'innings_break' ||
    match.status === 'completed' ||
    match.status === 'abandoned';

  const { data: scorecard } = useQuery({
    queryKey: ['match-scorecard', match.id],
    queryFn: () => cricketApi.getScorecard(match.id),
    enabled: isScorecardEligible,
    refetchInterval: match.status === 'live' ? 4000 : undefined,
  });

  const formatTeamScores = (teamId: number) => {
    const teamInnings = scorecard?.innings?.filter((i) => i.batting_team_id === teamId);
    if (!teamInnings || teamInnings.length === 0) return null;
    return teamInnings
      .map((inn) => {
        const oversStr = `${inn.overs?.completed_overs ?? 0}.${inn.overs?.balls ?? 0}`;
        return `${inn.runs}/${inn.wickets} (${oversStr})`;
      })
      .join(' & ');
  };

  const scoreA = formatTeamScores(match.team_a);
  const scoreB = formatTeamScores(match.team_b);

  const activeInn =
    scorecard?.innings?.find((i) => i.status === 'in_progress') ||
    scorecard?.innings?.[scorecard.innings.length - 1];

  return (
    <div className="flex flex-col justify-between bg-[#161b22] rounded-2xl border border-[#21262d] hover:border-[#388bfd]/60 shadow-md hover:shadow-black/50 transition-all group overflow-hidden">
      {/* Card Header: Format, Venue, Status */}
      <div className="p-4 pb-3 border-b border-[#21262d] bg-[#12161f]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#21262d] text-sky-400 border border-[#30363d]">
            {match.format.toUpperCase()}
          </span>
          <StatusBadge status={match.status} />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate">{match.venue}</span>
        </div>
      </div>

      {/* Teams & Scoreboard Preview */}
      <div className="p-4 space-y-3">
        <div className="space-y-2.5">
          {/* Team A Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] ${teamAIdentity.badgeBg} border ${teamAIdentity.borderBadge} ${teamAIdentity.textColor}`}
              >
                {teamAIdentity.shortCode}
              </span>
              <span className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">
                {teamAName}
              </span>
            </div>
            {scoreA && (
              <span className="font-score font-bold text-sm text-white tabular-nums">
                {scoreA}
              </span>
            )}
          </div>

          {/* Team B Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] ${teamBIdentity.badgeBg} border ${teamBIdentity.borderBadge} ${teamBIdentity.textColor}`}
              >
                {teamBIdentity.shortCode}
              </span>
              <span className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">
                {teamBName}
              </span>
            </div>
            {scoreB && (
              <span className="font-score font-bold text-sm text-white tabular-nums">
                {scoreB}
              </span>
            )}
          </div>
        </div>

        {/* Toss or Win Result Strip */}
        <div className="text-[11px] font-medium text-slate-400 pt-2 border-t border-[#21262d] min-h-[1.75rem] flex items-center">
          {match.status === 'completed' && match.winner ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              {match.winner === match.team_a ? teamAName : teamBName} won
              {match.win_margin_runs
                ? ` by ${match.win_margin_runs} runs`
                : match.win_margin_wickets
                ? ` by ${match.win_margin_wickets} wickets`
                : ''}
            </span>
          ) : match.status === 'completed' ? (
            <span className="text-amber-400 font-bold">Match Tied</span>
          ) : match.status === 'abandoned' ? (
            <span className="text-rose-400 font-bold">Match Abandoned</span>
          ) : match.status === 'innings_break' ? (
            <span className="text-amber-400 font-bold font-score tabular-nums flex items-center gap-1.5">
              <span>Innings Break</span>
              {scorecard?.innings?.[0]?.runs !== undefined && (
                <span>• Target: {scorecard.innings[0].runs + 1}</span>
              )}
            </span>
          ) : match.status === 'live' ? (
            <span className="text-[#38bdf8] font-bold flex items-center gap-1 font-score tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ea0029] animate-pulse" />
              {activeInn?.target ? (
                <span>
                  {activeInn.batting_team_name} need{' '}
                  <strong className="text-white">
                    {Math.max(0, activeInn.target - activeInn.runs)}
                  </strong>{' '}
                  runs to win
                </span>
              ) : activeInn ? (
                <span>
                  {activeInn.batting_team_name} batting • CRR:{' '}
                  {activeInn.current_run_rate !== undefined
                    ? activeInn.current_run_rate.toFixed(2)
                    : '0.00'}
                </span>
              ) : (
                <span>Live in progress • Innings live</span>
              )}
            </span>
          ) : match.toss_winner ? (
            <span className="truncate">
              Toss:{' '}
              <strong className="text-white">
                {match.toss_winner === match.team_a ? teamAName : teamBName}
              </strong>{' '}
              chose to {match.toss_decision}
            </span>
          ) : (
            <span className="text-slate-500">Toss scheduled</span>
          )}
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="p-3 bg-[#12161f] border-t border-[#21262d] grid grid-cols-2 gap-2">
        <Link
          to={`/matches/${match.id}`}
          className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-slate-300 hover:text-white bg-[#21262d] hover:bg-[#30363d] rounded-lg transition-colors border border-[#30363d]"
        >
          <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
          Match Center
        </Link>

        <Link
          to={`/matches/${match.id}/score`}
          className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-white bg-[#0070f3] hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
        >
          <Activity className="w-3.5 h-3.5" />
          Scorer Pad
        </Link>
      </div>
    </div>
  );
};
