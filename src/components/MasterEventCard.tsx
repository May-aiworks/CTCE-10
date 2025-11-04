import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { BookOpen, MapPin, Users } from 'lucide-react';
import { MasterEvent } from '../types';

interface MasterEventCardProps {
  event: MasterEvent;
  categorizedCount: number;  // 已歸類的個人行程數量
  onViewDetails?: (event: MasterEvent) => void;
}

export const MasterEventCard: React.FC<MasterEventCardProps> = ({
  event,
  categorizedCount,
  onViewDetails,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `master-event-${event.id}`,  // 重要：用於拖放識別
  });

  return (
    <div
      ref={setNodeRef}
      className={`master-event-card ${isOver ? 'drag-over' : ''}`}
      onClick={() => onViewDetails?.(event)}
    >
      <div className="master-event-header">
        <BookOpen size={16} />
        <span className="master-event-id">課程 #{event.spreadsheet_row_id}</span>
      </div>

      <h3 className="master-event-title">{event.title}</h3>

      {event.location && (
        <div className="master-event-location">
          <MapPin size={12} />
          <span>{event.location}</span>
        </div>
      )}

      {event.description && (
        <p className="master-event-description">{event.description}</p>
      )}

      <div className="master-event-footer">
        <div className="master-event-stats">
          <Users size={12} />
          <span>{categorizedCount} 個人行程已歸類</span>
        </div>
        <div className="master-event-hint">
          {isOver ? '放開以歸類' : '拖曳個人行程至此'}
        </div>
      </div>
    </div>
  );
};
