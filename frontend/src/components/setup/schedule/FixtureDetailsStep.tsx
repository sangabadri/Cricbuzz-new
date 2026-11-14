import React from 'react';
import { Calendar } from 'lucide-react';
import type { MatchFormat, Team } from '../../../types/cricket';
import type { MatchScheduleFormData } from '../ScheduleMatchForm';

export interface FixtureDetailsStepProps {
  teams: Team[];
  formData: MatchScheduleFormData;
  onChange: React.Dispatch<React.SetStateAction<MatchScheduleFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const FixtureDetailsStep: React.FC<FixtureDetailsStepProps> = ({
  teams,
  formData,
  onChange,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h2 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#21262d] pb-3">
        <Calendar className="w-4 h-4 text-sky-400" />
        Schedule New Cricket Fixture
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team A */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Team A (Home)
          </label>
          <select
            value={formData.teamAId || ''}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                teamAId: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            required
            className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
          >
            <option value="">Select Team A</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team B */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Team B (Away)
          </label>
          <select
            value={formData.teamBId || ''}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                teamBId: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            required
            className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
          >
            <option value="">Select Team B</option>
            {teams
              .filter((t) => t.id !== formData.teamAId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>

        {/* Venue */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Stadium / Venue
          </label>
          <input
            type="text"
            value={formData.venue}
            onChange={(e) => onChange((prev) => ({ ...prev, venue: e.target.value }))}
            required
            placeholder="e.g. Melbourne Cricket Ground"
            className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
          />
        </div>

        {/* Format */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Match Format
          </label>
          <select
            value={formData.format}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                format: e.target.value as MatchFormat,
              }))
            }
            className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:border-blue-500"
          >
            <option value="t20">T20 (20 Overs)</option>
            <option value="odi">ODI (50 Overs)</option>
          </select>
        </div>

        {/* Date */}
        <div className="md:col-span-2">
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Match Date & Time
          </label>
          <input
            type="datetime-local"
            value={formData.matchDate}
            onChange={(e) => onChange((prev) => ({ ...prev, matchDate: e.target.value }))}
            required
            className="w-full bg-[#12161f] border border-[#21262d] rounded-xl px-3.5 py-2 text-xs text-white focus:border-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 bg-[#0070f3] hover:bg-blue-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
      >
        {isSubmitting ? 'Scheduling...' : 'Next: Setup Squads & Toss'}
      </button>
    </form>
  );
};
