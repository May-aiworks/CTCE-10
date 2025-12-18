import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ResizableSplitter } from './ResizableSplitter';
import { PersonalEventPanel } from './PersonalEventPanel';
import { MasterEventPanel } from './MasterEventPanel';
import {
  fetchAndNormalizeWeeklyEvents,
  NormalizedEvent,
  createLocalPersonalEvent,
  updateLocalPersonalEvent,
  CreateLocalEventRequest,
  clearAllLocalOperations,
} from '../services/googleCalendar';
import { getMasterEvents, MasterEvent } from '../services/masterEvents';
import { getUserCourseCache } from '../services/appsScript';
import {
  getAllCategorizations,
  exportCategorizationsForSubmit,
  CategorizationData,
  getCategorizationsByMasterEventId,
  createCategorization
} from '../services/categorization';
import { submitRecords, getCurrentWeek } from '../services/appsScript';
import { AuthButton } from './AuthButton';
import './WeeklyCategorization.css';

export const WeeklyCategorization: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [weekOffset, setWeekOffset] = useState<number>(-1); // Default to last week
  const [lastWeekEvents, setLastWeekEvents] = useState<NormalizedEvent[]>([]);
  const [allMasterEvents, setAllMasterEvents] = useState<MasterEvent[]>([]);
  const [categorizations, setCategorizations] = useState<CategorizationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [showCourseMenu, setShowCourseMenu] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NormalizedEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourseForWeekView, setSelectedCourseForWeekView] = useState<string | null>(null);
  const [showWeekViewModal, setShowWeekViewModal] = useState(false);
  const [leftColumnWidth, setLeftColumnWidth] = useState<number>(400);
  const [activeEvent, setActiveEvent] = useState<NormalizedEvent | null>(null);

  // Load weekly personal events from Google Calendar
  const loadLastWeekEvents = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchAndNormalizeWeeklyEvents(weekOffset);
      setLastWeekEvents(response.events);

      console.log(`📅 Loaded week ${weekOffset} events:`, response.events.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      console.error('❌ Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, weekOffset]);

  // Load master events from Google Sheets
  const loadMasterEvents = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const events = await getMasterEvents();
      setAllMasterEvents(events);

      console.log('📚 Loaded master events:', events.length);
    } catch (err) {
      console.error('❌ Failed to load master events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load master events');
    }
  }, [isAuthenticated]);

  // Load user's course cache from Google Sheets
  const loadUserCourseCache = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await getUserCourseCache();
      if (response.success && response.courseIds) {
        setSelectedCourseIds(response.courseIds); // 顯示使用者快取中的所有課程
        console.log('🎓 Loaded user course cache:', response.courseIds);
      }
    } catch (err) {
      console.error('❌ Failed to load user course cache:', err);
    }
  }, [isAuthenticated]);

  // Load categorizations from localStorage
  const loadCategorizations = useCallback(() => {
    const cats = getAllCategorizations();
    setCategorizations(cats);
    console.log('🔗 Loaded categorizations:', cats.length);
  }, []);

  // Refresh all data
  const handleRefresh = useCallback(async () => {
    await Promise.allSettled([
      loadLastWeekEvents(),
      loadMasterEvents(),
      loadUserCourseCache(),
    ]);
    loadCategorizations();
  }, [loadLastWeekEvents, loadMasterEvents, loadUserCourseCache, loadCategorizations]);

  // Initial load and reload when week changes
  useEffect(() => {
    if (isAuthenticated) {
      handleRefresh();
    }
  }, [isAuthenticated, weekOffset, handleRefresh]);

  // Handle submit
  const handleSubmit = async () => {
    if (categorizations.length === 0) {
      alert('沒有要提交的記錄');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Export categorizations to submit format
      const records = exportCategorizationsForSubmit();

      // Get current week
      const week = getCurrentWeek();

      console.log('📤 Submitting records:', { week, records });

      // Submit to Google Sheets via Apps Script
      const result = await submitRecords(week, records);

      console.log('✅ Submit result:', result);

      alert(
        `✅ ${result.message}\n\n` +
        `週次: ${week}\n` +
        `新增記錄: ${result.newRecords} 筆\n` +
        `作廢舊記錄: ${result.markedAsInvalid} 筆\n` +
        `Batch ID: ${result.batchId}`
      );

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '提交失敗';
      console.error('❌ Submit failed:', errorMsg);
      setError(errorMsg);
      alert(`❌ 提交失敗：${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle course selection toggle
  const handleCourseToggle = (courseId: string) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  // Handle remove course and its categorizations
  const handleRemoveCourse = (courseId: string) => {
    const course = allMasterEvents.find(c => c.id === courseId);
    if (!course) return;

    // Get all categorizations for this course
    const relatedCategorizations = getCategorizationsByMasterEventId(courseId);
    const recordCount = relatedCategorizations.length;

    // Show confirmation dialog
    const confirmMessage = recordCount > 0
      ? `確定要移除課程「${course.title}」嗎？\n\n這將會捨棄 ${recordCount} 筆相關的歸類記錄。\n此操作無法復原。`
      : `確定要移除課程「${course.title}」嗎？`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Remove course from selected list
    setSelectedCourseIds(prev => prev.filter(id => id !== courseId));

    // Delete all related categorizations
    if (recordCount > 0) {
      const updatedCategorizations = categorizations.filter(
        cat => cat.masterEventId !== courseId
      );
      sessionStorage.setItem('event_categorizations', JSON.stringify(updatedCategorizations));
      setCategorizations(updatedCategorizations);

      console.log(`🗑️ Removed course ${course.title} and ${recordCount} categorizations`);
    }

    alert(`✅ 已移除課程「${course.title}」${recordCount > 0 ? `及 ${recordCount} 筆相關記錄` : ''}`);
  };

  // Handle double click on event to edit
  const handleEventDoubleClick = (event: NormalizedEvent) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  // Handle save edited event (local only)
  const handleSaveEditedEvent = (updatedEvent: Partial<NormalizedEvent>) => {
    if (!editingEvent) return;

    // Check if this is a local event (ID starts with "local_")
    const isLocalEvent = editingEvent.id.startsWith('local_') || editingEvent.googleEventId.startsWith('local_');

    if (isLocalEvent) {
      // Update in localStorage
      updateLocalPersonalEvent(editingEvent.id, {
        title: updatedEvent.title,
        description: updatedEvent.description,
        location: updatedEvent.location,
        startDateTime: updatedEvent.startDateTime,
        endDateTime: updatedEvent.endDateTime,
      });
    }

    // Update in UI state
    setLastWeekEvents(prev =>
      prev.map(event =>
        event.id === editingEvent.id
          ? { ...event, ...updatedEvent }
          : event
      )
    );

    setShowEditModal(false);
    setEditingEvent(null);

    if (isLocalEvent) {
      alert('✅ 本地事件已更新');
    }
  };

  // Handle create new local event
  const handleCreateLocalEvent = (eventData: CreateLocalEventRequest) => {
    try {
      const newEvent = createLocalPersonalEvent(eventData);

      // Add to UI state
      setLastWeekEvents(prev => [...prev, newEvent]);

      setShowCreateModal(false);
      alert('✅ 本地事件已新增');

      console.log('✅ Created local event:', newEvent);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '新增失敗';
      console.error('❌ Failed to create local event:', errorMsg);
      alert(`❌ 新增失敗：${errorMsg}`);
    }
  };

  // Handle double click on course card to open week view
  const handleCourseDoubleClick = (courseId: string) => {
    setSelectedCourseForWeekView(courseId);
    setShowWeekViewModal(true);
  };

  // Handle resizable splitter resize
  const handleSplitterResize = (newLeftWidth: number) => {
    setLeftColumnWidth(newLeftWidth);
    // Save to localStorage
    localStorage.setItem('weekViewLeftColumnWidth', newLeftWidth.toString());
  };

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('weekViewLeftColumnWidth');
    if (savedWidth) {
      setLeftColumnWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Handle clear all local operations
  const handleClearAllOperations = () => {
    const localEventsCount = lastWeekEvents.filter(e =>
      e.id.startsWith('local_') || e.googleEventId.startsWith('local_')
    ).length;
    const categorizationsCount = categorizations.length;

    if (localEventsCount === 0 && categorizationsCount === 0) {
      alert('沒有需要清除的本地操作');
      return;
    }

    const confirmMessage =
      `確定要清除本次所有操作嗎？\n\n` +
      `這將會清除：\n` +
      `- ${localEventsCount} 個本地新增的事件\n` +
      `- ${categorizationsCount} 筆歸類記錄\n\n` +
      `此操作無法復原。`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Clear from sessionStorage
    clearAllLocalOperations();

    // Clear from UI state
    setLastWeekEvents(prev =>
      prev.filter(e => !e.id.startsWith('local_') && !e.googleEventId.startsWith('local_'))
    );
    setCategorizations([]);

    alert('✅ 已清除本次所有操作');
    console.log('✅ All local operations cleared');
  };

  // Handle event update from drag and drop
  const handleEventUpdate = (eventId: string, newStartDateTime: string, newEndDateTime: string) => {
    console.log('🔄 handleEventUpdate called', { eventId, newStartDateTime, newEndDateTime });

    const event = lastWeekEvents.find(e => e.id === eventId);
    if (!event) {
      console.warn(`⚠️ Event ${eventId} not found in lastWeekEvents`);
      console.log('Available events:', lastWeekEvents.map(e => ({ id: e.id, title: e.title })));
      return;
    }

    console.log(`📝 Updating event: ${event.title}`);

    // Check if this is a local event
    const isLocalEvent = event.id.startsWith('local_') || event.googleEventId.startsWith('local_');
    console.log(`🏷️ Is local event: ${isLocalEvent}`);

    if (isLocalEvent) {
      // Update in localStorage
      console.log('💾 Updating in localStorage/sessionStorage');
      updateLocalPersonalEvent(event.id, {
        startDateTime: newStartDateTime,
        endDateTime: newEndDateTime,
      });
    }

    // Update in UI state
    console.log('🎨 Updating UI state');
    setLastWeekEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? {
              ...e,
              startDateTime: newStartDateTime,
              endDateTime: newEndDateTime,
              durationMinutes: Math.floor(
                (new Date(newEndDateTime).getTime() - new Date(newStartDateTime).getTime()) / 60000
              ),
            }
          : e
      )
    );

    console.log(`✅ Event ${event.title} updated to ${newStartDateTime}`);
  };

  // Get the start of the week based on weekOffset
  const getWeekStart = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (weekOffset * 7);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  // Handle drag start - track the active event for DragOverlay
  const handleDragStart = (event: any) => {
    const draggedEvent = event.active.data.current?.event as NormalizedEvent;
    if (draggedEvent) {
      setActiveEvent(draggedEvent);
    }
  };

  // Handle drag end - for dragging from PersonalEventPanel to WeekCalendarView
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('🎯 handleDragEnd triggered', { active: active.id, over: over?.id });

    // Clear active event
    setActiveEvent(null);

    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    // Get the dragged event from PersonalEventPanel
    const draggedEvent = active.data.current?.event as NormalizedEvent;
    if (!draggedEvent) {
      console.log('❌ No dragged event data');
      return;
    }

    console.log('📦 Dragged event:', draggedEvent.title);
    console.log('📍 Drop target data:', over.data.current);

    // Check if dropped on a time slot
    const dropData = over.data.current as { hour: number; dayIndex: number } | undefined;
    if (dropData) {
      const { hour, dayIndex } = dropData;

      console.log(`✅ Dropped on: Day ${dayIndex}, Hour ${hour}`);

      // Calculate new start time based on the drop position
      const weekStart = getWeekStart();
      const newStartDate = new Date(weekStart);
      newStartDate.setDate(weekStart.getDate() + dayIndex);
      newStartDate.setHours(hour, 0, 0, 0);

      // Calculate new end time (preserve duration)
      const newEndDate = new Date(newStartDate);
      newEndDate.setMinutes(newEndDate.getMinutes() + draggedEvent.durationMinutes);

      console.log('🕐 New time:', {
        start: newStartDate.toISOString(),
        end: newEndDate.toISOString(),
        duration: draggedEvent.durationMinutes
      });

      // Update the event time
      handleEventUpdate(
        draggedEvent.id,
        newStartDate.toISOString(),
        newEndDate.toISOString()
      );

      // If dropped on WeekCalendarView, create categorization
      if (selectedCourseForWeekView) {
        const masterEvent = allMasterEvents.find(m => m.id === selectedCourseForWeekView);
        if (masterEvent) {
          console.log(`🎯 Creating categorization to course: ${masterEvent.title}`);

          // Create categorization
          const newCategorization = createCategorization(draggedEvent, masterEvent);

          // Update local state
          setCategorizations(prev => {
            // Remove any existing categorization for this event
            const filtered = prev.filter(c => c.personalEventId !== draggedEvent.googleEventId);
            // Add new categorization
            return [...filtered, newCategorization];
          });

          console.log(`✅ Event categorized to ${masterEvent.title}`);
        }
      }
    } else {
      console.log('⚠️ Drop target is not a time slot');
    }
  };

  // Get courses that are selected by user
  const coursesInProgress = allMasterEvents.filter(masterEvent =>
    selectedCourseIds.includes(masterEvent.id)
  );

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="weekly-categorization">
      <div className="page-header">
        <div className="header-left">
          <h1>Weekly Schedule Review</h1>
        </div>
        <div className="header-right">
          <AuthButton />
          {isAuthenticated && (
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
                選擇課程 ({selectedCourseIds.length})
              </button>
              <button
                className="clear-operations-button"
                onClick={handleClearAllOperations}
                disabled={loading}
                title="清除本次所有操作（本地事件與歸類記錄）"
              >
                清除本次所有操作
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
              <h3>選擇課程</h3>
              <button onClick={() => setShowCourseMenu(false)}>✕</button>
            </div>
            <div className="course-menu-list">
              {allMasterEvents.length === 0 ? (
                <div className="empty-state">
                  <p>沒有可用的課程</p>
                </div>
              ) : (
                allMasterEvents.map(course => (
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
            <div className="course-menu-footer">
              <button
                className="course-menu-ok-button"
                onClick={() => setShowCourseMenu(false)}
              >
                完成勾選
              </button>
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
          <div className={`content-container ${showWeekViewModal ? 'week-view-active' : ''}`}>
            <div
              className="two-column-layout"
              style={{
                gridTemplateColumns: `${leftColumnWidth}px 16px 1fr`
              }}
            >
              {/* Left Panel: Personal Events */}
              <PersonalEventPanel
                events={lastWeekEvents}
                categorizations={categorizations}
                masterEvents={coursesInProgress}
                onEventDoubleClick={handleEventDoubleClick}
                onCreateEvent={() => setShowCreateModal(true)}
                isWeekViewActive={showWeekViewModal}
              />

              {/* Resizable Splitter (always shown) */}
              <ResizableSplitter
                onResize={handleSplitterResize}
                initialLeftWidth={leftColumnWidth}
                minLeftWidth={250}
                minRightWidth={400}
              />

              {/* Right Panel: Master Events */}
              <MasterEventPanel
                courses={coursesInProgress}
                onRemoveCourse={handleRemoveCourse}
                onCourseDoubleClick={handleCourseDoubleClick}
                isWeekViewActive={showWeekViewModal}
                weekViewCourseId={selectedCourseForWeekView}
                onCloseWeekView={() => setShowWeekViewModal(false)}
                categorizedEvents={lastWeekEvents.filter(event => {
                  // Only include events that are categorized to the selected course
                  const categorization = categorizations.find(
                    cat => cat.personalEventId === event.googleEventId
                  );
                  return categorization && categorization.masterEventId === selectedCourseForWeekView;
                })}
                weekOffset={weekOffset}
                onEventUpdate={handleEventUpdate}
              />
            </div>

            {/* Submit Button */}
            <div className="submit-container">
              <button className="submit-button" onClick={handleSubmit}>
                Submit ({categorizations.length} records)
              </button>
            </div>
          </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>編輯事件 (本地)</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveEditedEvent({
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  location: formData.get('location') as string,
                  startDateTime: formData.get('startDateTime') as string,
                  endDateTime: formData.get('endDateTime') as string,
                });
              }}
            >
              <div className="form-group">
                <label htmlFor="title">標題 *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  defaultValue={editingEvent.title}
                  required
                  placeholder="事件標題"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">說明</label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={editingEvent.description}
                  rows={3}
                  placeholder="事件說明"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDateTime">開始時間 *</label>
                  <input
                    type="datetime-local"
                    id="startDateTime"
                    name="startDateTime"
                    defaultValue={editingEvent.startDateTime?.slice(0, 16)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDateTime">結束時間 *</label>
                  <input
                    type="datetime-local"
                    id="endDateTime"
                    name="endDateTime"
                    defaultValue={editingEvent.endDateTime?.slice(0, 16)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location">地點</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  defaultValue={editingEvent.location}
                  placeholder="事件地點"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  取消
                </button>
                <button type="submit" className="primary">
                  儲存 (本地)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>新增 Personal Event (本地)</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const startDateTime = formData.get('startDateTime') as string;
                const endDateTime = formData.get('endDateTime') as string;

                handleCreateLocalEvent({
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  location: formData.get('location') as string,
                  startDateTime: new Date(startDateTime).toISOString(),
                  endDateTime: new Date(endDateTime).toISOString(),
                });
              }}
            >
              <div className="form-group">
                <label htmlFor="create-title">標題 *</label>
                <input
                  type="text"
                  id="create-title"
                  name="title"
                  required
                  placeholder="事件標題"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-description">說明</label>
                <textarea
                  id="create-description"
                  name="description"
                  rows={3}
                  placeholder="事件說明"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="create-startDateTime">開始時間 *</label>
                  <input
                    type="datetime-local"
                    id="create-startDateTime"
                    name="startDateTime"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="create-endDateTime">結束時間 *</label>
                  <input
                    type="datetime-local"
                    id="create-endDateTime"
                    name="endDateTime"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="create-location">地點</label>
                <input
                  type="text"
                  id="create-location"
                  name="location"
                  placeholder="事件地點"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="primary">
                  新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* DragOverlay for showing dragged event */}
      <DragOverlay dropAnimation={null}>
        {activeEvent ? (
          <div className="drag-overlay-event">
            <div className="event-title">{activeEvent.title}</div>
            <div className="event-time">
              {activeEvent.startDateTime && new Date(activeEvent.startDateTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
              {activeEvent.startDateTime && activeEvent.endDateTime && ' – '}
              {activeEvent.endDateTime && new Date(activeEvent.endDateTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
