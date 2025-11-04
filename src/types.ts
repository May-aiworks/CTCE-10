export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined?: string;
  is_google_authenticated?: boolean;
  google_email?: string;
  token_expires_at?: string;
}

export interface CalendarEvent {
  id: number;
  user: User;
  google_event_id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  is_all_day: boolean;
  recurrence_rule: string | null;
  calendar_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  synced_with_google: boolean;
  last_synced_at: string;
  // New fields for sync system
  event_type?: 'personal' | 'master';
  synced_at?: string;
  calendar_name?: string;
  start_time?: string;  // Alternative naming from API
  end_time?: string;    // Alternative naming from API
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  is_all_day?: boolean;
  calendar_id?: string;
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  accessRole: string;
  selected: boolean;
  primary: boolean;
}

export interface AuthStatus {
  is_authenticated: boolean;
  user?: User;
  has_google_token?: boolean;
  token_expired?: boolean;
}

export interface Task {
  id: string;
  content: string;
  status: 'todo' | 'in-progress' | 'done';
  calendarEvent?: CalendarEvent;
  dueDate?: string;
}

export interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

export interface Board {
  tasks: { [key: string]: Task };
  columns: { [key: string]: Column };
  columnOrder: string[];
}

// New types for sync system
export interface WeeklyEventsResponse {
  success: boolean;
  events: CalendarEvent[];
  events_count: number;
  week_start: string;
  week_end: string;
  last_synced: string;
  data_source: 'database' | 'google';
}

export interface SyncResponse {
  success: boolean;
  message: string;
  deleted_count: number;
  created_count: number;
  week_start: string;
  week_end: string;
  synced_at: string;
}

export interface SyncStatusResponse {
  success: boolean;
  last_synced: string;
  next_scheduled_sync: string;
  scheduler_enabled: boolean;
  sync_time: string;
}

// New types for drag-and-drop categorization
export interface EventCategorization {
  id: number;
  master_event: CalendarEvent;
  personal_event: CalendarEvent;
  notes?: string;
  position_x?: number;
  position_y?: number;
  created_at: string;
}

export interface CreateCategorizationRequest {
  personal_event_id: number;
  master_event_id: number;
  position_x?: number;
  position_y?: number;
  notes?: string;
}

export interface CategorizationResponse {
  success: boolean;
  created?: boolean;
  categorization: EventCategorization;
  message?: string;
}

export interface CalendarDataResponse {
  success: boolean;
  personal_calendar: {
    calendar_id: string;
    events: CalendarEvent[];
    events_count: number;
  };
  categorizations: EventCategorization[];
  categorizations_count: number;
}

export interface MyCategorizationsResponse {
  success: boolean;
  categorizations: EventCategorization[];
  total_count: number;
}

// ⭐ Master Event (課程總表)
export interface MasterEvent {
  id: number;                      // 資料庫 ID (用於 API 呼叫)
  user: User;
  spreadsheet_row_id: number;      // Google Sheet 課程 ID
  title: string;                   // 課程名稱
  description: string;             // 課程說明
  location: string;                // 上課地點
  event_type: 'master';            // 固定為 'master'
  created_at: string;
  updated_at: string;
  synced_at: string;               // 最後同步時間
}

// ⭐ Master Events 列表回應
export interface MasterEventsResponse {
  success: boolean;
  events: MasterEvent[];
  events_count: number;
  last_synced: string;
  source: 'database' | 'google_spreadsheet';
  spreadsheet_info: {
    spreadsheet_id: string;
    sheet_name: string;
    total_rows: number;
  };
}

// ⭐ Master Event 同步回應
export interface MasterEventSyncResponse {
  success: boolean;
  message: string;
  deleted_count: number;
  created_count: number;
  updated_count: number;
  synced_at: string;
  spreadsheet_info: {
    spreadsheet_id: string;
    sheet_name: string;
    total_rows: number;
  };
}

// ⭐ 單一 Master Event 回應
export interface MasterEventDetailResponse {
  success: boolean;
  event: MasterEvent;
}