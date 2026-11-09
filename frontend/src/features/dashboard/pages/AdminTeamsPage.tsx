import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, PlusCircle, Search } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { Skeleton } from '../../../components/shared/Skeleton';
import { getTeamIdentity } from '../../../utils/teamColors';

export const AdminTeamsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: teams = [], isLoading, error } = useQuery({
    queryKey: ['teams', search],
    queryFn: () => cricketApi.getTeams({ search: search.trim() || undefined, limit: 100 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        subtitle="View, create, and manage registered cricket franchises and international teams."
        actions={
          <Link to="/dashboard/teams/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              Add New Team
            </Button>
          </Link>
        }
      />

      <div className="max-w-md">
        <Input
          placeholder="Filter teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
          <p className="text-sm font-bold text-rose-400">Error loading teams</p>
          <p className="text-xs text-slate-400">{getApiErrorMessage(error)}</p>
        </div>
      ) : teams.length > 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Abbreviation</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => {
                const identity = getTeamIdentity(team.name, team.id);
                return (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center uppercase font-black text-xs ${identity.badgeBg} border ${identity.borderBadge} ${identity.textColor} shadow-sm`}
                        >
                          {identity.shortCode}
                        </div>
                        <span className="font-bold text-white text-xs sm:text-sm">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-xs text-slate-300">
                        {identity.shortCode}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500">#{team.id}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/teams/${team.id}`}>
                        <Button variant="secondary" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                          Profile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#161b22]/40 border border-[#30363d] rounded-2xl text-xs text-slate-400">
          No teams found. Click "Add New Team" to create one.
        </div>
      )}
    </div>
  );
};
