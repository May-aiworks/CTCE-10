/**
 * 時數記錄系統 Apps Script 實作
 */

const SHEET_NAMES = {
  TIMESHEET: '時數記錄',
  COURSE_CACHE: '使用者課程快取'
};

const COLS = {
  EMAIL: 0,
  WEEK: 1,
  EVENT_NAME: 2,
  EVENT_TYPE: 3,
  START_TIME: 4,
  END_TIME: 5,
  DURATION: 6,
  COURSE_ID: 7,
  BATCH_ID: 8,
  STATUS: 9
};

const CACHE_COLS = {
  EMAIL: 0,
  COURSE_IDS: 1,
  LAST_UPDATED: 2
};

const STATUS = {
  ACTIVE: '有效',
  VOID: '已作廢'
};

const EVENT_TYPES = {
  CALENDAR: 'calendar',
  MANUAL: 'manual'
};

const TIMEZONE = 'Asia/Taipei';

const API_ACTIONS = Object.freeze({
  GET_USER_COURSE_CACHE: 'getUserCourseCache',
  GET_SUBMITTED_RECORDS: 'getSubmittedRecords',
  SUBMIT_RECORDS: 'submitRecords',
  UPDATE_USER_COURSE_CACHE: 'updateUserCourseCache'
});

function getSpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Unable to access active spreadsheet.');
  }
  return spreadsheet;
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return sheet;
}

function formatTimestamp_(date) {
  return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function safeParseJson_(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    Logger.log('Failed to parse JSON value: ' + err);
    return [];
  }
}

function normalizeString_(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
}

function normalizeEventType_(value) {
  const normalized = normalizeString_(value);
  return normalized ? normalized.toLowerCase() : normalized;
}

function validateRecord_(record) {
  if (!record || typeof record !== 'object') {
    return { valid: false, error: 'MISSING_FIELDS' };
  }

  const eventName = normalizeString_(record.eventName);
  const eventType = normalizeEventType_(record.eventType);
  const courseId = normalizeString_(record.courseId);
  const duration = record.duration;

  if (!eventName || !eventType || !courseId || !duration) {
    return { valid: false, error: 'MISSING_FIELDS' };
  }

  if (eventType !== EVENT_TYPES.CALENDAR && eventType !== EVENT_TYPES.MANUAL) {
    return { valid: false, error: 'INVALID_EVENT_TYPE' };
  }

  if (eventType === EVENT_TYPES.CALENDAR) {
    if (!record.startTime || !record.endTime) {
      return { valid: false, error: 'MISSING_FIELDS' };
    }
  }

  return { valid: true };
}

function getUserCourseCache(email) {
  email = normalizeString_(email);

  if (!email) {
    return {
      success: false,
      error: 'MISSING_EMAIL',
      message: 'Email is required.'
    };
  }

  try {
    const sheet = getSheet_(SHEET_NAMES.COURSE_CACHE);
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (normalizeString_(row[CACHE_COLS.EMAIL]) === email) {
        const courseIds = safeParseJson_(row[CACHE_COLS.COURSE_IDS]);
        const lastUpdated = normalizeString_(row[CACHE_COLS.LAST_UPDATED]) || null;
        return {
          success: true,
          courseIds: courseIds,
          lastUpdated: lastUpdated
        };
      }
    }

    return {
      success: true,
      courseIds: [],
      lastUpdated: null
    };
  } catch (error) {
    Logger.log('Error in getUserCourseCache: ' + error);
    return {
      success: false,
      error: 'SHEET_ACCESS_ERROR',
      message: error.toString()
    };
  }
}

function getSubmittedRecords(email, week) {
  email = normalizeString_(email);
  week = normalizeString_(week);

  if (!email || !week) {
    return {
      success: false,
      error: 'MISSING_PARAMETERS',
      message: 'Email and week are required.'
    };
  }

  try {
    const sheet = getSheet_(SHEET_NAMES.TIMESHEET);
    const values = sheet.getDataRange().getValues();
    const records = [];
    let batchId = null;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowEmail = normalizeString_(row[COLS.EMAIL]);
      const rowWeek = normalizeString_(row[COLS.WEEK]);
      const rowStatus = normalizeString_(row[COLS.STATUS]);
      const rowEventType = normalizeEventType_(row[COLS.EVENT_TYPE]);

      if (rowEmail === email && rowWeek === week && rowStatus === STATUS.ACTIVE) {
        if (!batchId) {
          batchId = normalizeString_(row[COLS.BATCH_ID]) || null;
        }
        records.push({
          eventName: row[COLS.EVENT_NAME] || '',
          eventType: rowEventType || '',
          startTime: rowEventType === EVENT_TYPES.MANUAL ? null : (row[COLS.START_TIME] || null),
          endTime: rowEventType === EVENT_TYPES.MANUAL ? null : (row[COLS.END_TIME] || null),
          duration: Number(row[COLS.DURATION]) || 0,
          courseId: row[COLS.COURSE_ID] || ''
        });
      }
    }

    return {
      success: true,
      data: records,
      count: records.length,
      batchId: batchId
    };
  } catch (error) {
    Logger.log('Error in getSubmittedRecords: ' + error);
    return {
      success: false,
      error: 'SHEET_ACCESS_ERROR',
      message: error.toString()
    };
  }
}

function submitRecords(email, week, records) {
  email = normalizeString_(email);
  week = normalizeString_(week);

  if (!email || !week) {
    return {
      success: false,
      error: 'MISSING_PARAMETERS',
      message: 'Email and week are required.'
    };
  }

  if (!records || records.length === 0) {
    return {
      success: false,
      error: 'EMPTY_RECORDS',
      message: '沒有要送出的記錄'
    };
  }

  for (let i = 0; i < records.length; i++) {
    const validation = validateRecord_(records[i]);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        message: `第 ${i + 1} 筆記錄格式錯誤`
      };
    }
  }

  try {
    const sheet = getSheet_(SHEET_NAMES.TIMESHEET);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const rowsToVoid = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowEmail = normalizeString_(row[COLS.EMAIL]);
      const rowWeek = normalizeString_(row[COLS.WEEK]);
      const rowStatus = normalizeString_(row[COLS.STATUS]);
      if (rowEmail === email && rowWeek === week && rowStatus === STATUS.ACTIVE) {
        rowsToVoid.push(i + 1); // 1-based row index in sheet
      }
    }

    if (rowsToVoid.length > 0) {
      rowsToVoid.forEach(function(rowIndex) {
        sheet.getRange(rowIndex, COLS.STATUS + 1).setValue(STATUS.VOID);
      });
    }

    const batchId = formatTimestamp_(new Date());
    const newRows = records.map(function(record) {
      const eventName = normalizeString_(record.eventName) || '';
      const eventType = normalizeEventType_(record.eventType) || '';
      const startTime = eventType === EVENT_TYPES.MANUAL ? '' : (record.startTime || '');
      const endTime = eventType === EVENT_TYPES.MANUAL ? '' : (record.endTime || '');
      const courseId = normalizeString_(record.courseId) || '';

      return [
        email,
        week,
        eventName,
        eventType,
        startTime,
        endTime,
        Number(record.duration),
        courseId,
        batchId,
        STATUS.ACTIVE
      ];
    });

    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);

    return {
      success: true,
      message: `成功送出 ${records.length} 筆記錄`,
      batchId: batchId,
      markedAsInvalid: rowsToVoid.length,
      newRecords: records.length
    };
  } catch (error) {
    Logger.log('Error in submitRecords: ' + error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.toString()
    };
  }
}

function updateUserCourseCache(email, courseIds) {
  email = normalizeString_(email);

  if (!email) {
    return {
      success: false,
      error: 'MISSING_EMAIL',
      message: 'Email is required.'
    };
  }

  if (!Array.isArray(courseIds)) {
    return {
      success: false,
      error: 'INVALID_COURSE_IDS',
      message: 'courseIds 必須為陣列'
    };
  }

  try {
    const sheet = getSheet_(SHEET_NAMES.COURSE_CACHE);
    const values = sheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (normalizeString_(row[CACHE_COLS.EMAIL]) === email) {
        rowsToDelete.push(i + 1); // 1-based index
      }
    }

    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }

    sheet.appendRow([
      email,
      JSON.stringify(courseIds),
      formatTimestamp_(new Date())
    ]);

    return {
      success: true,
      message: '已更新課程快取',
      courseCount: courseIds.length
    };
  } catch (error) {
    Logger.log('Error in updateUserCourseCache: ' + error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.toString()
    };
  }
}

function doGet(e) {
  return handleHttpRequest_('GET', e);
}

function doPost(e) {
  return handleHttpRequest_('POST', e);
}

function handleHttpRequest_(method, e) {
  try {
    const request = buildHttpRequest_(method, e);
    if (!request.action) {
      return createJsonResponse_({
        success: false,
        error: 'MISSING_ACTION',
        message: 'Query parameter "action" is required.'
      });
    }

    const result = routeApiRequest_(request.action, request.params);
    return createJsonResponse_(result);
  } catch (error) {
    Logger.log('Error in ' + method + ': ' + error);
    if (error && error.code) {
      return createJsonResponse_({
        success: false,
        error: error.code,
        message: error.message || ''
      });
    }
    return createJsonResponse_({
      success: false,
      error: 'INTERNAL_ERROR',
      message: (error && error.message) ? error.message : String(error)
    });
  }
}

function buildHttpRequest_(method, e) {
  const parameters = (e && e.parameter) ? e.parameter : {};
  let body = {};

  if (method === 'POST') {
    body = parsePostData_(e);
  }

  const action = normalizeAction_(body.action || parameters.action);
  const params = mergeParameters_(parameters, body);
  return {
    action: action,
    params: params
  };
}

function parsePostData_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  const contents = e.postData.contents;
  const mimeType = (e.postData.type || '').toLowerCase();

  if (!contents) {
    return {};
  }

  // 支援 text/plain 和 application/json
  // text/plain 用於避開瀏覽器的 CORS preflight 檢查
  if (!mimeType ||
      mimeType.indexOf('application/json') !== -1 ||
      mimeType.indexOf('text/plain') !== -1) {
    try {
      return JSON.parse(contents);
    } catch (err) {
      throw createRequestError_('INVALID_JSON_BODY', 'POST body must be valid JSON.');
    }
  }

  return {};
}

function routeApiRequest_(action, params) {
  switch (action) {
    case API_ACTIONS.GET_USER_COURSE_CACHE:
      return getUserCourseCache(params.email);
    case API_ACTIONS.GET_SUBMITTED_RECORDS:
      return getSubmittedRecords(params.email, params.week);
    case API_ACTIONS.SUBMIT_RECORDS: {
      let records = params.records;
      if (typeof records === 'string') {
        try {
          records = JSON.parse(records);
        } catch (err) {
          throw createRequestError_('INVALID_RECORDS', 'records must be a JSON array.');
        }
      }
      if (!Array.isArray(records)) {
        throw createRequestError_('INVALID_RECORDS', 'records must be an array.');
      }
      return submitRecords(params.email, params.week, records);
    }
    case API_ACTIONS.UPDATE_USER_COURSE_CACHE: {
      let courseIds = params.courseIds;
      if (typeof courseIds === 'string') {
        try {
          courseIds = JSON.parse(courseIds);
        } catch (err) {
          throw createRequestError_('INVALID_COURSE_IDS', 'courseIds must be a JSON array.');
        }
      }
      if (!Array.isArray(courseIds)) {
        throw createRequestError_('INVALID_COURSE_IDS', 'courseIds must be an array.');
      }
      return updateUserCourseCache(params.email, courseIds);
    }
    default:
      return {
        success: false,
        error: 'UNKNOWN_ACTION',
        message: 'Unsupported action: ' + action
      };
  }
}

function mergeParameters_(queryParams, bodyParams) {
  const merged = {};

  [queryParams, bodyParams].forEach(function(source) {
    if (!source) {
      return;
    }
    Object.keys(source).forEach(function(key) {
      if (key === 'action') {
        return;
      }
      merged[key] = source[key];
    });
  });

  return merged;
}

function normalizeAction_(action) {
  if (typeof action === 'string') {
    return action.trim();
  }
  return '';
}

function createJsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function createRequestError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}