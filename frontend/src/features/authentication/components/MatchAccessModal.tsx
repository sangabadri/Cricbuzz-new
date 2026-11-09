import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Badge } from '../../../components/ui';
import { cricketApi, getApiErrorMessage } from '../../../lib/api/client';
import { UserCheck, Trash2, UserPlus, Shield } from 'lucide-react';

interface MatchAccessModalProps {
  matchId: number;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
}

export const MatchAccessModal: React.FC<MatchAccessModalProps> = ({
  matchId,
  isOpen,
  onClose,
  isOwner = true,
}) => {
  const [usernameToAdd, setUsernameToAdd] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: accessList = [],
    isLoading: loading,
    refetch: fetchAccess,
  } = useQuery({
    queryKey: ['matchAccess', matchId],
    queryFn: () => cricketApi.getMatchAccess(matchId),
    enabled: isOpen && !!matchId,
  });

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameToAdd.trim()) return;
    setError(null);
    setAddLoading(true);
    try {
      await cricketApi.grantMatchAccess(matchId, usernameToAdd.trim(), 'scorer');
      setUsernameToAdd('');
      await fetchAccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to grant access to user.'));
    } finally {
      setAddLoading(false);
    }
  };

  const handleRevoke = async (userId: number) => {
    try {
      await cricketApi.revokeMatchAccess(matchId, userId);
      await fetchAccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to revoke access.'));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Match Scoring Access Delegation">
      <div className="space-y-6">
        <p className="text-sm text-slate-400">
          Match owners can designate registered scorers who have permission to enter deliveries and update match state.
        </p>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isOwner && (
          <form onSubmit={handleGrant} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Username to add as scorer"
                value={usernameToAdd}
                onChange={(e) => setUsernameToAdd(e.target.value)}
                required
              />
            </div>
            <Button variant="primary" type="submit" disabled={addLoading} className="shrink-0">
              <UserPlus className="w-4 h-4 mr-1.5" />
              {addLoading ? 'Adding...' : 'Grant Access'}
            </Button>
          </form>
        )}

        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Authorized Users ({accessList.length})
          </h4>
          {loading ? (
            <p className="text-sm text-slate-500">Loading access records...</p>
          ) : accessList.length === 0 ? (
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 text-center text-sm text-slate-400">
              No specific access delegation configured. Match is open or created anonymously.
            </div>
          ) : (
            <div className="space-y-2">
              {accessList.map((entry) => (
                <div
                  key={entry.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                      {entry.role === 'owner' ? (
                        <Shield className="w-4 h-4 text-amber-400" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{entry.username}</p>
                      <Badge variant={entry.role === 'owner' ? 'warning' : 'success'} size="sm">
                        {entry.role.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {isOwner && entry.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(entry.user_id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
