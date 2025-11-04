import {
  CalendarEvent,
  AuthStatus,
  Calendar,
  User,
  WeeklyEventsResponse,
  SyncResponse,
  SyncStatusResponse,
  CalendarDataResponse,
  CategorizationResponse,
  CreateCategorizationRequest,
  MyCategorizationsResponse,
  MasterEventsResponse,
  MasterEventSyncResponse,
  MasterEventDetailResponse
} from '../types';

const BASE_URL = 'http://localhost:8000';

class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Helper function to get CSRF token from cookies
const getCsrfToken = (): string | null => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorData.detail || errorMessage;
    } catch {
      // If JSON parsing fails, use status text
      errorMessage = response.statusText || errorMessage;
    }

    // Add specific error messages for common HTTP status codes
    switch (response.status) {
      case 401:
        errorMessage = 'Authentication required. Please log in again.';
        break;
      case 403:
        errorMessage = 'Access forbidden. Please check your permissions or try logging in again.';
        break;
      case 404:
        errorMessage = 'Resource not found. The requested endpoint may not exist.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
    }

    throw new ApiError(errorMessage, response.status);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    return {} as T; // Return empty object for non-JSON responses
  }
};

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    // Prepare headers - use Record type for proper TypeScript support
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Merge existing headers from options
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    // Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
    const method = options.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
        console.log(`🔒 Adding CSRF token to ${method} request`);
      } else {
        console.warn(`⚠️ CSRF token not found for ${method} request to ${endpoint}`);
      }
    }

    const config: RequestInit = {
      credentials: 'include', // Important for CORS with cookies
      headers,
      ...options,
    };

    console.log(`Making ${method} request to: ${BASE_URL}${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    console.log(`Response status: ${response.status}`);

    const result = await handleResponse<T>(response);

    // Log response data for debugging, especially useful for auth responses
    console.log(`Response data from ${endpoint}:`, result);

    return result;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export const authApi = {
  login: async (): Promise<{ authorization_url: string }> => {
    return apiRequest<{ authorization_url: string }>('/api/v1/auth/login/');
  },

  getGoogleAuthUrl: async (): Promise<{ auth_url: string; message: string }> => {
    return apiRequest<{ auth_url: string; message: string }>('/api/v1/auth/google/');
  },

  checkAuthStatus: async (): Promise<AuthStatus> => {
    return apiRequest<AuthStatus>('/api/v1/auth/status/');
  },

  refreshToken: async (): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/api/v1/auth/refresh/', {
      method: 'POST',
    });
  },

  logout: async (): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/api/v1/auth/logout/', {
      method: 'POST',
    });
  },

  revokeGoogleAccess: async (): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/api/v1/auth/revoke/', {
      method: 'POST',
    });
  },
};


export const calendarApi = {
  // 獲取行事曆清單（正確路徑是 /api/v1/auth/calendar/list/）
  getCalendarList: async (): Promise<{ calendars: Calendar[]; count: number }> => {
    return apiRequest<{ calendars: Calendar[]; count: number }>('/api/v1/auth/calendar/list/');
  },

  // 同步並取得事件（正確路徑是 /api/v1/auth/calendar/events/current-week/）
  getCalendarEvents: async (params?: {
    calendar_id?: string;
    max_results?: number;
    current_week?: boolean;
  }): Promise<CalendarEvent[]> => {
    const searchParams = new URLSearchParams();
    if (params?.calendar_id) searchParams.append('calendar_id', params.calendar_id);
    if (params?.max_results) searchParams.append('max_results', params.max_results.toString());
    if (params?.current_week) searchParams.append('current_week', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/v1/auth/calendar/events/current-week/?${queryString}` : '/api/v1/auth/calendar/events/current-week/';

    return apiRequest<CalendarEvent[]>(endpoint);
  },

  // ⭐ New: Get weekly personal events from database (fast)
  getWeeklyPersonalEvents: async (weekOffset: number = 0): Promise<WeeklyEventsResponse> => {
    const searchParams = new URLSearchParams();
    if (weekOffset !== 0) searchParams.append('week_offset', weekOffset.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/v1/calendar/personal-events/weekly/?${queryString}`
      : '/api/v1/calendar/personal-events/weekly/';

    return apiRequest<WeeklyEventsResponse>(endpoint);
  },

  // ⭐ New: Manually trigger sync from Google Calendar
  syncPersonalEvents: async (): Promise<SyncResponse> => {
    return apiRequest<SyncResponse>('/api/v1/calendar/personal-events/sync/', {
      method: 'POST',
    });
  },

  // ⭐ New: Get sync status
  getSyncStatus: async (): Promise<SyncStatusResponse> => {
    return apiRequest<SyncStatusResponse>('/api/v1/calendar/sync/status/');
  },
};

export const userApi = {
  getProfile: async (): Promise<{ profile: { user: User; google_id: string; google_email: string; token_expires_at: string; created_at: string; updated_at: string; } }> => {
    return apiRequest<{ profile: { user: User; google_id: string; google_email: string; token_expires_at: string; created_at: string; updated_at: string; } }>('/users/profile/');
  },

  updateProfile: async (profileData: {
    first_name?: string;
    last_name?: string;
    email?: string;
  }): Promise<{
    message: string;
    profile: { user: User; google_id: string; google_email: string; token_expires_at: string; created_at: string; updated_at: string; };
  }> => {
    return apiRequest<{
      message: string;
      profile: { user: User; google_id: string; google_email: string; token_expires_at: string; created_at: string; updated_at: string; };
    }>('/users/profile/update/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// ⭐ New: Drag-and-Drop Categorization API
export const dndApi = {
  // Get calendar data for DnD (personal events + existing categorizations)
  getCalendarData: async (): Promise<CalendarDataResponse> => {
    return apiRequest<CalendarDataResponse>('/api/v1/calendar/dnd/calendar-data/');
  },

  // Create or update categorization (drag personal event to master event)
  createCategorization: async (data: CreateCategorizationRequest): Promise<CategorizationResponse> => {
    return apiRequest<CategorizationResponse>('/api/v1/calendar/dnd/categorize/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update categorization position (when user moves the event in UI)
  updateCategorizationPosition: async (
    categorizationId: number,
    position: { position_x: number; position_y: number }
  ): Promise<CategorizationResponse> => {
    return apiRequest<CategorizationResponse>(
      `/api/v1/calendar/dnd/categorize/${categorizationId}/position/`,
      {
        method: 'PUT',
        body: JSON.stringify(position),
      }
    );
  },

  // Remove categorization (unlink personal event from master event)
  removeCategorization: async (categorizationId: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(
      `/api/v1/calendar/dnd/categorize/${categorizationId}/`,
      {
        method: 'DELETE',
      }
    );
  },

  // ⚠️ DEPRECATED: Use getCalendarData() instead
  // Get all my categorizations (kept for backward compatibility)
  getMyCategorizations: async (): Promise<MyCategorizationsResponse> => {
    console.warn('⚠️ getMyCategorizations is deprecated. Use getCalendarData() instead.');
    return apiRequest<MyCategorizationsResponse>('/api/v1/calendar/dnd/my-categorizations/');
  },
};

// ⭐ Master Events API (課程總表管理)
export const masterEventsApi = {
  // 1. 同步課程總表 (首次使用或課程異動時呼叫)
  syncMasterEvents: async (): Promise<MasterEventSyncResponse> => {
    return apiRequest<MasterEventSyncResponse>(
      '/api/v1/calendar/master-events/sync/',
      { method: 'POST' }
    );
  },

  // 2. 查詢課程列表 (日常使用，有 1 小時快取)
  getMasterEvents: async (forceRefresh: boolean = false): Promise<MasterEventsResponse> => {
    const params = forceRefresh ? '?force_refresh=true' : '';
    return apiRequest<MasterEventsResponse>(
      `/api/v1/calendar/master-events/list/${params}`
    );
  },

  // 3. 查詢單一課程詳細資料
  getMasterEventDetail: async (eventId: number): Promise<MasterEventDetailResponse> => {
    return apiRequest<MasterEventDetailResponse>(
      `/api/v1/calendar/master-events/${eventId}/`
    );
  },
};

export { ApiError };