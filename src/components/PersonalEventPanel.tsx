import React from 'react';
import { NormalizedEvent } from '../services/googleCalendar';
import './PersonalEventPanel.css';

// Event Card Component with native HTML5 drag and drop
const EventCard: React.FC<{
  event: NormalizedEvent;
  onDoubleClick: (event: NormalizedEvent) => void;
}> = ({ event, onDoubleClick }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${dateStr} ${timeStr}`;
  };

  // Handle drag start - set the event data
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    // 將事件資料存入 dataTransfer
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(event));
    e.dataTransfer.setData('text/plain', event.title);

    console.log('📦 Drag started:', event.title);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    console.log('✋ Drag ended');
  };

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      className="event-card"
      style={style}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={() => onDoubleClick(event)}
    >
      <div className="event-title">{event.title}</div>
      <div className="event-time">
        {event.startDateTime && formatDateTime(event.startDateTime)}
        {event.startDateTime && event.endDateTime && ' – '}
        {event.endDateTime && new Date(event.endDateTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
        {!event.startDateTime && !event.endDateTime && '時間未設定'}
      </div>
    </div>
  );
};

interface PersonalEventPanelProps {
  events: NormalizedEvent[];
  categorizations: { personalEventId: string; masterEventId: string }[];
  onEventDoubleClick: (event: NormalizedEvent) => void;
  onCreateEvent: () => void;
  isWeekViewActive: boolean;
}

export const PersonalEventPanel: React.FC<PersonalEventPanelProps> = ({
  events,
  categorizations,
  onEventDoubleClick,
  onCreateEvent,
  isWeekViewActive,
}) => {
  // Only show uncategorized events
  const uncategorizedEvents = events.filter(
    event => !categorizations.find(cat => cat.personalEventId === event.googleEventId)
  );

  return (
    <div className={`personal-event-panel ${isWeekViewActive ? 'shrink' : ''}`}>
      <div className="panel-header">
        <h2 className="panel-title">Last Week's Schedule</h2>
        <button
          className="create-event-button"
          onClick={onCreateEvent}
          title="新增本地 Personal Event"
        >
          + 新增事件
        </button>
      </div>
      <div className="events-list">
        {uncategorizedEvents.length === 0 ? (
          <div className="empty-state">
            <p>所有事件都已歸類</p>
          </div>
        ) : (
          <div className="events-section">
            <h3 className="section-title">📅 未歸類事件</h3>
            <div className="section-events">
              {uncategorizedEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onDoubleClick={onEventDoubleClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
