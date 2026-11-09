import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarPlus,
  Eye,
  PlayCircle,
  Search,
} from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { useToast } from '../../../components/common/Toast';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Tabs } from '../../../components/ui/Tabs';
import { Input } from '../../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { Skeleton } from '../../../components/shared/Skeleton';
import { Modal } from '../../../components/ui/Modal';

export const AdminMatchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [abandonMatchId, setAbandonMatchId] = useState<number | null>(null);

  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ['matches'],
    queryFn: () => cricketApi.getMatches({ limit: 100 }),
    refetchInterval: 5000,
  });

  const abandonMutation = useMutation({
    mutationFn: (matchId: number) => cricketApi.abandonMatch(matchId),
    onSuccess: (res) => {
      toast.warning(`Match #${res.id} marked as abandoned.`);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setAbandonMatchId(null);
    },
    onError: (err) => {
      toast.error('Failed to abandon match: ' + getApiErrorMessage(err));
    },
  });

  const filteredMatches = matches.filter((m) => {
    if (filter === 'live' && !(m.status === 'live' || m.status === 'innings_break')) return false;
    if (filter === 'scheduled' && !(m.status === 'scheduled' || m.status === 'toss_done')) return false;
    if (filter === 'completed' && m.status !== 'completed') return false;
    if (filter === 'abandoned' && m.status !== 'abandoned') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = `${m.team_a_name || ''} ${m.team_b_name || ''} ${m.venue}`.toLowerCase();
      return matchName.includes(q);
    }
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All Matches', count: matches.length },
    {
      id: 'live',
      label: 'Live',
      count: matches.filter((m) => m.status === 'live' || m.status === 'innings_break').length,
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      count: matches.filter((m) => m.status === 'scheduled' || m.status === 'toss_done').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: matches.filter((m) => m.status === 'completed').length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Match Operations & Fixtures"
        subtitle="Administer all recorded cricket fixtures, manage live scoring sessions, and conduct match operations."
        actions={
          <Link to="/dashboard/matches/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
            >
              Schedule Match
            </Button>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <Tabs tabs={tabs} activeTab={filter} onChange={setFilter} />

        <div className="w-full sm:w-64 shrink-0">
          <Input
            placeholder="Search match or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>
      </div>

      {/* Matches Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
          <p className="text-sm font-bold text-rose-400">Error loading fixtures</p>
          <p className="text-xs text-slate-400">{getApiErrorMessage(error)}</p>
        </div>
      ) : filteredMatches.length > 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fixture</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scores</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-bold text-white text-xs sm:text-sm">
                        {match.team_a_name || `Team ${match.team_a}`} vs {match.team_b_name || `Team ${match.team_b}`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ID #{match.id} • {match.venue}
                      </div>
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
                  <TableCell>
                    <div className="text-xs font-mono text-slate-200">
                      <div>T1 #{match.team_a}</div>
                      <div>T2 #{match.team_b}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/matches/${match.id}/score`}>
                        <Button
                          variant={match.status === 'live' ? 'destructive' : 'secondary'}
                          size="sm"
                          leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
                        >
                          Score
                        </Button>
                      </Link>

                      <Link to={`/matches/${match.id}`}>
                        <Button variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                          View
                        </Button>
                      </Link>

                      {match.status !== 'abandoned' && match.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-400 hover:text-rose-300"
                          onClick={() => setAbandonMatchId(match.id)}
                        >
                          Abandon
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
          No matches found matching the selected filter.
        </div>
      )}

      {/* Abandon Confirmation Modal */}
      <Modal
        isOpen={abandonMatchId !== null}
        onClose={() => setAbandonMatchId(null)}
        title="Abandon Match Confirmation"
        description="Are you sure you want to declare this match abandoned? This action marks the match status as abandoned."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              Abandoning Match #{abandonMatchId} will halt live scoring progression and set the match result to abandoned.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setAbandonMatchId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={abandonMutation.isPending}
              onClick={() => {
                if (abandonMatchId) abandonMutation.mutate(abandonMatchId);
              }}
            >
              Confirm Abandon Match
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
