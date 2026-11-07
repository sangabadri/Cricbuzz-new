import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Zap, Trophy } from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../api/client';
import { useToast } from './common/Toast';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [seeding, setSeeding] = useState(false);

  const handleQuickSeed = async () => {
    try {
      setSeeding(true);
      const res = await cricketApi.seedDemoMatch();
      toast.success('Demo Match created: India vs Australia');
      navigate(`/matches/${res.match_id}/score`);
    } catch (err: unknown) {
      toast.error('Error creating demo match: ' + getApiErrorMessage(err));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#090c10]/95 backdrop-blur-md border-b border-[#21262d] shadow-lg px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* CricTracker Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center bg-[#ea0029] text-white px-2 py-0.5 rounded shadow-sm group-hover:brightness-110 transition-all">
            <span className="font-score text-base font-black tracking-tight leading-none uppercase">
              CRIC
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-lg tracking-tight text-white">
              cric<span className="text-[#38bdf8]">tracker</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-[#ea0029]/15 text-[#ff4d6d] px-1.5 py-0.5 rounded border border-[#ea0029]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ea0029] animate-pulse" />
              LIVE CENTER
            </span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-[#161b22] rounded-lg transition-colors border border-transparent hover:border-[#30363d]"
          >
            <Trophy className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Match</span> Fixtures
          </Link>

          <Link
            to="/setup"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-200 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-lg transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">New</span> Match
          </Link>

          <button
            onClick={handleQuickSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-[#0070f3] hover:bg-blue-600 active:scale-95 rounded-lg shadow-sm border border-blue-400/30 transition-all disabled:opacity-50 cursor-pointer"
            title="Creates India vs Australia demo match with active innings and opens scorer"
          >
            <Zap className={`w-3.5 h-3.5 text-yellow-300 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Seeding...' : '⚡ Demo Match'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
