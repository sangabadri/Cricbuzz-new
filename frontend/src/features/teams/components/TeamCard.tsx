import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Team } from '../../../types/cricket';
import { getTeamIdentity } from '../../../utils/teamColors';
import { Button } from '../../../components/ui/Button';

export interface TeamCardProps {
  team: Team;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const identity = getTeamIdentity(team.name, team.id);

  return (
    <div className="group bg-[#161b22] border border-[#30363d] hover:border-slate-500 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm uppercase tracking-wider ${identity.badgeBg} border ${identity.borderBadge} ${identity.textColor} shadow-md`}
          >
            {identity.shortCode}
          </div>
          <div>
            <h3 className="font-bold text-base text-white group-hover:text-[#38bdf8] transition-colors">
              {team.name}
            </h3>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {identity.shortCode}
            </span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-[#0d1117] border border-[#21262d]">
          ID #{team.id}
        </span>
      </div>

      <div className="pt-5 mt-4 border-t border-[#21262d] flex items-center justify-between">
        <span className="text-xs text-slate-400">Team Profile</span>
        <Link to={`/teams/${team.id}`}>
          <Button variant="secondary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
            View Team
          </Button>
        </Link>
      </div>
    </div>
  );
};
