/**
 * 課程總表管理服務
 * 從 Google Sheets 讀取課程總表,並快取到 localStorage
 */

import { getAccessToken } from './googleAuth';

// Google Sheets API 設定
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// 課程總表 Sheet ID (從 refactor.md)
const MASTER_EVENTS_SHEET_ID = '1RgLFR-0k9sEETiymipAMUKB4EbAVj4ebFI7UuF7HXr4';
const MASTER_EVENTS_SHEET_NAME = '課程總表';

const STORAGE_KEY = 'master_events_cache';
const CACHE_EXPIRY_KEY = 'master_events_cache_expiry';

export interface MasterEvent {
  id: string; // 課程 ID (A 欄)
  title: string; // 內部識別名稱 (D 欄)
}

/**
 * 從 Google Sheets 讀取課程總表
 */
export const fetchMasterEventsFromSheets = async (): Promise<MasterEvent[]> => {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Access token not found. Please login first.');
  }

  // 讀取 A 欄 (課程ID) 和 D 欄 (內部識別名稱)
  const range = `${MASTER_EVENTS_SHEET_NAME}!A:D`;
  const url = `${SHEETS_API_BASE}/${MASTER_EVENTS_SHEET_ID}/values/${encodeURIComponent(range)}`;

  console.log(`📚 Fetching master events from Google Sheets...`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('❌ Sheets API Error:', error);
    throw new Error(error.error?.message || `Failed to fetch master events: ${response.status}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  if (rows.length <= 1) {
    console.warn('⚠️ No data found in master events sheet');
    return [];
  }

  // 跳過標題列,讀取 A 欄 (index 0) 和 D 欄 (index 3)
  const masterEvents: MasterEvent[] = rows
    .slice(1) // 跳過標題列
    .filter(row => row[0] && row[3]) // 確保 A 欄和 D 欄都有資料
    .map(row => ({
      id: row[0].trim(),
      title: row[3].trim(),
    }));

  console.log(`✅ Loaded ${masterEvents.length} master events from Google Sheets`);

  return masterEvents;
};

/**
 * 取得課程總表 (優先使用快取)
 */
export const getMasterEvents = async (forceRefresh: boolean = false): Promise<MasterEvent[]> => {
  // 檢查快取
  if (!forceRefresh) {
    const cached = getCachedMasterEvents();
    if (cached) {
      console.log(`✅ Using cached master events (${cached.length} courses)`);
      return cached;
    }
  }

  // 從 Google Sheets 取得
  const masterEvents = await fetchMasterEventsFromSheets();

  // 儲存到快取
  saveMasterEventsToCache(masterEvents);

  return masterEvents;
};

/**
 * 從快取讀取課程總表
 */
export const getCachedMasterEvents = (): MasterEvent[] | null => {
  const cached = localStorage.getItem(STORAGE_KEY);
  const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);

  if (!cached || !expiry) {
    return null;
  }

  // 檢查是否過期 (快取 1 小時)
  const expiryTime = parseInt(expiry, 10);
  if (Date.now() > expiryTime) {
    console.log('⚠️ Master events cache expired');
    clearMasterEventsCache();
    return null;
  }

  try {
    const data = JSON.parse(cached);
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.error('❌ Failed to parse cached master events:', error);
    clearMasterEventsCache();
    return null;
  }
};

/**
 * 儲存課程總表到快取
 */
const saveMasterEventsToCache = (masterEvents: MasterEvent[]): void => {
  const expiryTime = Date.now() + (60 * 60 * 1000); // 1 小時後過期

  localStorage.setItem(STORAGE_KEY, JSON.stringify(masterEvents));
  localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());

  console.log(`💾 Cached ${masterEvents.length} master events (expires in 1 hour)`);
};

/**
 * 清除課程總表快取
 */
export const clearMasterEventsCache = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
  console.log('🗑️ Master events cache cleared');
};

/**
 * 根據課程 ID 取得課程資訊
 */
export const getMasterEventById = async (courseId: string): Promise<MasterEvent | null> => {
  const masterEvents = await getMasterEvents();
  return masterEvents.find(event => event.id === courseId) || null;
};

/**
 * 根據課程 ID 列表取得課程資訊
 */
export const getMasterEventsByIds = async (courseIds: string[]): Promise<MasterEvent[]> => {
  const masterEvents = await getMasterEvents();
  return masterEvents.filter(event => courseIds.includes(event.id));
};
