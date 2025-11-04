import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { RefreshCw } from 'lucide-react';
import { CalendarEvent, MasterEvent, EventCategorization } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { calendarApi, masterEventsApi, dndApi } from '../services/api';
import { AuthButton } from './AuthButton';
import './WeeklyCategorization.css';

// Helper function to get start/end time from event (handles both naming conventions)
const getEventStartTime = (event: CalendarEvent): string => {
  return event.start_datetime || event.start_time || '';
};

const getEventEndTime = (event: CalendarEvent): string => {
  return event.end_datetime || event.end_time || '';
};

// Draggable Event Card Component
const DraggableEventCard: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `personal-event-${event.id}`,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }
    : { cursor: 'grab' };

  const startTime = getEventStartTime(event);
  const endTime = getEventEndTime(event);

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="event-card"
    >
      <div className="event-title">{event.title}</div>
      <div className="event-time">
        {startTime && formatDateTime(startTime)}
        {startTime && endTime && ' – '}
        {endTime && new Date(endTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
        {!startTime && !endTime && '時間未設定'}
      </div>
    </div>
  );
};

// Droppable Course Card Component
const DroppableCourseCard: React.FC<{ course: MasterEvent }> = ({ course }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `master-event-${course.id}`,
  });

  const style = isOver
    ? {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
        transform: 'scale(1.05)',
      }
    : {};

  return (
    <div ref={setNodeRef} className="course-card" style={style}>
      {course.title}
    </div>
  );
};

export const WeeklyCategorization: React.FC = () => {
  const { authStatus } = useAuth();
  const [weekOffset, setWeekOffset] = useState<number>(-1); // Default to last week
  const [lastWeekEvents, setLastWeekEvents] = useState<CalendarEvent[]>([]);
  const [masterEvents, setMasterEvents] = useState<MasterEvent[]>([]);
  const [categorizations, setCategorizations] = useState<EventCategorization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [showCourseMenu, setShowCourseMenu] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // Load weekly personal events based on weekOffset
  const loadLastWeekEvents = useCallback(async () => {
    if (!authStatus?.is_authenticated) return;

    try {
      setLoading(true);
      setError(null);

      const response = await calendarApi.getWeeklyPersonalEvents(weekOffset);
      setLastWeekEvents(response.events);

      console.log(`📅 Loaded week ${weekOffset} events:`, response.events.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      console.error('❌ Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, [authStatus?.is_authenticated, weekOffset]);

  // Load master events (courses)
  const loadMasterEvents = useCallback(async () => {
    if (!authStatus?.is_authenticated) return;

    try {
      const response = await masterEventsApi.getMasterEvents();
      setMasterEvents(response.events);

      console.log('📚 Loaded master events:', response.events.length);
    } catch (err) {
      console.error('❌ Failed to load master events:', err);
    }
  }, [authStatus?.is_authenticated]);

  // Load categorizations (using getCalendarData as recommended)
  const loadCategorizations = useCallback(async () => {
    if (!authStatus?.is_authenticated) return;

    try {
      const response = await dndApi.getCalendarData();
      setCategorizations(response.categorizations);

      console.log('🔗 Loaded categorizations:', response.categorizations.length);
    } catch (err) {
      console.error('❌ Failed to load categorizations:', err);
    }
  }, [authStatus?.is_authenticated]);

  // Refresh all data (independently to avoid one failure blocking others)
  const handleRefresh = useCallback(async () => {
    // Run all requests independently - don't let one failure block the others
    await Promise.allSettled([
      loadLastWeekEvents(),
      loadMasterEvents(),
      loadCategorizations(),
    ]);
  }, [loadLastWeekEvents, loadMasterEvents, loadCategorizations]);

  // Initial load and reload when week changes
  useEffect(() => {
    if (authStatus?.is_authenticated) {
      handleRefresh();
    }
  }, [authStatus?.is_authenticated, weekOffset, handleRefresh]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const eventId = parseInt(event.active.id.toString().replace('personal-event-', ''));
    const draggedEvent = lastWeekEvents.find(e => e.id === eventId);
    setActiveEvent(draggedEvent || null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over) return;

    const personalEventId = parseInt(active.id.toString().replace('personal-event-', ''));
    const masterEventId = parseInt(over.id.toString().replace('master-event-', ''));

    const personalEvent = lastWeekEvents.find(e => e.id === personalEventId);
    const masterEvent = masterEvents.find(e => e.id === masterEventId);

    if (!personalEvent || !masterEvent) return;

    try {
      console.log('🎯 拖放歸類:', {
        personal: personalEvent.title,
        master: masterEvent.title
      });

      const result = await dndApi.createCategorization({
        personal_event_id: personalEventId,
        master_event_id: masterEventId,
        notes: `拖放歸類於 ${new Date().toLocaleString('zh-TW')}`
      });

      console.log('✅ 歸類成功:', result);

      // Reload categorizations
      await loadCategorizations();

      alert(
        `✅ 歸類成功！\n\n` +
        `個人行程: ${personalEvent.title}\n` +
        `→ 課程: ${masterEvent.title}`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '歸類失敗';
      console.error('❌ 歸類失敗:', errorMsg);
      setError(errorMsg);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    console.log('📤 Submitting categorizations:', categorizations);
    alert(`提交 ${categorizations.length} 筆歸類資料`);
  };

  // Handle course selection toggle
  const handleCourseToggle = (courseId: number) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        // Limit to 3 courses
        if (prev.length >= 3) {
          alert('最多只能選擇 3 門課程');
          return prev;
        }
        return [...prev, courseId];
      }
    });
  };

  // Get courses that are "in progress" (user selected courses)
  const coursesInProgress = masterEvents.filter(masterEvent =>
    selectedCourseIds.includes(masterEvent.id)
  );

  return (
    <div className="weekly-categorization">
      <div className="page-header">
        <div className="header-left">
          <h1>Weekly Schedule Review</h1>
        </div>
        <div className="header-right">
          <AuthButton />
          {authStatus?.is_authenticated && (
            <>
              {/* Week Navigation */}
              <div className="week-navigation">
                <button
                  className="nav-button"
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  disabled={loading}
                  title="Previous week"
                >
                  ◀
                </button>
                <span className="week-label">
                  {weekOffset === 0 ? 'This Week' :
                   weekOffset === 1 ? 'Next Week' :
                   weekOffset === -1 ? 'Last Week' :
                   `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
                </span>
                <button
                  className="nav-button"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  disabled={loading}
                  title="Next week"
                >
                  ▶
                </button>
                {weekOffset !== -1 && (
                  <button
                    className="nav-button"
                    onClick={() => setWeekOffset(-1)}
                    disabled={loading}
                    title="Back to last week"
                  >
                    Reset
                  </button>
                )}
              </div>
              <button
                className="refresh-button"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                Refresh
              </button>
              <button
                className="course-menu-button"
                onClick={() => setShowCourseMenu(!showCourseMenu)}
              >
                選擇課程 ({selectedCourseIds.length}/3)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Course Selection Menu */}
      {showCourseMenu && (
        <div className="course-menu-overlay" onClick={() => setShowCourseMenu(false)}>
          <div className="course-menu" onClick={e => e.stopPropagation()}>
            <div className="course-menu-header">
              <h3>選擇課程（最多 3 門）</h3>
              <button onClick={() => setShowCourseMenu(false)}>✕</button>
            </div>
            <div className="course-menu-list">
              {masterEvents.length === 0 ? (
                <div className="empty-state">
                  <p>沒有可用的課程</p>
                </div>
              ) : (
                masterEvents.map(course => (
                  <label key={course.id} className="course-menu-item" htmlFor={`course-${course.id}`}>
                    <input
                      id={`course-${course.id}`}
                      type="checkbox"
                      checked={selectedCourseIds.includes(course.id)}
                      onChange={() => handleCourseToggle(course.id)}
                    />
                    <span>{course.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="content-container">
            <div className="two-column-layout">
              {/* Left Column: Last Week's Schedule */}
              <div className="left-column">
                <h2 className="column-title">Last Week's Schedule</h2>
                <div className="events-list">
                  {lastWeekEvents.length === 0 ? (
                    <div className="empty-state">
                      <p>No events found for this week</p>
                    </div>
                  ) : (
                    lastWeekEvents.map(event => (
                      <DraggableEventCard key={event.id} event={event} />
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Courses in Progress */}
              <div className="right-column">
                <h2 className="column-title">Courses in Progress</h2>
                <div className="courses-grid">
                  {coursesInProgress.length === 0 ? (
                    <div className="empty-state">
                      <p>請先點擊「選擇課程」按鈕選擇最多 3 門課程</p>
                    </div>
                  ) : (
                    coursesInProgress.map(course => (
                      <DroppableCourseCard key={course.id} course={course} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="submit-container">
              <button className="submit-button" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>

          <DragOverlay>
            {activeEvent ? (
              <div className="event-card dragging">
                <div className="event-title">{activeEvent.title}</div>
                <div className="event-time">
                  {(() => {
                    const startTime = getEventStartTime(activeEvent);
                    const endTime = getEventEndTime(activeEvent);
                    if (!startTime && !endTime) return '時間未設定';

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

                    return (
                      <>
                        {startTime && formatDateTime(startTime)}
                        {startTime && endTime && ' – '}
                        {endTime && new Date(endTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};
