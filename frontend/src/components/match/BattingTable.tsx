import React from 'react';
import type { BatterScorecard, ExtrasBreakdown, OversRecord } from '../../types/cricket';

export interface BattingTableTotals {
  runs: number;
  wickets: number;
  overs: OversRecord;
}

export interface BattingTableProps {
  batters: BatterScorecard[];
  extras?: ExtrasBreakdown;
  totals?: BattingTableTotals;
  className?: string;
}

export const BattingTable: React.FC<BattingTableProps> = ({
  batters,
  extras,
  totals,
  className = '',
}) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-[#21262d] bg-[#161b22] ${className}`.trim()}>
      <table className="w-full text-left text-xs tabular-nums">
        <thead>
          <tr className="border-b border-[#21262d] bg-[#12161f] text-[10px] font-black uppercase tracking-wider text-slate-400">
            <th className="py-2.5 px-4 font-bold">Batter</th>
            <th className="py-2.5 px-3">Dismissal</th>
            <th className="py-2.5 px-2.5 text-right font-black">R</th>
            <th className="py-2.5 px-2 text-right">B</th>
            <th className="py-2.5 px-2 text-right">4s</th>
            <th className="py-2.5 px-2 text-right">6s</th>
            <th className="py-2.5 px-3 text-right">SR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#21262d]/60">
          {batters.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-center text-slate-500 text-xs">
                No batting data available
              </td>
            </tr>
          ) : (
            batters.map((b) => {
              const sr = Number(b.strike_rate) || 0;
              const srColor =
                sr >= 150
                  ? 'text-emerald-400 font-bold'
                  : sr >= 120
                  ? 'text-sky-400 font-semibold'
                  : sr < 90 && b.balls > 5
                  ? 'text-amber-400/90'
                  : 'text-slate-300';

              return (
                <tr
                  key={b.player_id}
                  className={`odd:bg-[#161b22] even:bg-[#12161f]/60 hover:bg-[#21262d]/70 transition-colors ${
                    !b.is_out ? 'border-l-2 border-[#38bdf8]' : 'border-l-2 border-transparent'
                  }`}
                >
                  <td className={`py-2.5 px-4 whitespace-nowrap ${!b.is_out ? 'font-extrabold text-white' : 'font-bold text-white'}`}>
                    {b.player_name}
                    {!b.is_out && <span className="text-[#38bdf8] font-black ml-1">*</span>}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-[220px] whitespace-normal">
                    {b.is_out && b.dismissal ? (
                      <span className="italic">
                        <span className="capitalize">{b.dismissal.wicket_type.replace('_', ' ')}</span>
                        {b.dismissal.fielder_name && ` c ${b.dismissal.fielder_name}`}
                        {b.dismissal.bowler_name && ` b ${b.dismissal.bowler_name}`}
                      </span>
                    ) : (
                      <span className="text-[#38bdf8] font-bold text-[10px] uppercase tracking-wide">
                        not out
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-score font-bold text-white text-base">
                    {b.runs}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-400 font-mono font-medium">
                    {b.balls}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {b.fours > 0 ? (
                      <span className="text-sky-400 font-semibold font-mono">{b.fours}</span>
                    ) : (
                      <span className="text-slate-600 font-mono">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {b.sixes > 0 ? (
                      <span className="text-emerald-400 font-black font-mono">{b.sixes}</span>
                    ) : (
                      <span className="text-slate-600 font-mono">0</span>
                    )}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${srColor}`}>
                    {sr.toFixed(1)}
                  </td>
                </tr>
              );
            })
          )}

          {/* Extras Row */}
          {extras && (
            <tr className="bg-[#12161f] text-slate-400 text-[11px] border-t border-[#21262d]">
              <td className="py-2 px-4 font-bold text-slate-300">Extras</td>
              <td colSpan={6} className="py-2 px-3 text-right">
                <span className="font-score font-bold text-white text-sm mr-2">{extras.total}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (b {extras.byes}, lb {extras.leg_byes}, w {extras.wides}, nb {extras.no_balls})
                </span>
              </td>
            </tr>
          )}

          {/* Total Row */}
          {totals && (
            <tr className="bg-[#12161f] font-bold text-white border-t-2 border-[#21262d]">
              <td className="py-2.5 px-4 font-black tracking-wide text-xs">Total</td>
              <td colSpan={6} className="py-2.5 px-3 text-right">
                <span className="font-score text-lg font-bold text-white mr-2">
                  {totals.runs}/{totals.wickets}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({totals.overs?.completed_overs ?? 0}.{totals.overs?.balls ?? 0} Overs)
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
