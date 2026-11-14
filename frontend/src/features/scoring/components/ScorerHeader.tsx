import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, PlayCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ScorerHeaderProps {
  matchId: number;
  inningsNumber: number;
  onSelectInnings: (inn: number) => void;
}

export const ScorerHeader: React.FC<ScorerHeaderProps> = ({
  matchId,
  inningsNumber,
  onSelectInnings,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/matches" className="hover:text-white transition-colors">
          Matches
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <Link to={`/matches/${matchId}`} className="hover:text-white transition-colors">
          Match #{matchId}
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-[#38bdf8] font-bold">Scorer Deck</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#12161f] border border-[#21262d] rounded-lg p-1 text-xs font-bold">
          <button
            onClick={() => onSelectInnings(1)}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              inningsNumber === 1
                ? 'bg-[#0070f3] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Innings 1
          </button>
          <button
            onClick={() => onSelectInnings(2)}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              inningsNumber === 2
                ? 'bg-[#0070f3] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Innings 2
          </button>
        </div>

        <Link to={`/matches/${matchId}`}>
          <Button variant="secondary" size="sm" leftIcon={<PlayCircle className="w-3.5 h-3.5 text-sky-400" />}>
            Match Center
          </Button>
        </Link>
      </div>
    </div>
  );
};
