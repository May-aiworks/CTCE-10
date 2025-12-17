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
  notes?: string;
  createdAt: string;
}

/**
 * 取得所有歸類
 */
export const getAllCategorizations = (): CategorizationData[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categorizations));
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
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Cleared all categorizations');
};


/**
 * 匯出歸類資料 (用於 submitRecords)
 */
export const exportCategorizationsForSubmit = () => {
  const categorizations = getAllCategorizations();

  return categorizations.map(cat => {
    const startTime = new Date(cat.personalEventStart);
    const endTime = new Date(cat.personalEventEnd);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    return {
      eventName: cat.personalEventTitle,
      eventType: 'calendar' as const,
      startTime: cat.personalEventStart,
      endTime: cat.personalEventEnd,
      duration: durationHours,
      courseId: cat.masterEventId,
    };
  });
};
