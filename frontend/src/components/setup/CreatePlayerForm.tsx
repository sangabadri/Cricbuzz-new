import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../api/client';
import { useToast } from '../common/Toast';
import type { Player, Role } from '../../types/cricket';

export interface PlayerFormData {
  name: string;
  role: Role;
  battingStyle: string;
  bowlingStyle: string;
}

const initialPlayerForm: PlayerFormData = {
  name: '',
  role: 'batsman',
  battingStyle: 'right-handed batsman',
  bowlingStyle: 'right-arm fast',
};

export interface CreatePlayerFormProps {
  onPlayerCreated?: (player: Player) => void;
}

export const CreatePlayerForm: React.FC<CreatePlayerFormProps> = ({ onPlayerCreated }) => {
  const toast = useToast();
  const [playerForm, setPlayerForm] = useState<PlayerFormData>(initialPlayerForm);

  const createPlayerMutation = useMutation({
    mutationFn: (data: { name: string; role: string; batting: string; bowling: string }) =>
      cricketApi.createPlayer(data),
    onSuccess: (newPlayer) => {
      setPlayerForm(initialPlayerForm);
      toast.success(`Player "${newPlayer.name}" created!`);
      onPlayerCreated?.(newPlayer);
    },
    onError: (err: unknown) => {
      toast.error('Error creating player: ' + getApiErrorMessage(err));
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = playerForm.name.trim();
    if (trimmed) {
      createPlayerMutation.mutate({
        name: trimmed,
        role: playerForm.role,
        batting: playerForm.battingStyle,
        bowling: playerForm.bowlingStyle,
      });
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 space-y-5 shadow-xl">
      <h2 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#21262d] pb-3">
        <UserPlus className="w-4 h-4 text-sky-400" />
        Register Player
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Player Name</label>
            <input
              type="text"
              value={playerForm.name}
              onChange={(e) => setPlayerForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Jasprit Bumrah"
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Role</label>
            <select
              value={playerForm.role}
              onChange={(e) => setPlayerForm((prev) => ({ ...prev, role: e.target.value as Role }))}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
            >
              <option value="batsman">Batsman</option>
              <option value="bowler">Bowler</option>
              <option value="all-rounder">All-Rounder</option>
              <option value="wicketkeeper">Wicketkeeper</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Batting Style</label>
            <select
              value={playerForm.battingStyle}
              onChange={(e) => setPlayerForm((prev) => ({ ...prev, battingStyle: e.target.value }))}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
            >
              <option value="right-handed batsman">Right-handed batsman</option>
              <option value="left-handed batsman">Left-handed batsman</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Bowling Style</label>
            <select
              value={playerForm.bowlingStyle}
              onChange={(e) => setPlayerForm((prev) => ({ ...prev, bowlingStyle: e.target.value }))}
              className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
            >
              <option value="right-arm fast">Right-arm fast</option>
              <option value="left-arm fast">Left-arm fast</option>
              <option value="right-arm medium">Right-arm medium</option>
              <option value="right-arm spin">Right-arm spin</option>
              <option value="left-arm spin">Left-arm spin</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!playerForm.name.trim() || createPlayerMutation.isPending}
          className="w-full py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-black text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer"
        >
          {createPlayerMutation.isPending ? 'Registering...' : 'Register Player'}
        </button>
      </form>
    </div>
  );
};
