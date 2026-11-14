import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, PlusCircle, Settings, UserPlus } from 'lucide-react';

export const DashboardWorkflowsGrid: React.FC = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Management Workflows</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/dashboard/matches/new"
          className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-blue-500/70 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Schedule Match</p>
            <p className="text-[11px] text-slate-400">New fixture & venue</p>
          </div>
        </Link>

        <Link
          to="/dashboard/setup"
          className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-emerald-500/70 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Setup & Toss</p>
            <p className="text-[11px] text-slate-400">Playing XI & coin toss</p>
          </div>
        </Link>

        <Link
          to="/dashboard/teams/new"
          className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-amber-500/70 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Create Team</p>
            <p className="text-[11px] text-slate-400">Add team profile</p>
          </div>
        </Link>

        <Link
          to="/dashboard/players/new"
          className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-purple-500/70 transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Add Player</p>
            <p className="text-[11px] text-slate-400">Register new athlete</p>
          </div>
        </Link>
      </div>
    </div>
  );
};
