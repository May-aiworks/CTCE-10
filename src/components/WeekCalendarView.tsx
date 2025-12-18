import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { NormalizedEvent } from '../services/googleCalendar';
import './WeekCalendarView.css';

interface WeekCalendarViewProps {
  courseId: string;
  courseName: string;
  categorizedEvents: NormalizedEvent[];
  weekOffset: number;
  onEventUpdate?: (eventId: string, newStartDateTime: string, newEndDateTime: string) => void;
}

// Draggable Event Component
const DraggableEvent: React.FC<{
  event: NormalizedEvent;
  position: { column: number; row: number; top: number; height: number };
}> = ({ event, position }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const style: React.CSSProperties = {
    gridColumn: position.column,
    gridRow: position.row,
    marginTop: `${position.top}px`,
    height: `${Math.max(position.height, 30)}px`,
    cursor: 'move',
    opacity: isDragging ? 0.5 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className="calendar-event"
      style={style}
      {...attributes}
      {...listeners}
      title={`${event.title}\n${event.startDateTime} - ${event.endDateTime}`}
    >
      <div className="event-content">
        <div className="event-title-sm">{event.title}</div>
        <div className="event-time-sm">
          {new Date(event.startDateTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </div>
      </div>
    </div>
  );
};

// Droppable Time Slot Component
const DroppableTimeSlot: React.FC<{
  hour: number;
  dayIndex: number;
}> = ({ hour, dayIndex }) => {
  const droppableId = `slot-${hour}-${dayIndex}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { hour, dayIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={`time-slot ${isOver ? 'drag-over' : ''}`}
      data-hour={hour}
      data-day={dayIndex}
    >
      {/* Events will be positioned here */}
    </div>
  );
};

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  courseId,
  courseName,
  categorizedEvents,
  weekOffset,
  onEventUpdate,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  // Calculate event position in grid
  const calculateEventPosition = (event: NormalizedEvent) => {
    const startTime = new Date(event.startDateTime);
    const dayOfWeek = startTime.getDay(); // 0-6 (Sunday-Saturday)
    const hour = startTime.getHours();
    const minute = startTime.getMinutes();
    const durationMinutes = event.durationMinutes;

    return {
      column: dayOfWeek + 2, // +2 because first column is time labels
      row: hour + 2, // +2 because first row is header
      top: minute, // minute offset within the hour
      height: durationMinutes, // height in minutes
    };
  };

  return (
    <div className="week-calendar-view">
        <div className="calendar-grid">
          {/* Header Row */}
          <div className="time-header"></div>
          {days.map((day, index) => (
            <div key={index} className="day-header">
              {day}
            </div>
          ))}

          {/* Time slots */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="time-label">
                {hour.toString().padStart(2, '0')}:00
              </div>

              {/* Day columns */}
              {days.map((_, dayIndex) => (
                <DroppableTimeSlot
                  key={`${hour}-${dayIndex}`}
                  hour={hour}
                  dayIndex={dayIndex}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

      {/* Render events */}
      <div className="calendar-events">
        {categorizedEvents.map(event => {
          const pos = calculateEventPosition(event);
          return (
            <DraggableEvent
              key={event.id}
              event={event}
              position={pos}
            />
          );
        })}
      </div>
    </div>
  );
};
