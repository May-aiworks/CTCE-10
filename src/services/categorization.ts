/**
 * 本地歸類管理服務 (使用 localStorage)
 * 管理 Personal Event → Master Event 的對應關係
 */

import { NormalizedEvent } from './googleCalendar';

const STORAGE_KEY = 'event_categorizations';

/**
 * 歸類資料結構
 */
export interface CategorizationData {
  id: string; // 唯一 ID
  personalEventId: string; // Google Calendar Event ID
  masterEventId: string; // 課程 ID (從 Google Sheets)
  personalEventTitle: string;
  masterEventTitle: string;
  personalEventStart: string;
  personalEventEnd: string;
  durationMinutes?: number; // 事件時長（分鐘）- 用於手動事件
  notes?: string;
  createdAt: string;
}

/**
 * 取得所有歸類
 */
export const getAllCategorizations = (): CategorizationData[] => {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const data = JSON.parse(stored);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Failed to parse categorizations:', error);
    return [];
  }
};

/**
 * 儲存歸類
 */
const saveCategorizations = (categorizations: CategorizationData[]): void => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(categorizations));
};

/**
 * 新增歸類
 */
export const createCategorization = (
  personalEvent: NormalizedEvent,
  masterEvent: { id: string; title: string },
  notes?: string
): CategorizationData => {
  const categorizations = getAllCategorizations();

  // 檢查是否已存在 (一個 personal event 只能歸類到一個 master event)
  const existingIndex = categorizations.findIndex(
    c => c.personalEventId === personalEvent.googleEventId
  );

  const newCategorization: CategorizationData = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    personalEventId: personalEvent.googleEventId,
    masterEventId: masterEvent.id,
    personalEventTitle: personalEvent.title,
    masterEventTitle: masterEvent.title,
    personalEventStart: personalEvent.startDateTime,
    personalEventEnd: personalEvent.endDateTime,
    durationMinutes: personalEvent.durationMinutes, // 儲存事件的時長
    notes: notes || `歸類於 ${new Date().toLocaleString('zh-TW')}`,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    // 更新現有歸類
    categorizations[existingIndex] = newCategorization;
    console.log(`🔄 Updated categorization for ${personalEvent.title}`);
  } else {
    // 新增歸類
    categorizations.push(newCategorization);
    console.log(`✅ Created new categorization for ${personalEvent.title}`);
  }

  saveCategorizations(categorizations);
  return newCategorization;
};

/**
 * 刪除歸類
 */
export const deleteCategorization = (categorizationId: string): boolean => {
  const categorizations = getAllCategorizations();
  const filteredCategorizations = categorizations.filter(c => c.id !== categorizationId);

  if (filteredCategorizations.length === categorizations.length) {
    console.warn(`⚠️ Categorization ${categorizationId} not found`);
    return false;
  }

  saveCategorizations(filteredCategorizations);
  console.log(`🗑️ Deleted categorization ${categorizationId}`);
  return true;
};

/**
 * 根據 Personal Event ID 刪除歸類
 */
export const deleteCategorizationByPersonalEventId = (personalEventId: string): boolean => {
  const categorizations = getAllCategorizations();
  const filteredCategorizations = categorizations.filter(
    c => c.personalEventId !== personalEventId
  );

  if (filteredCategorizations.length === categorizations.length) {
    return false;
  }

  saveCategorizations(filteredCategorizations);
  console.log(`🗑️ Deleted categorization for personal event ${personalEventId}`);
  return true;
};

/**
 * 取得特定 Personal Event 的歸類
 */
export const getCategorizationByPersonalEventId = (
  personalEventId: string
): CategorizationData | null => {
  const categorizations = getAllCategorizations();
  return categorizations.find(c => c.personalEventId === personalEventId) || null;
};

/**
 * 取得特定 Master Event 的所有歸類
 */
export const getCategorizationsByMasterEventId = (
  masterEventId: string
): CategorizationData[] => {
  const categorizations = getAllCategorizations();
  return categorizations.filter(c => c.masterEventId === masterEventId);
};

/**
 * 清除所有歸類
 */
export const clearAllCategorizations = (): void => {
  sessionStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Cleared all categorizations');
};


/**
 * 匯出歸類資料 (用於 submitRecords)
 */
export const exportCategorizationsForSubmit = () => {
  const categorizations = getAllCategorizations();

  const records = categorizations.map((cat, index) => {
    // 判斷是否為手動新增的本地事件（ID 以 local_ 開頭）
    const isLocalEvent = cat.personalEventId.startsWith('local_');

    console.log(`📋 Record ${index + 1}:`, {
      personalEventId: cat.personalEventId,
      personalEventTitle: cat.personalEventTitle,
      masterEventId: cat.masterEventId,
      personalEventStart: cat.personalEventStart,
      personalEventEnd: cat.personalEventEnd,
      isLocalEvent,
    });

    if (isLocalEvent) {
      // 手動事件：使用 manual 類型，不需要 startTime/endTime
      let durationMinutes = 0;

      // 優先使用 durationMinutes（如果有的話）
      if (cat.durationMinutes && cat.durationMinutes > 0) {
        durationMinutes = cat.durationMinutes;
        console.log(`⏱️ Using durationMinutes: ${durationMinutes} min`);
      } else if (cat.personalEventStart && cat.personalEventEnd &&
          cat.personalEventStart.trim() !== '' && cat.personalEventEnd.trim() !== '') {
        // 如果沒有 durationMinutes，從時間計算
        const startTime = new Date(cat.personalEventStart);
        const endTime = new Date(cat.personalEventEnd);
        // 確保時間是有效的
        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
          durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
          console.log(`⏱️ Calculated from time: ${durationMinutes} min`);
        }
      }

      const record = {
        eventName: cat.personalEventTitle,
        eventType: 'manual' as const,
        duration: durationMinutes,
        courseId: cat.masterEventId,
      };

      console.log(`✅ Manual record ${index + 1}:`, record);
      return record;
    } else {
      // Google Calendar 事件：使用 calendar 類型，需要 startTime/endTime
      const startTime = new Date(cat.personalEventStart);
      const endTime = new Date(cat.personalEventEnd);
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      const record = {
        eventName: cat.personalEventTitle,
        eventType: 'calendar' as const,
        startTime: cat.personalEventStart,
        endTime: cat.personalEventEnd,
        duration: durationMinutes,
        courseId: cat.masterEventId,
      };

      console.log(`✅ Calendar record ${index + 1}:`, record);
      return record;
    }
  });

  console.log('📤 Final records to submit:', records);
  return records;
};
