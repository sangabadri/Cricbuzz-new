import React from 'react';
import type { BowlerScorecard } from '../../types/cricket';

export interface BowlingTableProps {
  bowlers: BowlerScorecard[];
  className?: string;
}

export const BowlingTable: React.FC<BowlingTableProps> = ({ bowlers, className = '' }) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-[#21262d] bg-[#161b22] ${className}`.trim()}>
      <table className="w-full text-left text-xs tabular-nums">
        <thead>
          <tr className="border-b border-[#21262d] bg-[#12161f] text-[10px] font-black uppercase tracking-wider text-slate-400">
            <th className="py-2.5 px-4 font-bold">Bowler</th>
            <th className="py-2.5 px-3 text-right">O</th>
            <th className="py-2.5 px-2 text-right">M</th>
            <th className="py-2.5 px-2.5 text-right font-medium">R</th>
            <th className="py-2.5 px-2.5 text-right font-black">W</th>
            <th className="py-2.5 px-3 text-right">Econ</th>
            <th className="py-2.5 px-2 text-right">Wd</th>
            <th className="py-2.5 px-2 text-right">Nb</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#21262d]/60">
          {bowlers.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-4 text-center text-slate-500 text-xs">
                No bowling data available
              </td>
            </tr>
          ) : (
            bowlers.map((bw) => {
              const econ = bw.economy || 0;
              const econColor =
                econ > 0 && econ <= 6.0
                  ? 'text-emerald-400 font-bold'
                  : econ > 6.0 && econ <= 8.5
                  ? 'text-sky-400'
                  : econ > 11.0
                  ? 'text-amber-400/90'
                  : 'text-slate-300';

              return (
                <tr
                  key={bw.player_id}
                  className="odd:bg-[#161b22] even:bg-[#12161f]/60 hover:bg-[#21262d]/70 transition-colors"
                >
                  <td className="py-2.5 px-4 font-bold text-white whitespace-nowrap">
                    {bw.player_name}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                    {bw.overs?.completed_overs ?? 0}.{bw.overs?.balls ?? 0}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-400 font-mono">
                    {bw.maidens}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-white font-mono font-medium">
                    {bw.runs}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-score font-bold text-rose-400 text-base">
                    {bw.wickets}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${econColor}`}>
                    {bw.economy ? bw.economy.toFixed(2) : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-500 font-mono">
                    {bw.wides}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-500 font-mono">
                    {bw.no_balls}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
