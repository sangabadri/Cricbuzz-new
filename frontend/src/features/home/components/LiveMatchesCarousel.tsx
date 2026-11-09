import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Match } from '../../../types/cricket';
import { MatchCard } from '../../matches/components/MatchCard';
import { Button } from '../../../components/ui/Button';

export interface LiveMatchesCarouselProps {
  matches: Match[];
  onQuickSeed?: () => void;
  isSeeding?: boolean;
}

export const LiveMatchesCarousel: React.FC<LiveMatchesCarouselProps> = ({
  matches,
  onQuickSeed,
  isSeeding,
}) => {
  const liveMatches = matches.filter(
    (m) => m.status === 'live' || m.status === 'innings_break'
  );

  return (
    <div className="space-y-4 mb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#ea0029] animate-pulse" />
            LIVE MATCHES
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            ({liveMatches.length} in play)
          </span>
        </div>

        <Link
          to="/matches"
          className="text-xs font-bold text-[#38bdf8] hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>All Fixtures</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {liveMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {liveMatches.map((match) => (
            <MatchCard key={match.id} match={match} featured />
          ))}
        </div>
      ) : (
        <div className="bg-[#161b22]/50 border border-[#30363d] rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm font-bold text-slate-300">
            No matches currently in progress.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All current fixtures are either scheduled or completed. Start an innings in any match or trigger the 1-click demo to score live.
          </p>
          {onQuickSeed && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onQuickSeed}
              isLoading={isSeeding}
            >
              Start Live Demo Match
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
