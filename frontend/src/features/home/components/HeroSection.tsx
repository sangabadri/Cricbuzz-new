import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronRight,
  Radio,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { Match } from '../../../types/cricket';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { getTeamIdentity } from '../../../utils/teamColors';

export interface HeroSectionProps {
  featuredMatch?: Match | null;
  onQuickSeed: () => void;
  isSeeding: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredMatch,
  onQuickSeed,
  isSeeding,
}) => {
  const teamAName = featuredMatch?.team_a_name || (featuredMatch ? `Team ${featuredMatch.team_a}` : 'Team A');
  const teamBName = featuredMatch?.team_b_name || (featuredMatch ? `Team ${featuredMatch.team_b}` : 'Team B');
  const teamAIdentity = getTeamIdentity(teamAName, featuredMatch?.team_a);
  const teamBIdentity = getTeamIdentity(teamBName, featuredMatch?.team_b);
  const totalOvers = featuredMatch?.format === 't20' ? 20 : 50;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#090d16] border border-[#21262d] shadow-2xl p-6 sm:p-8 lg:p-12 mb-10">
      {/* Background Accent Glows */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Heading, Subtext, Feature Highlights, CTAs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#ea0029] animate-ping" />
            LIVE CRICKET • REAL TIME
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1]">
              Live Cricket Scores. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#0070f3]">
                Real Time Intelligence.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Your comprehensive platform for live match tracking, ball-by-ball commentary, full scorecards, and precision live scoring operations.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/matches">
              <Button
                variant="primary"
                size="md"
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Explore Live Matches
              </Button>
            </Link>

            <Link to="/dashboard/matches/new">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Calendar className="w-4 h-4 text-emerald-400" />}
              >
                Schedule Match
              </Button>
            </Link>

            <Button
              variant="outline"
              size="md"
              onClick={onQuickSeed}
              isLoading={isSeeding}
              leftIcon={<Zap className="w-4 h-4 text-yellow-300" />}
            >
              ⚡ 1-Click Demo
            </Button>
          </div>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#38bdf8]">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Real-Time</p>
                <p className="text-slate-400 text-[11px]">Instant sync</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Ball-by-Ball</p>
                <p className="text-slate-400 text-[11px]">Live commentary</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Scorecards</p>
                <p className="text-slate-400 text-[11px]">Complete breakdown</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Playing XI</p>
                <p className="text-slate-400 text-[11px]">Squad roasters</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Match Showcase Card */}
        <div className="lg:col-span-5">
          {featuredMatch ? (
            <div className="relative bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl hover:border-slate-600 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
                <div className="flex items-center gap-2">
                  <StatusBadge status={featuredMatch.status} />
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    {featuredMatch.format.toUpperCase()} • {totalOvers} Overs
                  </span>
                </div>
                <Link
                  to={`/matches/${featuredMatch.id}`}
                  className="text-xs font-bold text-[#38bdf8] hover:underline flex items-center gap-1"
                >
                  Match Center
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Team Scores */}
              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${teamAIdentity.badgeBg} border ${teamAIdentity.borderBadge} ${teamAIdentity.textColor} shadow-sm`}
                    >
                      {teamAIdentity.shortCode}
                    </span>
                    <span className="font-bold text-sm text-white">{teamAName}</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-400">ID #{featuredMatch.team_a}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${teamBIdentity.badgeBg} border ${teamBIdentity.borderBadge} ${teamBIdentity.textColor} shadow-sm`}
                    >
                      {teamBIdentity.shortCode}
                    </span>
                    <span className="font-bold text-sm text-white">{teamBName}</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-400">ID #{featuredMatch.team_b}</span>
                </div>
              </div>

              {/* Match Result / Status Note */}
              <div className="pt-3 border-t border-[#21262d] flex items-center justify-between">
                <p className="text-xs font-medium text-slate-300">
                  {featuredMatch.status === 'completed' && featuredMatch.winner
                    ? `${featuredMatch.winner === featuredMatch.team_a ? teamAName : teamBName} won`
                    : featuredMatch.toss_decision
                    ? `${featuredMatch.toss_winner === featuredMatch.team_a ? teamAName : teamBName} elected to ${featuredMatch.toss_decision}`
                    : 'Match scheduled'}
                </p>

                <div className="flex items-center gap-2">
                  <Link to={`/matches/${featuredMatch.id}/score`}>
                    <Button variant="destructive" size="sm">
                      Score Console
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#38bdf8]">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Live Match Active</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Launch the instant demo match or schedule a new match to test live scoring and scorecard updates.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={onQuickSeed}
                isLoading={isSeeding}
                leftIcon={<Zap className="w-4 h-4 text-yellow-300" />}
              >
                Scaffold Demo Match
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
