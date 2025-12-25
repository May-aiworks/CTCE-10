import React, { useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'moment/locale/zh-tw';
import { NormalizedEvent } from '../services/googleCalendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './WeekCalendarView.css';

// 設定 moment 為繁體中文
moment.locale('zh-tw');

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface WeekCalendarViewProps {
  courseId: string;
  courseName: string;
  categorizedEvents: NormalizedEvent[];
  weekOffset: number;
  onEventUpdate?: (eventId: string, newStartDateTime: string, newEndDateTime: string) => void;
}

// 定義 React Big Calendar 的事件格式
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: NormalizedEvent; // 保留原始事件資料
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  categorizedEvents,
  onEventUpdate,
  weekOffset,
}) => {
  // 將 NormalizedEvent 轉換為 React Big Calendar 的格式
  const events: CalendarEvent[] = useMemo(() => {
    return categorizedEvents.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startDateTime),
      end: new Date(event.endDateTime),
      resource: event,
    }));
  }, [categorizedEvents]);

  // 計算週的起始日期（根據 weekOffset）
  const weekStartDate = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sunday) - 6 (Saturday)
    const diff = now.getDate() - currentDay + (weekOffset * 7);
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }, [weekOffset]);


  // 處理事件拖放
  const handleEventDrop = useCallback(
    ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      if (!onEventUpdate) return;

      const startISO = (start as Date).toISOString();
      const endISO = (end as Date).toISOString();

      console.log(`📅 Event dropped: ${event.title}`, {
        old: { start: event.start, end: event.end },
        new: { start: startISO, end: endISO },
      });

      onEventUpdate(event.id, startISO, endISO);
    },
    [onEventUpdate]
  );

  // 處理事件 resize（調整時長）
  const handleEventResize = useCallback(
    ({ event, start, end }: EventInteractionArgs<CalendarEvent>) => {
      if (!onEventUpdate) return;

      const startISO = (start as Date).toISOString();
      const endISO = (end as Date).toISOString();

      console.log(`⏰ Event resized: ${event.title}`, {
        old: { start: event.start, end: event.end },
        new: { start: startISO, end: endISO },
      });

      onEventUpdate(event.id, startISO, endISO);
    },
    [onEventUpdate]
  );

  // 自訂事件樣式
  const eventStyleGetter = useCallback(() => {
    return {
      style: {
        backgroundColor: '#667eea',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        width: '100%',
        left: '0%',
        marginLeft: 0,
        marginRight: 0,
      },
    };
  }, []);

  // 自訂時間格式
  const formats = useMemo(() => ({
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => {
      return `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`;
    },
    dayFormat: 'ddd M/D',
    dayHeaderFormat: 'YYYY年M月D日 dddd',
  }), []);

  // 繁體中文訊息
  const messages = useMemo(() => ({
    date: '日期',
    time: '時間',
    event: '事件',
    allDay: '全天',
    week: '週',
    work_week: '工作週',
    day: '日',
    month: '月',
    previous: '上一週',
    next: '下一週',
    yesterday: '昨天',
    tomorrow: '明天',
    today: '今天',
    agenda: '議程',
    noEventsInRange: '此時段沒有事件',
    showMore: (total: number) => `+${total} 更多`,
  }), []);

  // 處理原生 drop 事件 - 從外部拖入
  const handleNativeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    const eventData = e.dataTransfer.getData('application/json');
    if (!eventData || !onEventUpdate) return;

    try {
      const draggedEvent: NormalizedEvent = JSON.parse(eventData);

      // 計算拖放位置的時間
      const calendarElement = e.currentTarget.querySelector('.rbc-time-content');
      if (!calendarElement) return;

      const rect = calendarElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 計算是哪一天（假設有7天）
      const dayWidth = rect.width / 7;
      const dayIndex = Math.floor(x / dayWidth);

      // 計算是幾點（假設24小時，每小時60px）
      const hourHeight = 60;
      const hour = Math.floor(y / hourHeight);
      const minute = Math.floor((y % hourHeight) / hourHeight * 60);

      // 對齊到30分鐘
      const alignedMinute = Math.round(minute / 30) * 30;

      // 使用計算好的 weekStartDate
      const newStart = new Date(weekStartDate);
      newStart.setDate(weekStartDate.getDate() + dayIndex);
      newStart.setHours(hour, alignedMinute, 0, 0);

      // 保持原始時長
      const duration = draggedEvent.durationMinutes || 60;
      const newEnd = new Date(newStart);
      newEnd.setMinutes(newEnd.getMinutes() + duration);

      console.log('📅 Dropped at:', {
        weekOffset,
        weekStart: weekStartDate.toISOString(),
        dayIndex,
        hour,
        minute: alignedMinute,
        newStart: newStart.toISOString()
      });
      onEventUpdate(draggedEvent.id, newStart.toISOString(), newEnd.toISOString());
    } catch (err) {
      console.error('❌ Failed to handle drop:', err);
    }
  }, [onEventUpdate, weekStartDate, weekOffset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="week-calendar-view">
      <div
        className="week-calendar-content"
        onDragOver={handleDragOver}
        onDrop={handleNativeDrop}
      >
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="week"
          views={['week', 'day']}
          date={weekStartDate} // 設定顯示的週
          onNavigate={() => {}} // 禁用內建的導航（使用自訂的週導航）
          step={30} // 30 分鐘間隔
          timeslots={2} // 每小時顯示 2 格（每格 30 分鐘）
          min={new Date(0, 0, 0, 0, 0, 0)} // 從 00:00 開始
          max={new Date(0, 0, 0, 23, 59, 59)} // 到 23:59 結束
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          resizable
          draggableAccessor={() => true} // 所有事件都可拖動
          eventPropGetter={eventStyleGetter}
          formats={formats}
          messages={messages}
          style={{ height: '100%' }}
          toolbar={false} // 隱藏內建 toolbar，使用自訂週導航
          scrollToTime={new Date(0, 0, 0, 8, 0, 0)} // 預設滾動到早上 8 點
        />
      </div>
    </div>
  );
};
