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
}> = ({ course, onRemove, onDoubleClick }) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(course.id);
  };

  return (
    <div
      className="course-card"
      onDoubleClick={() => onDoubleClick(course.id)}
      title="雙擊展開周視圖"
    >
      <span className="course-card-title">{course.title}</span>
      <div className="course-card-hint">雙擊展開</div>
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
