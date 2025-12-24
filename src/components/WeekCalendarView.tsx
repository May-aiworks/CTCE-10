import React from 'react';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NormalizedEvent } from '../services/googleCalendar';
import './WeekCalendarView.css';

interface WeekCalendarViewProps {
  courseId: string;
  courseName: string;
  categorizedEvents: NormalizedEvent[];
  weekOffset: number;
  onEventUpdate?: (eventId: string, newStartDateTime: string, newEndDateTime: string) => void;
}

// 計算事件高度（基於時長）
const HOUR_HEIGHT = 60; // 每小時 60px

const calculateEventHeight = (durationMinutes: number): number => {
  // 直接按比例計算高度，不減去 padding（因為 padding 是內部空間）
  // 半小時 = 30px，1小時 = 60px，2小時 = 120px
  const actualHeight = (durationMinutes / 60) * HOUR_HEIGHT;
  return Math.max(actualHeight, 30); // 最小高度 30px（半小時）
};

// Sortable Event Component
const SortableEvent: React.FC<{
  event: NormalizedEvent;
  slotId: string;
  dayIndex: number;
  hour: number;
}> = ({ event, slotId, dayIndex, hour }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slotId,
    data: { event, dayIndex, hour },
  });

  // 計算分鐘偏移
  const startTime = new Date(event.startDateTime);
  const minuteOffset = startTime.getMinutes();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    height: `${calculateEventHeight(event.durationMinutes)}px`,
    position: 'absolute',
    top: `${minuteOffset}px`,
    left: '0',
    right: '0',
    gridColumn: dayIndex + 2, // +2 因為第一欄是時間標籤
    gridRow: hour + 2, // 只佔據起始小時的格子
    cursor: 'grab',
    pointerEvents: 'auto',
    zIndex: 10, // 確保事件在格子上方
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
        <div className="event-duration">
          {event.durationMinutes >= 60
            ? `${Math.floor(event.durationMinutes / 60)}h ${event.durationMinutes % 60}m`
            : `${event.durationMinutes}m`}
        </div>
      </div>
    </div>
  );
};

// Sortable Time Slot Component
const SortableTimeSlot: React.FC<{
  slotId: string;
  hour: number;
  dayIndex: number;
  event?: NormalizedEvent;
}> = ({ slotId, hour, dayIndex, event }) => {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: slotId,
    data: { hour, dayIndex, isEmpty: !event },
  });

  // 如果這個格子有事件，不渲染空格子（事件會自己渲染）
  if (event) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={`time-slot ${isOver ? 'drag-over' : ''}`}
      data-hour={hour}
      data-day={dayIndex}
    />
  );
};

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  categorizedEvents,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  // 建立時間格子的映射表（哪個時間有哪個事件）
  const eventsBySlot = React.useMemo(() => {
    const map = new Map<string, NormalizedEvent>();

    categorizedEvents.forEach(event => {
      const startTime = new Date(event.startDateTime);
      const dayIndex = startTime.getDay();
      const hour = startTime.getHours();
      const slotId = `slot-${dayIndex}-${hour}`;
      map.set(slotId, event);
    });

    return map;
  }, [categorizedEvents]);

  // 建立所有格子的 ID 列表（用於 SortableContext）
  const allSlotIds = React.useMemo(() => {
    const ids: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let d = 0; d < 7; d++) {
        ids.push(`slot-${d}-${h}`);
      }
    }
    return ids;
  }, []);

  return (
    <SortableContext items={allSlotIds} strategy={rectSortingStrategy}>
      <div className="week-calendar-view">
        <div className="calendar-grid">
          {/* Header Row */}
          <div className="time-header"></div>
          {days.map((day, index) => (
            <div key={index} className="day-header">
              {day}
            </div>
          ))}

          {/* Time slots and events */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="time-label">
                {hour.toString().padStart(2, '0')}:00
              </div>

              {/* Day columns */}
              {days.map((_, dayIndex) => {
                const slotId = `slot-${dayIndex}-${hour}`;
                const event = eventsBySlot.get(slotId);

                // 如果有事件，渲染事件卡片
                if (event) {
                  return (
                    <SortableEvent
                      key={slotId}
                      slotId={slotId}
                      event={event}
                      dayIndex={dayIndex}
                      hour={hour}
                    />
                  );
                }

                // 沒有事件，渲染空格子
                return (
                  <SortableTimeSlot
                    key={slotId}
                    slotId={slotId}
                    hour={hour}
                    dayIndex={dayIndex}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </SortableContext>
  );
};
