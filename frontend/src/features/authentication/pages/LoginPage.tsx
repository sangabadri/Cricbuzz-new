import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button, Card, Input } from '../../../components/ui';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../../../lib/api/client';
import { LogIn, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ username: username.trim(), password });
      navigate(redirectUrl, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to sign in. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <Card className="p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to Cricbuzz</h1>
          <p className="text-sm text-slate-400 mt-1">
            Access management tools and match scoring console
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            placeholder="e.g. cric_scorer_99"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button variant="primary" type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-400 mt-6 pt-6 border-t border-slate-800">
          Don't have an account?{' '}
          <Link
            to={`/register?redirect=${encodeURIComponent(redirectUrl)}`}
            className="text-emerald-400 font-semibold hover:underline"
          >
            Create one now
          </Link>
        </div>
      </Card>
    </div>
  );
};
