import React from 'react';
import type { InningsScorecard, MatchScorecardResponse } from '../../types/cricket';
import { BattingTable } from './BattingTable';
import { BowlingTable } from './BowlingTable';

export interface ScorecardTabProps {
  scorecard?: MatchScorecardResponse | null;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}

export const ScorecardTab: React.FC<ScorecardTabProps> = ({
  scorecard,
  isLoading = false,
  isError = false,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`.trim()}>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium text-xs">Loading detailed scorecard...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-rose-400 text-xs bg-rose-500/10 rounded-xl border border-rose-500/20 p-4">
          Failed to load scorecard data. Please try again.
        </div>
      ) : !scorecard || scorecard.innings.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Scorecard not yet initialized.
        </div>
      ) : (
        scorecard.innings.map((inn: InningsScorecard) => (
          <div
            key={inn.innings_number}
            className="bg-[#161b22] border border-[#21262d] rounded-2xl overflow-hidden shadow-md space-y-4 p-4 lg:p-5"
          >
            {/* Innings Header */}
            <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  {inn.batting_team_name} — Innings {inn.innings_number}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Bowling: {inn.bowling_team_name}
                </span>
              </div>
              <div className="text-right">
                <span className="font-score text-2xl font-bold text-white tabular-nums">
                  {inn.runs}/{inn.wickets}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1.5 tabular-nums">
                  ({inn.overs?.completed_overs ?? 0}.{inn.overs?.balls ?? 0} ov)
                </span>
              </div>
            </div>

            {/* Batting Table */}
            <BattingTable
              batters={inn.batting || inn.batters || []}
              extras={inn.extras}
              totals={{
                runs: inn.runs,
                wickets: inn.wickets,
                overs: inn.overs,
              }}
            />

            {/* Bowling Table */}
            <BowlingTable bowlers={inn.bowling || inn.bowlers || []} />

            {/* Partnerships Breakdown */}
            {inn.partnerships && inn.partnerships.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Partnerships Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {inn.partnerships.map((p, idx) => {
                    const b1 = p.batters?.[0] || p.batter_1;
                    const b2 = p.batters?.[1] || p.batter_2;
                    const b1Name = b1?.player_name || 'Batter 1';
                    const b2Name = b2?.player_name || 'Batter 2';
                    const pRuns = p.runs ?? p.total_runs ?? 0;
                    return (
                      <div
                        key={idx}
                        className="bg-[#12161f] p-2.5 rounded-lg border border-[#21262d] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="font-bold text-white">{b1Name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">&</span>
                          <span className="font-bold text-white">{b2Name}</span>
                        </div>
                        <span className="font-score font-bold text-white text-xs tabular-nums">
                          {pRuns}{' '}
                          <span className="text-slate-400 font-mono text-[10px] font-normal">
                            ({p.balls}b)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fall of Wickets */}
            {inn.fall_of_wickets && inn.fall_of_wickets.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Fall of Wickets
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {inn.fall_of_wickets.map((fow) => (
                    <div
                      key={fow.wicket_number}
                      className="bg-[#12161f] px-2.5 py-1 rounded-lg border border-[#21262d] text-slate-300 text-[11px] tabular-nums"
                    >
                      <strong className="text-rose-400 font-score">{fow.score}/{fow.wicket_number}</strong>{' '}
                      ({fow.player_name}, {fow.overs?.completed_overs ?? 0}.{fow.overs?.balls ?? 0} ov)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
