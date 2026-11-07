export interface TeamIdentity {
  name: string;
  shortCode: string;
  primaryColor: string;
  badgeBg: string;
  borderBadge: string;
  textColor: string;
  accentColor: string;
}

const KNOWN_TEAMS: Record<string, Omit<TeamIdentity, 'name'>> = {
  india: {
    shortCode: 'IND',
    primaryColor: '#1d4ed8', // Royal Blue
    badgeBg: 'bg-blue-600/15',
    borderBadge: 'border-blue-500/40',
    textColor: 'text-blue-400',
    accentColor: '#60a5fa',
  },
  australia: {
    shortCode: 'AUS',
    primaryColor: '#eab308', // Canary Gold
    badgeBg: 'bg-yellow-500/15',
    borderBadge: 'border-yellow-500/40',
    textColor: 'text-yellow-400',
    accentColor: '#facc15',
  },
  england: {
    shortCode: 'ENG',
    primaryColor: '#dc2626', // English Red
    badgeBg: 'bg-red-600/15',
    borderBadge: 'border-red-500/40',
    textColor: 'text-red-400',
    accentColor: '#f87171',
  },
  pakistan: {
    shortCode: 'PAK',
    primaryColor: '#16a34a', // Pakistan Green
    badgeBg: 'bg-emerald-600/15',
    borderBadge: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    accentColor: '#4ade80',
  },
  'south africa': {
    shortCode: 'SA',
    primaryColor: '#059669', // Proteas Green
    badgeBg: 'bg-emerald-700/15',
    borderBadge: 'border-emerald-600/40',
    textColor: 'text-emerald-400',
    accentColor: '#eab308',
  },
  'new zealand': {
    shortCode: 'NZ',
    primaryColor: '#334155', // Black Caps
    badgeBg: 'bg-slate-700/30',
    borderBadge: 'border-slate-500/40',
    textColor: 'text-slate-200',
    accentColor: '#94a3b8',
  },
  'west indies': {
    shortCode: 'WI',
    primaryColor: '#9f1239', // Maroon
    badgeBg: 'bg-rose-900/25',
    borderBadge: 'border-rose-700/40',
    textColor: 'text-rose-400',
    accentColor: '#f43f5e',
  },
};

const DYNAMIC_PALETTES = [
  {
    primaryColor: '#0284c7', // Sky
    badgeBg: 'bg-sky-500/15',
    borderBadge: 'border-sky-500/40',
    textColor: 'text-sky-400',
    accentColor: '#38bdf8',
  },
  {
    primaryColor: '#7c3aed', // Purple
    badgeBg: 'bg-purple-500/15',
    borderBadge: 'border-purple-500/40',
    textColor: 'text-purple-400',
    accentColor: '#a78bfa',
  },
  {
    primaryColor: '#ea580c', // Orange
    badgeBg: 'bg-orange-500/15',
    borderBadge: 'border-orange-500/40',
    textColor: 'text-orange-400',
    accentColor: '#fb923c',
  },
  {
    primaryColor: '#0d9488', // Teal
    badgeBg: 'bg-teal-500/15',
    borderBadge: 'border-teal-500/40',
    textColor: 'text-teal-400',
    accentColor: '#2dd4bf',
  },
];

export function getTeamIdentity(teamName?: string, teamId?: number): TeamIdentity {
  const cleanName = (teamName || '').trim().toLowerCase();
  
  if (KNOWN_TEAMS[cleanName]) {
    return {
      name: teamName || 'Team',
      ...KNOWN_TEAMS[cleanName],
    };
  }

  // Generate 3-letter acronym from team name
  const words = (teamName || '').trim().split(/\s+/).filter(Boolean);
  let shortCode = 'T' + (teamId || '1');
  if (words.length >= 2) {
    shortCode = (words[0][0] + words[1][0] + (words[2]?.[0] || words[1][1] || '')).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 3) {
    shortCode = words[0].slice(0, 3).toUpperCase();
  }

  // Pick deterministic palette
  const hash = ((teamId || 0) + (teamName ? teamName.charCodeAt(0) : 0)) % DYNAMIC_PALETTES.length;
  const palette = DYNAMIC_PALETTES[hash];

  return {
    name: teamName || 'Team',
    shortCode,
    ...palette,
  };
}
