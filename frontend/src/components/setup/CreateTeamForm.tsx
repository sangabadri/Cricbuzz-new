import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../api/client';
import { useToast } from '../common/Toast';
import { getTeamIdentity } from '../../utils/teamColors';
import type { Team } from '../../types/cricket';

export interface CreateTeamFormProps {
  teams: Team[];
  onTeamCreated?: (team: Team) => void;
}

export const CreateTeamForm: React.FC<CreateTeamFormProps> = ({ teams, onTeamCreated }) => {
  const toast = useToast();
  const [name, setName] = useState('');

  const createTeamMutation = useMutation({
    mutationFn: (teamName: string) => cricketApi.createTeam(teamName),
    onSuccess: (newTeam) => {
      setName('');
      toast.success(`Team "${newTeam.name}" created!`);
      onTeamCreated?.(newTeam);
    },
    onError: (err: unknown) => {
      toast.error('Error creating team: ' + getApiErrorMessage(err));
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      createTeamMutation.mutate(trimmed);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 space-y-5 shadow-xl">
      <h2 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#21262d] pb-3">
        <Shield className="w-4 h-4 text-sky-400" />
        Register Cricket Club / Team
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-2.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Royal Challengers Bangalore"
          className="flex-1 bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!name.trim() || createTeamMutation.isPending}
          className="px-5 py-2 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
        >
          {createTeamMutation.isPending ? 'Adding...' : 'Add Team'}
        </button>
      </form>

      {/* Existing Teams Grid */}
      <div className="pt-3 space-y-2.5">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          Registered Teams ({teams.length})
        </h3>
        {teams.length === 0 ? (
          <div className="text-xs text-slate-500 py-3 text-center">No teams registered yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {teams.map((t) => {
              const identity = getTeamIdentity(t.name, t.id);
              return (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-[#12161f] border border-[#21262d] flex items-center gap-2.5"
                >
                  <span
                    className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-[10px] ${identity.badgeBg} border ${identity.borderBadge} ${identity.textColor}`}
                  >
                    {identity.shortCode}
                  </span>
                  <span className="font-bold text-xs text-white truncate">{t.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
