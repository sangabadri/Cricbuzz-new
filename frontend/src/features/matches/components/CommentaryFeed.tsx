import React from 'react';
import { Radio } from 'lucide-react';
import type { DeliveryResponse } from '../../types/cricket';
import { BallBubble } from '../common/BallBubble';

export interface CommentaryFeedProps {
  deliveries: DeliveryResponse[];
  title?: string;
  emptyMessage?: string;
  inningsNumber?: number;
  availableInnings?: number[];
  onInningsChange?: (innings: number) => void;
  className?: string;
}

export const CommentaryFeed: React.FC<CommentaryFeedProps> = ({
  deliveries,
  title = 'Live Ball-by-Ball',
  emptyMessage = 'No deliveries recorded yet for this innings.',
  inningsNumber,
  availableInnings,
  onInningsChange,
  className = '',
}) => {
  const reversedDeliveries = [...deliveries].reverse();

  const overSummaries = React.useMemo(() => {
    const map = new Map<
      number,
      {
        overNumber: number;
        runs: number;
        wickets: number;
        totalRuns: number;
        totalWickets: number;
        isComplete: boolean;
      }
    >();

    let cumRuns = 0;
    let cumWickets = 0;

    for (const d of deliveries) {
      const ballRuns = (d.runs ?? 0) + (d.extras ?? 0);
      cumRuns += ballRuns;
      if (d.wicket_type) {
        cumWickets += 1;
      }

      const existing = map.get(d.over) || {
        overNumber: d.over + 1,
        runs: 0,
        wickets: 0,
        totalRuns: 0,
        totalWickets: 0,
        isComplete: false,
      };

      existing.runs += ballRuns;
      if (d.wicket_type) {
        existing.wickets += 1;
      }
      existing.totalRuns = cumRuns;
      existing.totalWickets = cumWickets;
      const isLegal = !d.extra_type || (d.extra_type !== 'wide' && d.extra_type !== 'noball');
      if (d.ball >= 6 && isLegal) {
        existing.isComplete = true;
      }
      map.set(d.over, existing);
    }

    return map;
  }, [deliveries]);

  return (
    <div className={`bg-[#161b22] border border-[#21262d] rounded-2xl p-4 lg:p-5 flex flex-col ${className}`.trim()}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            <span>{title}</span>
          </h3>
        </div>

        {/* Optional innings switch pill */}
        {availableInnings && availableInnings.length > 1 && onInningsChange && (
          <div className="flex items-center bg-[#12161f] border border-[#21262d] rounded-lg p-0.5 text-xs font-bold">
            {availableInnings.map((inn) => (
              <button
                key={inn}
                type="button"
                onClick={() => onInningsChange(inn)}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                  inningsNumber === inn
                    ? 'bg-[#0070f3] text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Inn {inn}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feed list */}
      {reversedDeliveries.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs italic">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto max-h-[640px] pr-1 divide-y divide-[#21262d]/50">
          {reversedDeliveries.map((d, idx) => {
            const isWicket = !!d.wicket_type;
            const isFour = d.runs === 4;
            const isSix = d.runs === 6;

            const prevInList = idx > 0 ? reversedDeliveries[idx - 1] : null;
            const isOverTransition = prevInList !== null && prevInList.over !== d.over;
            const isTopOverComplete = idx === 0 && (overSummaries.get(d.over)?.isComplete ?? false);
            const showOverSummary = isOverTransition || isTopOverComplete;
            const summary = showOverSummary ? overSummaries.get(d.over) : null;

            return (
              <React.Fragment key={d.id}>
                {showOverSummary && summary && (
                  <div className="bg-[#12161f] border border-[#21262d] rounded-xl px-4 py-2.5 my-3 flex items-center justify-between text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-score text-sm font-bold text-white uppercase tracking-wider">
                        END OF OVER {summary.overNumber}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        • {summary.runs} {summary.runs === 1 ? 'run' : 'runs'}
                        {summary.wickets > 0 && (
                          <span className="text-rose-400 ml-1">
                            ({summary.wickets} {summary.wickets === 1 ? 'wicket' : 'wickets'})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-slate-300 font-mono">
                      Team: <strong className="text-white font-score text-sm font-bold">{summary.totalRuns}/{summary.totalWickets}</strong>
                    </div>
                  </div>
                )}

                <div
                  className={`pt-2.5 first:pt-0 flex items-start gap-3 transition-colors ${
                    isWicket
                      ? 'bg-rose-950/20 -mx-2 px-3 py-2 rounded-lg border-l-4 border-rose-500 shadow-sm'
                      : isSix
                      ? 'bg-emerald-950/20 -mx-2 px-3 py-2 rounded-lg border-l-4 border-emerald-500 shadow-sm'
                      : isFour
                      ? 'bg-sky-950/20 -mx-2 px-3 py-2 rounded-lg border-l-4 border-sky-500 shadow-sm'
                      : 'hover:bg-[#12161f]/40 -mx-2 px-2 py-1.5 rounded-lg'
                  }`}
                >
                  {/* Over coordinate */}
                  <span className="font-mono font-bold text-xs text-slate-400 bg-[#12161f] px-2 py-1 rounded border border-[#21262d] shrink-0 tabular-nums">
                    {d.over}.{d.ball}
                  </span>

                  {/* Delivery Badge */}
                  <div className="shrink-0 pt-0.5">
                    <BallBubble
                      ball={
                        isWicket
                          ? 'W'
                          : d.extra_type
                          ? `${d.extras}${d.extra_type === 'wide' ? 'Wd' : d.extra_type === 'noball' ? 'Nb' : 'B'}`
                          : d.runs
                      }
                      size="sm"
                    />
                  </div>

                  {/* Commentary Narrative */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-relaxed">
                      <span className="font-bold text-white">
                        {d.bowler_name || 'Bowler'} to {d.batsman_name || 'Batter'}
                      </span>
                      {d.commentary ? (
                        <span className="ml-1 text-slate-300">, {d.commentary}</span>
                      ) : (
                        <span className="ml-1 text-slate-400">
                          {isWicket
                            ? `— OUT! Dismissed (${d.wicket_type?.replace('_', ' ') || 'Wicket'}).`
                            : isSix
                            ? '— SIX! Smashed high over the ropes for a maximum!'
                            : isFour
                            ? '— FOUR! Cracking shot racing across the turf to the fence!'
                            : d.runs === 0
                            ? '— no run, defended steadily into the pitch.'
                            : `— ${d.runs} run${d.runs > 1 ? 's' : ''} taken.`}
                        </span>
                      )}
                    </p>

                    {/* Micro stat summary tag */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                      {d.extra_type && (
                        <span className="text-amber-400 font-bold uppercase">
                          [{d.extra_type} +{d.extras}]
                        </span>
                      )}
                      {isWicket && (
                        <span className="text-rose-400 font-bold uppercase">
                          [Wicket: {d.wicket_type}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
