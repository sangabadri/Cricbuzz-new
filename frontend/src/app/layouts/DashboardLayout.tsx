import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  ChevronRight,
  Globe,
  LayoutDashboard,
  Menu,
  PlusCircle,
  Settings,
  Shield,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../api/client';
import { useToast } from '../../components/common/Toast';
import { Button } from '../../components/ui/Button';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

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

  const navGroups = [
    {
      title: 'Overview',
      items: [{ to: '/dashboard', label: 'Dashboard Home', icon: LayoutDashboard, end: true }],
    },
    {
      title: 'Matches & Scoring',
      items: [
        { to: '/dashboard/matches', label: 'All Matches', icon: Trophy, end: true },
        { to: '/dashboard/matches/new', label: 'Schedule Match', icon: CalendarPlus },
        { to: '/dashboard/setup', label: 'Setup & Toss', icon: Settings },
      ],
    },
    {
      title: 'Teams & Squads',
      items: [
        { to: '/dashboard/teams', label: 'Manage Teams', icon: Shield, end: true },
        { to: '/dashboard/teams/new', label: 'Create Team', icon: PlusCircle },
      ],
    },
    {
      title: 'Players',
      items: [
        { to: '/dashboard/players', label: 'Manage Players', icon: Users, end: true },
        { to: '/dashboard/players/new', label: 'Add Player', icon: UserPlus },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-[#21262d]">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="bg-[#ea0029] text-white font-score text-sm font-black px-1.5 py-0.5 rounded">
            CRIC
          </div>
          <span className="font-bold text-sm text-white">Management Console</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1117] border-r border-[#21262d] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#21262d]">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-[#ea0029] text-white font-score text-sm font-black px-2 py-0.5 rounded">
              CRIC
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm text-white tracking-tight">Admin Console</span>
              <span className="text-[10px] text-slate-400 font-semibold">FastAPI Live Control</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-2">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#161b22] text-[#38bdf8] border border-[#30363d]'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-[#161b22]/50'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Bottom Footer */}
        <div className="p-4 border-t border-[#21262d] space-y-2.5">
          <Button
            variant="primary"
            size="sm"
            className="w-full text-xs"
            onClick={handleQuickSeed}
            isLoading={seeding}
            leftIcon={<Zap className="w-3.5 h-3.5 text-yellow-300" />}
          >
            ⚡ Demo Match
          </Button>

          <Link to="/" className="block">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs justify-center"
              leftIcon={<Globe className="w-3.5 h-3.5 text-slate-400" />}
            >
              Back to Public Site
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
