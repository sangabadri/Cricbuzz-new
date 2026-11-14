import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Skeleton } from '../../../components/shared/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import type { Match } from '../../../types/cricket';

interface DashboardRecentMatchesTableProps {
  matches: Match[];
  isLoading: boolean;
}

export const DashboardRecentMatchesTable: React.FC<DashboardRecentMatchesTableProps> = ({
  matches,
  isLoading,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
        <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
          <Trophy className="w-4 h-4 text-sky-400" />
          <span>Recent Fixtures</span>
        </h3>
        <Link
          to="/dashboard/matches"
          className="text-xs font-bold text-[#38bdf8] hover:text-white flex items-center gap-1"
        >
          <span>View All ({matches.length})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : matches.length > 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Format & Overs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.slice(0, 8).map((match) => (
                <TableRow key={match.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <span className="font-bold text-white text-xs sm:text-sm">
                        {match.team_a_name || `Team ${match.team_a}`} vs {match.team_b_name || `Team ${match.team_b}`}
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono">
                        ID #{match.id} • {match.venue}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="uppercase font-bold text-xs text-sky-400">
                      {match.format} ({match.format === 't20' ? 20 : 50} ov)
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={match.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/matches/${match.id}/score`}>
                        <Button variant="destructive" size="sm">
                          Score Console
                        </Button>
                      </Link>
                      <Link to={`/matches/${match.id}`}>
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-8 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
          No matches found. Use the Schedule Match button or Demo Match to create fixtures.
        </div>
      )}
    </div>
  );
};
