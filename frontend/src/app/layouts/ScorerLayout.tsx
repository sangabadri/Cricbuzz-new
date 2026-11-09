import React from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, LayoutDashboard } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const ScorerLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Scorer Workspace Header */}
      <header className="sticky top-0 z-40 bg-[#090c10]/95 backdrop-blur-md border-b border-[#21262d] px-4 lg:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={id ? `/matches/${id}` : '/matches'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#161b22] border border-[#30363d] transition-all"
              title="Return to Match Center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <div className="bg-[#ea0029] text-white font-score text-xs font-black px-1.5 py-0.5 rounded">
                SCORER
              </div>
              <span className="font-black text-sm text-white tracking-tight">
                Live Console
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-[#ea0029]/15 text-[#ff4d6d] px-1.5 py-0.5 rounded border border-[#ea0029]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ea0029] animate-pulse" />
                ACTIVE SESSION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {id && (
              <Link to={`/matches/${id}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Eye className="w-3.5 h-3.5 text-sky-400" />}
                >
                  <span className="hidden sm:inline">View</span> Match Center
                </Button>
              </Link>
            )}

            <Link to="/dashboard">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />}
              >
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Scorer Workspace Outlet */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
};
