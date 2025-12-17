/**
 * Google Calendar API 整合
 * 直接呼叫 Google Calendar API v3
 */

import { getAccessToken } from './googleAuth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  recurrence?: string[];
  recurringEventId?: string;
}

export interface WeeklyEventsResponse {
  events: CalendarEvent[];
  timeMin: string;
  timeMax: string;
  weekStart: Date;
  weekEnd: Date;
  count: number;
}

/**
 * 計算本週範圍（週日到週六）
 */
const getWeekRange = (weekOffset: number = 0): { start: Date; end: Date } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // 計算本週日（週的開始）
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + (weekOffset * 7));
  weekStart.setHours(0, 0, 0, 0);

  // 計算本週六（週的結束）
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
};

/**
 * 取得本週的 Google Calendar 事件
 * @param weekOffset 週偏移量（0 = 本週, 1 = 下週, -1 = 上週）
 * @param calendarId 日曆 ID（預設為主要日曆 'primary'）
 */
export const getWeeklyCalendarEvents = async (
  weekOffset: number = 0,
  calendarId: string = 'primary'
): Promise<WeeklyEventsResponse> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated. Please login first.');
  }

  const { start, end } = getWeekRange(weekOffset);

  // 建立查詢參數
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: 'true',           // 展開重複事件
    orderBy: 'startTime',            // 按開始時間排序
    maxResults: '250',               // 最多 250 個事件
  });

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  console.log(`📅 Fetching calendar events from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('❌ Calendar API Error:', error);
    throw new Error(error.error?.message || `Failed to fetch calendar events: ${response.status}`);
  }

  const data = await response.json();

  console.log(`✅ Fetched ${data.items?.length || 0} calendar events`);

  return {
    events: data.items || [],
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    weekStart: start,
    weekEnd: end,
    count: data.items?.length || 0,
  };
};

/**
 * 取得使用者的所有日曆列表
 */
export const getCalendarList = async (): Promise<Array<{
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}>> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated. Please login first.');
  }

  const url = `${CALENDAR_API_BASE}/users/me/calendarList`;

  console.log('📋 Fetching calendar list...');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('❌ Calendar List API Error:', error);
    throw new Error(error.error?.message || `Failed to fetch calendar list: ${response.status}`);
  }

  const data = await response.json();

  console.log(`✅ Fetched ${data.items?.length || 0} calendars`);

  return data.items || [];
};

/**
 * 取得單一事件詳情
 */
export const getEventById = async (
  eventId: string,
  calendarId: string = 'primary'
): Promise<CalendarEvent> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated. Please login first.');
  }

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Failed to fetch event: ${response.status}`);
  }

  return response.json();
};

/**
 * 解析事件的開始和結束時間
 */
export const parseEventTime = (event: CalendarEvent): {
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
} => {
  const isAllDay = !!event.start.date;

  const startTime = event.start.dateTime
    ? new Date(event.start.dateTime)
    : new Date(event.start.date!);

  const endTime = event.end.dateTime
    ? new Date(event.end.dateTime)
    : new Date(event.end.date!);

  return { startTime, endTime, isAllDay };
};

/**
 * 計算事件時長（分鐘）
 */
export const calculateEventDuration = (event: CalendarEvent): number => {
  const { startTime, endTime } = parseEventTime(event);
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.floor(durationMs / 60000); // 轉換為分鐘
};

/**
 * 格式化事件時間為顯示用字串
 */
export const formatEventTime = (event: CalendarEvent): string => {
  const { startTime, endTime, isAllDay } = parseEventTime(event);

  if (isAllDay) {
    return startTime.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
    });
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  return `${startTime.toLocaleTimeString('zh-TW', timeOptions)} - ${endTime.toLocaleTimeString('zh-TW', timeOptions)}`;
};

/**
 * 將 Google Calendar Event 轉換為前端使用的格式
 */
export interface NormalizedEvent {
  id: string;
  googleEventId: string;
  title: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  durationMinutes: number;
  status: string;
  htmlLink?: string;
}

export const normalizeCalendarEvent = (event: CalendarEvent): NormalizedEvent => {
  const { startTime, endTime, isAllDay } = parseEventTime(event);
  const durationMinutes = calculateEventDuration(event);

  return {
    id: event.id,
    googleEventId: event.id,
    title: event.summary || '(無標題)',
    description: event.description || '',
    location: event.location || '',
    startDateTime: startTime.toISOString(),
    endDateTime: endTime.toISOString(),
    isAllDay,
    durationMinutes,
    status: event.status || 'confirmed',
    htmlLink: event.htmlLink,
  };
};

/**
 * 批次取得並正規化本週事件
 */
export const fetchAndNormalizeWeeklyEvents = async (
  weekOffset: number = 0,
  calendarId: string = 'primary'
): Promise<{
  events: NormalizedEvent[];
  weekStart: Date;
  weekEnd: Date;
  count: number;
}> => {
  const response = await getWeeklyCalendarEvents(weekOffset, calendarId);

  // 過濾掉全天事件，然後正規化
  const normalizedEvents = response.events
    .filter(event => {
      const { isAllDay } = parseEventTime(event);
      return !isAllDay; // 只保留非全天事件
    })
    .map(normalizeCalendarEvent);

  console.log(`📅 Filtered out all-day events: ${response.events.length} → ${normalizedEvents.length}`);

  // 儲存到 localStorage 快取
  const cacheKey = `calendar_events_week_${weekOffset}`;
  localStorage.setItem(cacheKey, JSON.stringify({
    events: normalizedEvents,
    weekStart: response.weekStart.toISOString(),
    weekEnd: response.weekEnd.toISOString(),
    cachedAt: new Date().toISOString(),
  }));

  console.log(`💾 Cached ${normalizedEvents.length} events to localStorage (${cacheKey})`);

  return {
    events: normalizedEvents,
    weekStart: response.weekStart,
    weekEnd: response.weekEnd,
    count: normalizedEvents.length,
  };
};

/**
 * 從快取讀取事件（如果存在且未過期）
 */
export const getCachedWeeklyEvents = (weekOffset: number = 0): {
  events: NormalizedEvent[];
  weekStart: string;
  weekEnd: string;
  cachedAt: string;
} | null => {
  const cacheKey = `calendar_events_week_${weekOffset}`;
  const cached = localStorage.getItem(cacheKey);

  if (!cached) {
    return null;
  }

  try {
    const data = JSON.parse(cached);
    const cachedAt = new Date(data.cachedAt);
    const now = new Date();

    // 快取 10 分鐘過期
    const cacheAgeMs = now.getTime() - cachedAt.getTime();
    const cacheAgeMinutes = cacheAgeMs / 60000;

    if (cacheAgeMinutes > 10) {
      console.log(`⚠️ Cache expired (${cacheAgeMinutes.toFixed(1)} minutes old)`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`✅ Using cached events (${cacheAgeMinutes.toFixed(1)} minutes old)`);
    return data;
  } catch (error) {
    console.error('❌ Failed to parse cached events:', error);
    localStorage.removeItem(cacheKey);
    return null;
  }
};

/**
 * 清除所有日曆快取
 */
export const clearCalendarCache = (): void => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('calendar_events_week_')) {
      localStorage.removeItem(key);
    }
  });
  console.log('🗑️ Calendar cache cleared');
};
