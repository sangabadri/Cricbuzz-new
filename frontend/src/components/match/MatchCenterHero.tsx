import React from 'react';
import {
  Award,
  Clock,
  Flame,
  MapPin,
  Trophy,
} from 'lucide-react';
import type { LiveMatchResponse, MatchScorecardResponse } from '../../types/cricket';
import { BallBubble } from '../common/BallBubble';
import { StatusBadge } from '../common/StatusBadge';
import { getTeamIdentity } from '../../utils/teamColors';

export interface MatchCenterHeroProps {
  ticker: LiveMatchResponse;
  scorecard?: MatchScorecardResponse | null;
  className?: string;
}

export const MatchCenterHero: React.FC<MatchCenterHeroProps> = ({
  ticker,
  scorecard,
  className = '',
}) => {
  const teamAInfo = getTeamIdentity(ticker.team_a_name);
  const teamBInfo = getTeamIdentity(ticker.team_b_name);

  return (
    <div
      className={`bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 shadow-xl relative overflow-hidden ${className}`.trim()}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-[#21262d] pb-5">
        {/* Match & Teams Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#21262d] text-sky-400 border border-[#30363d]">
              {ticker.format.toUpperCase()}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {ticker.venue}
            </span>
            <StatusBadge status={ticker.status} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            {/* Team A Badge */}
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${teamAInfo.badgeBg} border ${teamAInfo.borderBadge}`} />
              <span className="text-xl lg:text-2xl font-black text-white">{ticker.team_a_name}</span>
              <span className="text-xs font-mono font-bold text-slate-400">({teamAInfo.shortCode})</span>
            </div>

            <span className="text-slate-500 text-sm font-bold uppercase">vs</span>

            {/* Team B Badge */}
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${teamBInfo.badgeBg} border ${teamBInfo.borderBadge}`} />
              <span className="text-xl lg:text-2xl font-black text-white">{ticker.team_b_name}</span>
              <span className="text-xs font-mono font-bold text-slate-400">({teamBInfo.shortCode})</span>
            </div>
          </div>
        </div>

        {/* Current Score Bug */}
        <div className="flex items-baseline gap-4 bg-[#12161f] px-5 py-3 rounded-xl border border-[#21262d]">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
              {ticker.batting_team_name ? `${ticker.batting_team_name} Batting` : 'Active Innings'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-score text-4xl lg:text-5xl font-black text-white tabular-nums tracking-tight">
                {ticker.runs}
                <span className="text-slate-500 text-3xl font-normal">/</span>
                {ticker.wickets}
              </span>
              <span className="font-score text-base lg:text-lg font-bold text-slate-400 tabular-nums">
                ({ticker.overs.completed_overs}.{ticker.overs.balls} ov)
              </span>
            </div>
          </div>

          <div className="border-l border-[#21262d] pl-4 space-y-1">
            <div className="text-xs text-slate-400">
              CRR: <strong className="text-sky-400 font-mono">{ticker.current_run_rate?.toFixed(2) ?? '0.00'}</strong>
            </div>
            {ticker.target && (
              <div className="text-xs text-amber-400 font-bold">
                Target: <strong className="font-mono">{ticker.target}</strong>
              </div>
            )}
            {ticker.required_run_rate && (
              <div className="text-xs text-rose-400">
                RRR: <strong className="font-mono">{ticker.required_run_rate.toFixed(2)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Persistent Live Current Over Ribbon */}
      <div className="pt-3 pb-2 border-b border-[#21262d]/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Live Current Over:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {ticker.current_over_balls.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Starting new over...</span>
            ) : (
              ticker.current_over_balls.map((b, idx) => (
                <BallBubble key={idx} ball={b} size="sm" />
              ))
            )}
          </div>
        </div>
        {ticker.current_bowler && (
          <div className="text-[11px] text-slate-400 font-mono">
            Bowler: <strong className="text-white font-mono">{ticker.current_bowler.name}</strong>{' '}
            ({ticker.current_bowler.wickets}/{ticker.current_bowler.runs})
          </div>
        )}
      </div>

      {/* Chase Equation or Status Summary */}
      <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {ticker.status === 'live' && ticker.target ? (
          <div className="text-amber-400 font-bold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>
              {ticker.batting_team_name} need {ticker.runs_needed} runs from {ticker.balls_remaining} balls
            </span>
          </div>
        ) : ticker.status === 'completed' && scorecard?.winner_name ? (
          <div className="text-emerald-400 font-extrabold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>{scorecard.winner_name} won the match!</span>
          </div>
        ) : ticker.status === 'innings_break' ? (
          <div className="text-amber-400 font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Innings 1 Completed. Innings Break in progress.</span>
          </div>
        ) : (
          <div className="text-slate-400">
            Innings {ticker.current_innings_number || 1} • {ticker.batting_team_name} batting
          </div>
        )}

        {scorecard?.mom_name && (
          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-2.5 py-0.5 rounded-full text-xs font-bold">
            <Award className="w-3 h-3 text-yellow-400" />
            Player of the Match: {scorecard.mom_name}
          </div>
        )}
      </div>
    </div>
  );
};
