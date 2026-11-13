import React from 'react';
import { Shield } from 'lucide-react';
import type { MatchScorecardResponse, SquadResponse } from '../../types/cricket';

export interface SquadsTabProps {
  teamAName?: string;
  teamBName?: string;
  scorecard?: MatchScorecardResponse | null;
  squadA?: SquadResponse | null;
  squadB?: SquadResponse | null;
  className?: string;
}

export const SquadsTab: React.FC<SquadsTabProps> = ({
  teamAName,
  teamBName,
  scorecard,
  squadA,
  squadB,
  className = '',
}) => {
  const resolvedTeamAName = teamAName || scorecard?.team_a_name || 'Team A';
  const resolvedTeamBName = teamBName || scorecard?.team_b_name || 'Team B';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`.trim()}>
      {/* Team A */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 lg:p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center justify-between border-b border-[#21262d] pb-2.5">
          <span>{resolvedTeamAName} Squad</span>
          <Shield className="w-3.5 h-3.5 text-sky-400" />
        </h3>

        {!squadA ? (
          <p className="text-xs text-slate-400">Squad not available.</p>
        ) : (
          <ul className="space-y-1.5">
            {squadA.players.map((p) => (
              <li
                key={p.player_id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#12161f] text-xs border border-[#21262d]"
              >
                <span className="font-bold text-white">
                  {p.player_name || `Player #${p.player_id}`}
                  {p.player_id === squadA.captain_id && (
                    <span className="text-sky-400 ml-1 font-bold">(c)</span>
                  )}
                  {p.player_id === squadA.wicket_keeper_id && (
                    <span className="text-yellow-400 ml-1 font-bold">(wk)</span>
                  )}
                </span>
                <span className="text-slate-400 uppercase text-[9px] font-mono">
                  {p.role || 'Player'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Team B */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-4 lg:p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-white flex items-center justify-between border-b border-[#21262d] pb-2.5">
          <span>{resolvedTeamBName} Squad</span>
          <Shield className="w-3.5 h-3.5 text-sky-400" />
        </h3>

        {!squadB ? (
          <p className="text-xs text-slate-400">Squad not available.</p>
        ) : (
          <ul className="space-y-1.5">
            {squadB.players.map((p) => (
              <li
                key={p.player_id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#12161f] text-xs border border-[#21262d]"
              >
                <span className="font-bold text-white">
                  {p.player_name || `Player #${p.player_id}`}
                  {p.player_id === squadB.captain_id && (
                    <span className="text-sky-400 ml-1 font-bold">(c)</span>
                  )}
                  {p.player_id === squadB.wicket_keeper_id && (
                    <span className="text-yellow-400 ml-1 font-bold">(wk)</span>
                  )}
                </span>
                <span className="text-slate-400 uppercase text-[9px] font-mono">
                  {p.role || 'Player'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
