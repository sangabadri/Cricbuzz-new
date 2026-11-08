import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { Player } from '../../types/cricket';
import { getTeamIdentity } from '../../utils/teamColors';

export interface PlayingXISelectorProps {
  teamName: string;
  teamId: number;
  allPlayers: Player[];
  selectedPlayerIds: number[];
  onTogglePlayer: (playerId: number) => void;
  captainId: number | undefined;
  onSetCaptain: (playerId: number) => void;
  wicketKeeperId: number | undefined;
  onSetWicketKeeper: (playerId: number) => void;
  disabledPlayerIds?: number[];
  maxPlayingXI?: number;
}

export const PlayingXISelector: React.FC<PlayingXISelectorProps> = ({
  teamName,
  teamId,
  allPlayers,
  selectedPlayerIds,
  onTogglePlayer,
  captainId,
  onSetCaptain,
  wicketKeeperId,
  onSetWicketKeeper,
  disabledPlayerIds = [],
  maxPlayingXI = 11,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const teamInfo = getTeamIdentity(teamName, teamId);

  const filteredPlayers = allPlayers.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isComplete = selectedPlayerIds.length === maxPlayingXI;

  return (
    <div className="bg-[#12161f] border border-[#21262d] rounded-2xl p-4 lg:p-5 space-y-4">
      {/* Team Header & Playing XI Count */}
      <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-3.5 h-3.5 rounded-full ${teamInfo.badgeBg} border ${teamInfo.borderBadge}`} />
          <h3 className="font-extrabold text-sm text-white">{teamName}</h3>
          <span className="text-[10px] font-mono text-slate-400">({teamInfo.shortCode})</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
              isComplete
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {selectedPlayerIds.length} / {maxPlayingXI} Selected
          </span>
        </div>
      </div>

      {/* Search and Role Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full bg-[#161b22] border border-[#21262d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-[#161b22] border border-[#21262d] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-medium"
        >
          <option value="all">All Roles</option>
          <option value="batsman">Batters</option>
          <option value="bowler">Bowlers</option>
          <option value="all-rounder">All-Rounders</option>
          <option value="wicketkeeper">Wicketkeepers</option>
        </select>
      </div>

      {/* Players List */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">No players match the criteria.</div>
        ) : (
          filteredPlayers.map((player) => {
            const isSelected = selectedPlayerIds.includes(player.id);
            const isDisabled = disabledPlayerIds.includes(player.id);
            const isCaptain = captainId === player.id;
            const isWicketKeeper = wicketKeeperId === player.id;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                  isDisabled
                    ? 'opacity-40 bg-[#161b22]/50 border-transparent cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-950/20 border-blue-500/40 text-white'
                    : 'bg-[#161b22] border-[#21262d] text-slate-300 hover:border-[#30363d]'
                }`}
              >
                {/* Checkbox & Player Info */}
                <div
                  className="flex items-center gap-2.5 flex-1 cursor-pointer select-none"
                  onClick={() => {
                    if (!isDisabled) onTogglePlayer(player.id);
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#0070f3] border-[#0070f3] text-white'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{player.name}</span>
                      {isCaptain && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          C
                        </span>
                      )}
                      {isWicketKeeper && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40">
                          WK
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">{player.role}</div>
                  </div>
                </div>

                {/* Role badges (C, WK) */}
                {isSelected && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSetCaptain(player.id)}
                      title={isCaptain ? 'Captain' : 'Set as Captain'}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        isCaptain
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                          : 'bg-[#21262d] text-slate-400 hover:text-amber-400'
                      }`}
                    >
                      (C)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetWicketKeeper(player.id)}
                      title={isWicketKeeper ? 'Wicketkeeper' : 'Set as Wicketkeeper'}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        isWicketKeeper
                          ? 'bg-sky-500 text-slate-950 shadow-sm font-black'
                          : 'bg-[#21262d] text-slate-400 hover:text-sky-400'
                      }`}
                    >
                      (WK)
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
