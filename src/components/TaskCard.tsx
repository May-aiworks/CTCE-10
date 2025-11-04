import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Calendar, Clock, MapPin } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onDelete?: (taskId: string) => void;
  onEditEvent?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  isDragging = false, 
  onDelete,
  onEditEvent
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isDragging) {
    return (
      <div className={`task-card dragging ${task.calendarEvent ? 'has-event' : ''}`}>
        <div className="task-content">{task.content}</div>
        {task.calendarEvent && (
          <div className="event-indicator">
            <Calendar size={12} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${
        task.calendarEvent?.event_type === 'personal' ? 'personal-event' :
        task.calendarEvent?.event_type === 'master' ? 'master-event' :
        task.calendarEvent ? 'has-event' : ''
      }`}
    >
      <div className="task-content">{task.content}</div>

      {/* ⭐ 顯示事件類型標記 */}
      {task.calendarEvent?.event_type === 'personal' && (
        <div className="event-type-badge personal">個人行程</div>
      )}
      {task.calendarEvent?.event_type === 'master' && (
        <div className="event-type-badge master">課程</div>
      )}
      
      {task.calendarEvent && (
        <div className="event-details">
          <div className="event-time">
            <Clock size={12} />
            <span>{formatDateTime(task.calendarEvent.start_datetime)}</span>
          </div>
          {task.calendarEvent.location && (
            <div className="event-location">
              <MapPin size={12} />
              <span>{task.calendarEvent.location}</span>
            </div>
          )}
          {task.calendarEvent.description && (
            <div className="event-description">
              {task.calendarEvent.description}
            </div>
          )}
        </div>
      )}

      <div className="task-actions">
        {task.calendarEvent && onEditEvent && (
          <button
            className="edit-event-button"
            onClick={(e) => {
              e.stopPropagation();
              onEditEvent(task);
            }}
            title="Edit Calendar Event"
          >
            <Calendar size={14} />
          </button>
        )}
        {onDelete && (
          <button
            className="delete-button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            title="Delete Task"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};