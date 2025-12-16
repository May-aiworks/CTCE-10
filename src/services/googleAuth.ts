/**
 * Google Identity Services 認證服務
 * 使用前端 OAuth 2.0，不需要後端
 */

// Google OAuth 設定
const GOOGLE_CLIENT_ID = '261140688595-51iiav8m2pt9ngmj0t9it13b4r6ift88.apps.googleusercontent.com';

// OAuth Scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',      // 讀取 Google Calendar
  'https://www.googleapis.com/auth/spreadsheets.readonly',  // 讀取 Google Sheets (寫入透過 Apps Script)
  'https://www.googleapis.com/auth/userinfo.email',         // 取得使用者 email
  'openid'                                                   // 基本身份驗證
].join(' ');

// LocalStorage Keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_access_token',
  USER_EMAIL: 'google_user_email',
  USER_NAME: 'google_user_name',
  TOKEN_EXPIRES_AT: 'google_token_expires_at',
};

// Google Identity Services 全域物件型別
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token: string;
              expires_in: number;
              token_type: string;
              scope: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: { type: string; message: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

export interface GoogleAuthStatus {
  isAuthenticated: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  expiresAt: number | null;
}

/**
 * 檢查 Google Identity Services 是否已載入
 */
export const isGoogleAuthLoaded = (): boolean => {
  return typeof window.google !== 'undefined' &&
         typeof window.google.accounts !== 'undefined';
};

/**
 * 載入 Google Identity Services SDK
 */
export const loadGoogleIdentityServices = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isGoogleAuthLoaded()) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Identity Services SDK loaded');
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Google Identity Services SDK'));
    };
    document.head.appendChild(script);
  });
};

/**
 * 初始化 Google OAuth 登入
 */
export const initGoogleLogin = (
  onSuccess: (authStatus: GoogleAuthStatus) => void,
  onError: (error: string) => void
): void => {
  if (!isGoogleAuthLoaded()) {
    onError('Google Identity Services SDK not loaded');
    return;
  }

  const client = window.google!.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (response) => {
      if (response.error) {
        console.error('❌ Google Auth Error:', response.error, response.error_description);
        onError(response.error_description || response.error);
        return;
      }

      console.log('✅ Google Auth Success');
      console.log('Access Token:', response.access_token.substring(0, 20) + '...');
      console.log('Expires In:', response.expires_in, 'seconds');
      console.log('Scopes:', response.scope);

      // 儲存 Access Token
      const expiresAt = Date.now() + (response.expires_in * 1000);
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());

      // 取得使用者資訊
      try {
        const userInfo = await fetchUserInfo(response.access_token);
        localStorage.setItem(STORAGE_KEYS.USER_EMAIL, userInfo.email);
        localStorage.setItem(STORAGE_KEYS.USER_NAME, userInfo.name);

        const authStatus: GoogleAuthStatus = {
          isAuthenticated: true,
          accessToken: response.access_token,
          userEmail: userInfo.email,
          userName: userInfo.name,
          expiresAt,
        };

        onSuccess(authStatus);
      } catch (error) {
        console.error('❌ Failed to fetch user info:', error);
        onError('Failed to fetch user information');
      }
    },
    error_callback: (error) => {
      console.error('❌ Google Auth Error Callback:', error);
      onError(error.message || 'Authentication failed');
    },
  });

  // 觸發 OAuth 流程（會開啟彈窗）
  client.requestAccessToken();
};

/**
 * 取得使用者資訊（email, name）
 */
const fetchUserInfo = async (accessToken: string): Promise<{ email: string; name: string }> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  const data = await response.json();
  return {
    email: data.email,
    name: data.name || data.email,
  };
};

/**
 * 檢查認證狀態
 */
export const getAuthStatus = (): GoogleAuthStatus => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const userEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  const userName = localStorage.getItem(STORAGE_KEYS.USER_NAME);
  const expiresAtStr = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);

  if (!accessToken || !userEmail || !expiresAtStr) {
    return {
      isAuthenticated: false,
      accessToken: null,
      userEmail: null,
      userName: null,
      expiresAt: null,
    };
  }

  const expiresAt = parseInt(expiresAtStr, 10);

  // 檢查 Token 是否過期
  if (Date.now() >= expiresAt) {
    console.warn('⚠️ Access Token expired');
    clearAuthData();
    return {
      isAuthenticated: false,
      accessToken: null,
      userEmail: null,
      userName: null,
      expiresAt: null,
    };
  }

  return {
    isAuthenticated: true,
    accessToken,
    userEmail,
    userName,
    expiresAt,
  };
};

/**
 * 取得 Access Token
 */
export const getAccessToken = (): string | null => {
  const authStatus = getAuthStatus();
  return authStatus.isAuthenticated ? authStatus.accessToken : null;
};

/**
 * 取得使用者 Email
 */
export const getUserEmail = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
};

/**
 * 登出（清除本地資料 + 撤銷 Google Token）
 */
export const logout = (callback?: () => void): void => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  // 清除本地資料
  clearAuthData();

  // 撤銷 Google Access Token
  if (accessToken && isGoogleAuthLoaded()) {
    window.google!.accounts.oauth2.revoke(accessToken, () => {
      console.log('✅ Google Access Token revoked');
      if (callback) callback();
    });
  } else {
    if (callback) callback();
  }
};

/**
 * 清除認證資料
 */
export const clearAuthData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('🗑️ Auth data cleared');
};

/**
 * 檢查是否有特定 Scope 權限
 */
export const hasScope = (scope: string): boolean => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  // 注意：這只是檢查本地狀態，實際權限需要由 API 回應驗證
  return !!accessToken;
};

/**
 * 格式化過期時間
 */
export const getTokenExpiryInfo = (): {
  expiresAt: Date | null;
  expiresInMinutes: number | null;
  isExpiringSoon: boolean;
} => {
  const expiresAtStr = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  if (!expiresAtStr) {
    return { expiresAt: null, expiresInMinutes: null, isExpiringSoon: false };
  }

  const expiresAt = new Date(parseInt(expiresAtStr, 10));
  const now = Date.now();
  const expiresInMs = expiresAt.getTime() - now;
  const expiresInMinutes = Math.floor(expiresInMs / 60000);

  return {
    expiresAt,
    expiresInMinutes,
    isExpiringSoon: expiresInMinutes < 5, // 5 分鐘內過期
  };
};
