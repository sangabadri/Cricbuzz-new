import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Calendar, ChevronRight } from 'lucide-react';
import type { Match } from '../../../types/cricket';
import { MatchCard } from '../../matches/components/MatchCard';

export interface RecentResultsSectionProps {
  matches: Match[];
}

export const RecentResultsSection: React.FC<RecentResultsSectionProps> = ({ matches }) => {
  const upcomingMatches = matches.filter(
    (m) => m.status === 'scheduled' || m.status === 'toss_done'
  ).slice(0, 4);

  const completedMatches = matches.filter(
    (m) => m.status === 'completed'
  ).slice(0, 4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Upcoming Fixtures */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-black text-white tracking-tight">Upcoming Fixtures</h3>
          </div>
          <Link
            to="/matches?status=scheduled"
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingMatches.length > 0 ? (
          <div className="space-y-3.5">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
            No upcoming fixtures scheduled.
          </div>
        )}
      </div>

      {/* Completed Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-black text-white tracking-tight">Recent Results</h3>
          </div>
          <Link
            to="/matches?status=completed"
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {completedMatches.length > 0 ? (
          <div className="space-y-3.5">
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
            No completed matches recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
