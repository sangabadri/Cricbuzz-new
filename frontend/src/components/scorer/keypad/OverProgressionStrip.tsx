import React from 'react';
import type { LiveCurrentOverBall } from '../../../types/cricket';
import { BallBubble } from '../../common/BallBubble';

export interface OverProgressionStripProps {
  currentOverBalls: (LiveCurrentOverBall | string)[];
  legalBallsCount: number;
}

export const OverProgressionStrip: React.FC<OverProgressionStripProps> = ({
  currentOverBalls,
  legalBallsCount,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ea0029] animate-pulse" />
          <span>Delivery Action Deck</span>
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Tactile touch buttons or hotkeys <span className="font-mono text-sky-400">[0-6, W, N, K, U]</span>
        </p>
      </div>

      <div className="flex items-center gap-2 bg-[#12161f] px-3 py-1.5 rounded-xl border border-[#21262d]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
          This Over:
        </span>
        {currentOverBalls.length === 0 ? (
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((slot) => (
              <span
                key={slot}
                className="w-6 h-6 rounded-full border border-dashed border-slate-700/60 flex items-center justify-center text-[10px] text-slate-600 font-mono"
              >
                {slot}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentOverBalls.map((b, idx) => (
              <BallBubble
                key={idx}
                ball={b}
                size="sm"
                animate={idx === currentOverBalls.length - 1}
              />
            ))}
            {Array.from({ length: Math.max(0, 6 - legalBallsCount) }).map((_, i) => (
              <span
                key={`rem-${i}`}
                className="w-6 h-6 rounded-full border border-dashed border-slate-700/60 flex items-center justify-center text-[10px] text-slate-600 font-mono"
              >
                {legalBallsCount + i + 1}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
