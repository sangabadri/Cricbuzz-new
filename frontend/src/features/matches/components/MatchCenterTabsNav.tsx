import React from 'react';
import { Activity, Radio, ScrollText, Users } from 'lucide-react';

export type MatchCenterTab = 'crease' | 'scorecard' | 'squads' | 'commentary';

interface MatchCenterTabsNavProps {
  activeTab: MatchCenterTab;
  onTabChange: (tab: MatchCenterTab) => void;
}

const TABS = [
  { id: 'crease', label: 'Crease Analysis', icon: Radio, mobileOnly: false },
  { id: 'scorecard', label: 'Full Scorecard', icon: ScrollText, mobileOnly: false },
  { id: 'commentary', label: 'Commentary', icon: Activity, mobileOnly: true },
  { id: 'squads', label: 'Playing XI & Squads', icon: Users, mobileOnly: false },
] as const;

export const MatchCenterTabsNav: React.FC<MatchCenterTabsNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex border-b border-[#21262d] gap-2 overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              tab.mobileOnly ? 'lg:hidden ' : ''
            }${
              activeTab === tab.id
                ? 'border-[#0070f3] text-sky-400 bg-[#0070f3]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
