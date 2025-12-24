import React from 'react';
import { MasterEvent } from '../services/masterEvents';
import { NormalizedEvent } from '../services/googleCalendar';
import { WeekCalendarView } from './WeekCalendarView';
import './MasterEventPanel.css';

// Course Card Component
const CourseCard: React.FC<{
  course: MasterEvent;
  onRemove: (courseId: string) => void;
  onDoubleClick: (courseId: string) => void;
  onEventDrop?: (courseId: string, eventData: string) => void;
}> = ({ course, onRemove, onDoubleClick, onEventDrop }) => {
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
      className={`course-card ${isOver ? 'drag-over' : ''}`}
      onDoubleClick={() => onDoubleClick(course.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title="雙擊展開周視圖 | 拖曳事件到此處進行分類"
    >
      <span className="course-card-title">{course.title}</span>
      <div className="course-card-hint">
        {isOver ? '放開以分類' : '雙擊展開'}
      </div>
      <button
        className="course-card-remove"
        onClick={handleRemoveClick}
        title="移除課程並捨棄所有相關記錄"
      >
        ✕
      </button>
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
  weekOffset: number;
  onEventUpdate?: (eventId: string, newStartDateTime: string, newEndDateTime: string) => void;
  onEventDropOnCourse?: (courseId: string, eventData: string) => void;
}

export const MasterEventPanel: React.FC<MasterEventPanelProps> = ({
  courses,
  onRemoveCourse,
  onCourseDoubleClick,
  isWeekViewActive,
  weekViewCourseId,
  onCloseWeekView,
  categorizedEvents,
  weekOffset,
  onEventUpdate,
  onEventDropOnCourse,
}) => {
  const selectedCourse = weekViewCourseId
    ? courses.find(c => c.id === weekViewCourseId)
    : null;

  return (
    <div className="master-event-panel-wrapper">
      {/* Courses Grid (hidden when week view is active) */}
      <div className={`master-event-panel ${isWeekViewActive ? 'hide' : ''}`}>
        <h2 className="panel-title">Courses in Progress</h2>
        <div className="courses-grid">
          {courses.length === 0 ? (
            <div className="empty-state">
              <p>請先點擊「選擇課程」按鈕選擇要顯示的課程</p>
            </div>
          ) : (
            courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onRemove={onRemoveCourse}
                onDoubleClick={onCourseDoubleClick}
                onEventDrop={onEventDropOnCourse}
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
