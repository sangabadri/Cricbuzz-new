import React from 'react';
import { Link } from 'react-router-dom';
import type { Match } from '../../../types/cricket';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { getTeamIdentity } from '../../../utils/teamColors';

export interface MatchCardProps {
  match: Match;
  featured?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, featured = false }) => {
  const isLive = match.status === 'live' || match.status === 'innings_break';
  const teamAName = match.team_a_name || `Team ${match.team_a}`;
  const teamBName = match.team_b_name || `Team ${match.team_b}`;
  const teamAIdentity = getTeamIdentity(teamAName, match.team_a);
  const teamBIdentity = getTeamIdentity(teamBName, match.team_b);
  const totalOvers = match.format === 't20' ? 20 : 50;

  let resultText = 'Scheduled';
  if (match.status === 'completed' && match.winner) {
    const winnerName = match.winner === match.team_a ? teamAName : teamBName;
    resultText = `${winnerName} won`;
    if (match.win_margin_runs) resultText += ` by ${match.win_margin_runs} runs`;
    else if (match.win_margin_wickets) resultText += ` by ${match.win_margin_wickets} wickets`;
  } else if (match.status === 'completed') {
    resultText = 'Match Tied';
  } else if (match.status === 'abandoned') {
    resultText = 'Match Abandoned';
  } else if (match.status === 'innings_break') {
    resultText = 'Innings Break';
  } else if (match.status === 'live') {
    resultText = 'Live in progress';
  } else if (match.toss_decision) {
    const tossWinnerName = match.toss_winner === match.team_a ? teamAName : teamBName;
    resultText = `${tossWinnerName} elected to ${match.toss_decision}`;
  }

  return (
    <div
      className={`group relative bg-[#161b22] border rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-black/50 ${
        isLive
          ? 'border-rose-500/40 hover:border-rose-500/70 shadow-rose-950/20'
          : 'border-[#30363d] hover:border-slate-500'
      } ${featured ? 'ring-1 ring-blue-500/30' : ''}`}
    >
      {/* Card Header: Format, Overs, Status */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#21262d]">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-black text-slate-300 uppercase tracking-wider">
            {match.format.toUpperCase()}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-semibold">{totalOvers} OVERS</span>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {/* Team Lines */}
      <div className="py-4 space-y-3">
        {/* Team A */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] ${teamAIdentity.badgeBg} border ${teamAIdentity.borderBadge} ${teamAIdentity.textColor} shadow-sm`}
            >
              {teamAIdentity.shortCode}
            </span>
            <span className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors">
              {teamAName}
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-slate-400">ID #{match.team_a}</span>
        </div>

        {/* Team B */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] ${teamBIdentity.badgeBg} border ${teamBIdentity.borderBadge} ${teamBIdentity.textColor} shadow-sm`}
            >
              {teamBIdentity.shortCode}
            </span>
            <span className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors">
              {teamBName}
            </span>
          </div>
          <span className="font-mono font-bold text-xs text-slate-400">ID #{match.team_b}</span>
        </div>
      </div>

      {/* Status Note or Result */}
      <div className="pt-3 border-t border-[#21262d] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-slate-400 font-medium truncate max-w-xs">{resultText}</p>

        {/* Card Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/matches/${match.id}`}>
            <Button variant="secondary" size="sm">
              Match Center
            </Button>
          </Link>

          <Link to={`/matches/${match.id}/score`}>
            <Button variant={isLive ? 'destructive' : 'outline'} size="sm">
              Score
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
