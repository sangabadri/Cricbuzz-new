import React, { useState } from 'react';
import { Button, Input, Modal } from '../../../components/ui';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../../../lib/api/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister,
}) => {
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
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to sign in. Please verify your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign In to Cricbuzz">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
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
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </div>
        {onSwitchToRegister && (
          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToRegister();
              }}
              className="text-emerald-400 font-semibold hover:underline"
            >
              Register here
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
};
