/**
 * Google Apps Script API 整合
 * 呼叫部署的 Apps Script Web App 進行 Google Sheets 讀寫
 */

import { getUserEmail } from './googleAuth';

// Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzchKqZwzNZ7ojrtENvuMLaFnJ-JMmnMwC6fVfAU1iFDvtiuQ9zTp3-tCPDCTIhrdNV-g/exec';

// API Actions (對應 code.gs 中的 API_ACTIONS)
const API_ACTIONS = {
  GET_USER_COURSE_CACHE: 'getUserCourseCache',
  GET_SUBMITTED_RECORDS: 'getSubmittedRecords',
  SUBMIT_RECORDS: 'submitRecords',
  UPDATE_USER_COURSE_CACHE: 'updateUserCourseCache',
};

// 事件類型（對應 code.gs 中的 EVENT_TYPES）
export const EVENT_TYPES = {
  CALENDAR: 'calendar',
  MANUAL: 'manual',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// 介面定義

export interface UserCourseCache {
  success: boolean;
  courseIds: string[];
  lastUpdated: string | null;
  error?: string;
  message?: string;
}

export interface SubmittedRecord {
  eventName: string;
  eventType: EventType;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  courseId: string;
}

export interface SubmittedRecordsResponse {
  success: boolean;
  data: SubmittedRecord[];
  count: number;
  batchId: string | null;
  error?: string;
  message?: string;
}

export interface SubmitRecordInput {
  eventName: string;
  eventType: EventType;
  startTime?: string;
  endTime?: string;
  duration: number;
  courseId: string;
}

export interface SubmitRecordsResponse {
  success: boolean;
  message: string;
  batchId: string;
  markedAsInvalid: number;
  newRecords: number;
  error?: string;
}

export interface UpdateCourseCache {
  success: boolean;
  message: string;
  courseCount: number;
  error?: string;
}

/**
 * 處理 Apps Script API 錯誤
 */
class AppsScriptError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppsScriptError';
    this.code = code;
  }
}

/**
 * 通用 Apps Script API 請求函數
 */
const appsScriptRequest = async <T>(
  action: string,
  params: Record<string, any> = {},
  method: 'GET' | 'POST' = 'GET'
): Promise<T> => {
  try {
    let url = APPS_SCRIPT_URL;
    let fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'GET') {
      // GET 請求：參數放在 query string
      const queryParams = new URLSearchParams({
        action,
        ...params,
      });
      url = `${APPS_SCRIPT_URL}?${queryParams}`;
    } else {
      // POST 請求：參數放在 body
      fetchOptions.body = JSON.stringify({
        action,
        ...params,
      });
    }

    console.log(`🔗 Apps Script ${method} Request:`, action, params);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`✅ Apps Script Response:`, data);

    // 檢查 Apps Script 回傳的錯誤
    if (!data.success && data.error) {
      throw new AppsScriptError(data.error, data.message || 'Apps Script error');
    }

    return data as T;
  } catch (error) {
    console.error(`❌ Apps Script API Error (${action}):`, error);
    throw error;
  }
};

/**
 * 取得使用者的課程快取
 */
export const getUserCourseCache = async (): Promise<UserCourseCache> => {
  const email = getUserEmail();
  if (!email) {
    throw new Error('User email not found. Please login first.');
  }

  const response = await appsScriptRequest<UserCourseCache>(
    API_ACTIONS.GET_USER_COURSE_CACHE,
    { email },
    'GET'
  );

  // 儲存到 localStorage
  if (response.success) {
    localStorage.setItem('user_course_cache', JSON.stringify(response.courseIds));
    localStorage.setItem('user_course_cache_updated', response.lastUpdated || '');
    console.log(`💾 Cached ${response.courseIds.length} course IDs to localStorage`);
  }

  return response;
};

/**
 * 取得已提交的記錄
 * @param week 週編號（格式：YYYY-WW，例如 2025-01）
 */
export const getSubmittedRecords = async (week: string): Promise<SubmittedRecordsResponse> => {
  const email = getUserEmail();
  if (!email) {
    throw new Error('User email not found. Please login first.');
  }

  return appsScriptRequest<SubmittedRecordsResponse>(
    API_ACTIONS.GET_SUBMITTED_RECORDS,
    { email, week },
    'GET'
  );
};

/**
 * 提交記錄到 Google Sheets
 * @param week 週編號（格式：YYYY-WW）
 * @param records 要提交的記錄陣列
 */
export const submitRecords = async (
  week: string,
  records: SubmitRecordInput[]
): Promise<SubmitRecordsResponse> => {
  const email = getUserEmail();
  if (!email) {
    throw new Error('User email not found. Please login first.');
  }

  // 驗證記錄格式
  records.forEach((record, index) => {
    if (!record.eventName || !record.eventType || !record.courseId || !record.duration) {
      throw new Error(`Record ${index + 1} is missing required fields`);
    }

    if (record.eventType === EVENT_TYPES.CALENDAR) {
      if (!record.startTime || !record.endTime) {
        throw new Error(`Record ${index + 1} (calendar type) is missing startTime or endTime`);
      }
    }
  });

  console.log(`📤 Submitting ${records.length} records for week ${week}`);

  return appsScriptRequest<SubmitRecordsResponse>(
    API_ACTIONS.SUBMIT_RECORDS,
    { email, week, records },
    'POST'
  );
};

/**
 * 更新使用者的課程快取
 * @param courseIds 課程 ID 陣列
 */
export const updateUserCourseCache = async (courseIds: string[]): Promise<UpdateCourseCache> => {
  const email = getUserEmail();
  if (!email) {
    throw new Error('User email not found. Please login first.');
  }

  const response = await appsScriptRequest<UpdateCourseCache>(
    API_ACTIONS.UPDATE_USER_COURSE_CACHE,
    { email, courseIds },
    'POST'
  );

  // 更新 localStorage
  if (response.success) {
    localStorage.setItem('user_course_cache', JSON.stringify(courseIds));
    localStorage.setItem('user_course_cache_updated', new Date().toISOString());
    console.log(`💾 Updated course cache with ${courseIds.length} courses`);
  }

  return response;
};

/**
 * 計算當前週編號（格式：YYYY-WW）
 */
export const getCurrentWeek = (): string => {
  const now = new Date();
  const year = now.getFullYear();

  // 計算一年中的第幾週（週日為一週的開始）
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);

  return `${year}-${String(weekNumber).padStart(2, '0')}`;
};

/**
 * 格式化週編號為顯示用文字
 */
export const formatWeekNumber = (week: string): string => {
  const [year, weekNum] = week.split('-');
  return `${year} 年第 ${weekNum} 週`;
};

/**
 * 從 localStorage 讀取課程快取
 */
export const getCachedCourseIds = (): string[] => {
  const cached = localStorage.getItem('user_course_cache');
  if (!cached) {
    return [];
  }

  try {
    const courseIds = JSON.parse(cached);
    return Array.isArray(courseIds) ? courseIds : [];
  } catch (error) {
    console.error('❌ Failed to parse cached course IDs:', error);
    return [];
  }
};

/**
 * 檢查課程快取是否過期（超過 24 小時）
 */
export const isCoursesCacheExpired = (): boolean => {
  const lastUpdated = localStorage.getItem('user_course_cache_updated');
  if (!lastUpdated) {
    return true;
  }

  try {
    const updatedAt = new Date(lastUpdated);
    const now = new Date();
    const ageHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    return ageHours > 24;
  } catch (error) {
    return true;
  }
};

/**
 * 智能取得課程快取（優先使用本地快取，過期則重新取得）
 */
export const getCourseCacheSmart = async (): Promise<string[]> => {
  const cached = getCachedCourseIds();

  if (cached.length > 0 && !isCoursesCacheExpired()) {
    console.log(`✅ Using cached course IDs (${cached.length} courses)`);
    return cached;
  }

  console.log('🔄 Course cache expired or empty, fetching from server...');
  const response = await getUserCourseCache();

  return response.courseIds;
};
