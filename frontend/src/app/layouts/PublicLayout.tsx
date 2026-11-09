import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  Flame,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Shield,
  Trophy,
  User as UserIcon,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cricketApi, getApiErrorMessage } from '../../api/client';
import { useToast } from '../../components/common/Toast';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../features/authentication/context/AuthContext';
import { LoginModal } from '../../features/authentication/components/LoginModal';
import { RegisterModal } from '../../features/authentication/components/RegisterModal';

export const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
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

  const navLinks = [
    { to: '/', label: 'Home', icon: Flame, end: true },
    { to: '/matches', label: 'Matches', icon: Trophy },
    { to: '/teams', label: 'Teams', icon: Shield },
    { to: '/players', label: 'Players', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#090c10]/95 backdrop-blur-md border-b border-[#21262d] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
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
                    LIVE
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'text-white bg-[#161b22] border border-[#30363d]'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-[#161b22]/50'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5 text-sky-400" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2.5">
              <Link to="/dashboard">
                <Button variant="secondary" size="sm" leftIcon={<LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />}>
                  Dashboard
                </Button>
              </Link>
              <Link to="/dashboard/matches/new">
                <Button variant="secondary" size="sm" leftIcon={<CalendarPlus className="w-3.5 h-3.5 text-emerald-400" />}>
                  Schedule Match
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={handleQuickSeed}
                isLoading={seeding}
                leftIcon={<Zap className="w-3.5 h-3.5 text-yellow-300" />}
              >
                ⚡ Demo Match
              </Button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-white">{user?.username}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    aria-label="Sign out"
                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLoginModalOpen(true)}
                    leftIcon={<LogIn className="w-3.5 h-3.5 text-slate-300" />}
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRegisterModalOpen(true)}
                    className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    Register
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#21262d] bg-[#0d1117] px-4 pt-3 pb-5 space-y-3">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold ${
                        isActive ? 'text-white bg-[#161b22] border border-[#30363d]' : 'text-slate-400 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-sky-400" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[#21262d] flex flex-col gap-2">
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" size="sm" className="w-full justify-start" leftIcon={<LayoutDashboard className="w-4 h-4 text-sky-400" />}>
                  Admin Dashboard
                </Button>
              </Link>
              <Link to="/dashboard/matches/new" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" size="sm" className="w-full justify-start" leftIcon={<CalendarPlus className="w-4 h-4 text-emerald-400" />}>
                  Schedule Match
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleQuickSeed();
                }}
                isLoading={seeding}
                leftIcon={<Zap className="w-4 h-4 text-yellow-300" />}
              >
                ⚡ Demo Match
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Outlet */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#21262d] bg-[#090c10] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-slate-300">
              cric<span className="text-[#38bdf8]">tracker</span>
            </span>
            <span>•</span>
            <span>Live Cricket Scores & Management System</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/matches" className="hover:text-white transition-colors">
              Fixtures
            </Link>
            <Link to="/teams" className="hover:text-white transition-colors">
              Teams
            </Link>
            <Link to="/players" className="hover:text-white transition-colors">
              Players
            </Link>
            <Link to="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToRegister={() => setRegisterModalOpen(true)}
      />
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSwitchToLogin={() => setLoginModalOpen(true)}
      />
    </div>
  );
};
