import React from 'react';
import type { LiveCurrentOverBall } from '../../types/cricket';

export interface BallBubbleProps {
  ball: LiveCurrentOverBall | string | number;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

export const BallBubble: React.FC<BallBubbleProps> = ({
  ball,
  size = 'md',
  animate = false,
  className = '',
}) => {
  let isWicket = false;
  let isWide = false;
  let isNoBall = false;
  let isLegBye = false;
  let isBye = false;
  let runs = 0;
  let text = '';

  if (typeof ball === 'object' && ball !== null) {
    isWicket = !!ball.is_wicket;
    isWide = ball.extra_type === 'wide';
    isNoBall = ball.extra_type === 'noball';
    isLegBye = ball.extra_type === 'leg-bye';
    isBye = ball.extra_type === 'bye';
    runs = ball.runs ?? 0;

    if (isWicket) {
      text = 'W';
    } else if (isWide) {
      text = ball.extras && ball.extras > 1 ? `${ball.extras}Wd` : 'Wd';
    } else if (isNoBall) {
      text = ball.extras && ball.extras > 1 ? `${ball.extras}Nb` : 'Nb';
    } else if (isLegBye) {
      text = `${ball.extras ?? 1}Lb`;
    } else if (isBye) {
      text = `${ball.extras ?? 1}B`;
    } else if (runs === 0) {
      text = '•';
    } else {
      text = String(runs);
    }
  } else {
    const raw = ball !== undefined && ball !== null ? String(ball).trim() : '';
    isWicket = raw === 'W';
    isWide = raw.includes('Wd');
    isNoBall = raw.includes('Nb');
    isLegBye = raw.includes('Lb');
    isBye = raw.includes('B') && !raw.includes('Nb');
    runs = Number(raw) || 0;
    text = raw === '0' ? '•' : raw;
  }

  // Dimension classes
  const dimensionClasses = {
    sm: 'w-6 h-6 text-[11px] font-semibold',
    md: 'w-7 h-7 text-xs font-bold',
    lg: 'w-9 h-9 text-sm font-extrabold',
  }[size];

  // Broadcast Color styling
  let colorClasses = 'bg-[#161b22] text-[#f0f6fc] border-[#30363d]';

  if (isWicket) {
    colorClasses = 'bg-[#ea0029] text-white border-[#f43f5e] shadow-sm shadow-[#ea0029]/40 font-black ring-1 ring-[#ea0029]/50';
  } else if (isWide || isNoBall || isLegBye || isBye) {
    colorClasses = 'bg-[#d97706] text-white border-[#f59e0b] font-bold shadow-sm';
  } else if (runs === 4 || text === '4') {
    colorClasses = 'bg-[#0284c7] text-white border-[#38bdf8] font-black ring-1 ring-[#0284c7]/40 shadow-sm shadow-sky-950/40';
  } else if (runs === 6 || text === '6') {
    colorClasses = 'bg-[#10b981] text-white border-[#34d399] font-black ring-1 ring-[#10b981]/50 shadow-sm shadow-emerald-950/40';
  } else if (text === '•' || runs === 0) {
    colorClasses = 'bg-[#161b22] text-[#6e7681] border-[#30363d] font-bold';
  } else {
    // 1, 2, 3, 5 runs
    colorClasses = 'bg-[#21262d] text-[#f0f6fc] border-[#30363d] font-bold';
  }

  const animationClass = animate ? 'animate-delivery-pop' : '';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border tabular-nums transition-transform ${dimensionClasses} ${colorClasses} ${animationClass} ${className}`.trim()}
    >
      {text}
    </span>
  );
};
