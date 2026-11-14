import React from 'react';
import { Clock, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { LiveScorerStateResponse } from '../../../types/cricket';

interface InningsTransitionPromptsProps {
  scorerState: LiveScorerStateResponse;
  inningsNumber: number;
  onStartInnings2: () => void;
  onAssignOpeners: () => void;
}

export const InningsTransitionPrompts: React.FC<InningsTransitionPromptsProps> = ({
  scorerState,
  inningsNumber,
  onStartInnings2,
  onAssignOpeners,
}) => {
  const isInningsBreak =
    (scorerState.next_action === 'INNINGS_BREAK' ||
      scorerState.innings_status === 'completed') &&
    scorerState.match_status !== 'completed';

  const isNotStarted = scorerState.innings_status === 'not_started';

  if (!isInningsBreak && !isNotStarted) {
    return null;
  }

  return (
    <>
      {isInningsBreak && (
        <div className="bg-[#161b22] border border-amber-500/50 rounded-2xl p-6 text-center space-y-3">
          <Clock className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="text-xl font-black text-white">Innings 1 Completed</h2>
          <p className="text-slate-300 text-xs">
            Target set for Innings 2. Switch to Innings 2 to configure openers and start the chase.
          </p>
          <Button variant="accent" size="md" onClick={onStartInnings2}>
            Start Innings 2
          </Button>
        </div>
      )}

      {isNotStarted && (
        <div className="bg-[#161b22] border-2 border-dashed border-blue-500/40 rounded-2xl p-8 text-center space-y-4">
          <UserPlus className="w-10 h-10 text-sky-400 mx-auto" />
          <h2 className="text-xl font-black text-white">
            Innings {inningsNumber} Not Started
          </h2>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Assign the two opening batsmen and the opening bowler to begin recording deliveries.
          </p>
          <Button variant="primary" size="md" onClick={onAssignOpeners}>
            Assign Openers & Start Innings
          </Button>
        </div>
      )}
    </>
  );
};
