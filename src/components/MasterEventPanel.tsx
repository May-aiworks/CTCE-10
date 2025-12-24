import React from 'react';
import { MasterEvent } from '../services/masterEvents';
import { NormalizedEvent } from '../services/googleCalendar';
import { WeekCalendarView } from './WeekCalendarView';
import './MasterEventPanel.css';

// Event Card for Kanban Board (draggable)
const KanbanEventCard: React.FC<{
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

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(event));
    e.dataTransfer.setData('text/plain', event.title);
    console.log('📦 Kanban card drag started:', event.title);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    console.log('✋ Kanban card drag ended');
  };

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      className="kanban-event-card"
      style={style}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={() => onDoubleClick(event)}
    >
      <div className="kanban-event-title">{event.title}</div>
      <div className="kanban-event-time">
        {event.startDateTime && formatDateTime(event.startDateTime)}
        {event.startDateTime && event.endDateTime && ' – '}
        {event.endDateTime && new Date(event.endDateTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </div>
    </div>
  );
};

// Kanban Column Component (Course Card)
const KanbanColumn: React.FC<{
  course: MasterEvent;
  events: NormalizedEvent[];
  onRemove: (courseId: string) => void;
  onDoubleClick: (courseId: string) => void;
  onEventDrop?: (courseId: string, eventData: string) => void;
  onEventDoubleClick: (event: NormalizedEvent) => void;
}> = ({ course, events, onRemove, onDoubleClick, onEventDrop, onEventDoubleClick }) => {
  const [isOver, setIsOver] = React.useState(false);

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(course.id);
  };

  // 處理拖放事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);

    const eventData = e.dataTransfer.getData('application/json');
    if (eventData && onEventDrop) {
      onEventDrop(course.id, eventData);
      console.log('📦 Event dropped on course:', course.title);
    }
  };

  return (
    <div
      className={`kanban-column ${isOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="kanban-column-header">
        <div
          className="kanban-column-title"
          onDoubleClick={() => onDoubleClick(course.id)}
          title="雙擊展開周視圖"
        >
          {course.title}
          <span className="kanban-event-count">({events.length})</span>
        </div>
        <button
          className="kanban-column-remove"
          onClick={handleRemoveClick}
          title="移除課程並捨棄所有相關記錄"
        >
          ✕
        </button>
      </div>
      <div className="kanban-column-body">
        {events.length === 0 ? (
          <div className="kanban-empty-hint">
            {isOver ? '放開以分類' : '拖曳事件至此'}
          </div>
        ) : (
          events.map(event => (
            <KanbanEventCard
              key={event.id}
              event={event}
              onDoubleClick={onEventDoubleClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface MasterEventPanelProps {
  courses: MasterEvent[];
  onRemoveCourse: (courseId: string) => void;
  onCourseDoubleClick: (courseId: string) => void;
  isWeekViewActive: boolean;
  weekViewCourseId: string | null;
  onCloseWeekView: () => void;
  categorizedEvents: NormalizedEvent[];
  categorizations: { personalEventId: string; masterEventId: string }[];
  weekOffset: number;
  onEventUpdate?: (eventId: string, newStartDateTime: string, newEndDateTime: string) => void;
  onEventDropOnCourse?: (courseId: string, eventData: string) => void;
  onEventDoubleClick: (event: NormalizedEvent) => void;
}

export const MasterEventPanel: React.FC<MasterEventPanelProps> = ({
  courses,
  onRemoveCourse,
  onCourseDoubleClick,
  isWeekViewActive,
  weekViewCourseId,
  onCloseWeekView,
  categorizedEvents,
  categorizations,
  weekOffset,
  onEventUpdate,
  onEventDropOnCourse,
  onEventDoubleClick,
}) => {
  const selectedCourse = weekViewCourseId
    ? courses.find(c => c.id === weekViewCourseId)
    : null;

  // Group categorized events by course
  const getEventsForCourse = (courseId: string) => {
    const relatedCategorizations = categorizations.filter(
      cat => cat.masterEventId === courseId
    );
    return categorizedEvents.filter(event =>
      relatedCategorizations.find(cat => cat.personalEventId === event.googleEventId)
    );
  };

  return (
    <div className="master-event-panel-wrapper">
      {/* Kanban Board (hidden when week view is active) */}
      <div className={`master-event-panel ${isWeekViewActive ? 'hide' : ''}`}>
        <h2 className="panel-title">Courses in Progress</h2>
        <div className="kanban-board">
          {courses.length === 0 ? (
            <div className="empty-state">
              <p>請先點擊「選擇課程」按鈕選擇要顯示的課程</p>
            </div>
          ) : (
            courses.map(course => (
              <KanbanColumn
                key={course.id}
                course={course}
                events={getEventsForCourse(course.id)}
                onRemove={onRemoveCourse}
                onDoubleClick={onCourseDoubleClick}
                onEventDrop={onEventDropOnCourse}
                onEventDoubleClick={onEventDoubleClick}
              />
            ))
          )}
        </div>
      </div>

      {/* Week View Panel (slides in from right) */}
      {isWeekViewActive && selectedCourse && (
        <div className="week-view-panel">
          <div className="week-view-header">
            <h2 className="week-view-title">
              {selectedCourse.title} - 周視圖
            </h2>
            <button
              className="week-view-close"
              onClick={onCloseWeekView}
              title="關閉周視圖"
            >
              ✕
            </button>
          </div>
          <div className="week-view-content">
            <WeekCalendarView
              courseId={selectedCourse.id}
              courseName={selectedCourse.title}
              categorizedEvents={categorizedEvents}
              weekOffset={weekOffset}
              onEventUpdate={onEventUpdate}
            />
          </div>
        </div>
      )}
    </div>
  );
};
