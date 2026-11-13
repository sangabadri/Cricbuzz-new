import React from 'react';
import type { DeliveryResponse } from '../../types/cricket';
import { CommentaryFeed } from './CommentaryFeed';

export interface CommentaryTabProps {
  deliveries: DeliveryResponse[];
  inningsNumber?: number;
  availableInnings?: number[];
  onInningsChange?: (innings: number) => void;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export const CommentaryTab: React.FC<CommentaryTabProps> = ({
  deliveries,
  inningsNumber,
  availableInnings,
  onInningsChange,
  title = 'Live Commentary Stream',
  emptyMessage,
  className = '',
}) => {
  return (
    <div className={className}>
      <CommentaryFeed
        deliveries={deliveries}
        title={title}
        emptyMessage={emptyMessage}
        inningsNumber={inningsNumber}
        availableInnings={availableInnings}
        onInningsChange={onInningsChange}
      />
    </div>
  );
};
