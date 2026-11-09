import React, { useState } from 'react';
import { Button, Input, Modal } from '../../../components/ui';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../../../lib/api/client';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
}) => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to register account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create an Account">
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
          label="Email Address"
          type="email"
          placeholder="scorer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
          </Button>
        </div>
        {onSwitchToLogin && (
          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToLogin();
              }}
              className="text-emerald-400 font-semibold hover:underline"
            >
              Sign In
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
};
