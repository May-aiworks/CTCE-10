/**
 * Google Identity Services 認證服務
 * 使用標準的 Google Sign-In + OAuth 2.0
 */

// Google OAuth 設定
const GOOGLE_CLIENT_ID = '261140688595-51iiav8m2pt9ngmj0t9it13b4r6ift88.apps.googleusercontent.com';

// OAuth Scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',      // 讀取 Google Calendar
  'https://www.googleapis.com/auth/spreadsheets.readonly',  // 讀取 Google Sheets (寫入透過 Apps Script)
].join(' ');

// LocalStorage Keys
const STORAGE_KEYS = {
  ID_TOKEN: 'google_id_token',
  ACCESS_TOKEN: 'google_access_token',
  USER_EMAIL: 'google_user_email',
  USER_NAME: 'google_user_name',
  USER_PICTURE: 'google_user_picture',
  TOKEN_EXPIRES_AT: 'google_token_expires_at',
};

// Google Identity Services 全域物件型別
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: (momentListener?: (notification: {
            isDisplayed: () => boolean;
            isNotDisplayed: () => boolean;
            getNotDisplayedReason: () => string;
            isSkippedMoment: () => boolean;
            getSkippedReason: () => string;
            isDismissedMoment: () => boolean;
            getDismissedReason: () => string;
            getMomentType: () => string;
          }) => void) => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback?: () => void) => void;
        };
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
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

export interface GoogleAuthStatus {
  isAuthenticated: boolean;
  idToken: string | null;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  userPicture: string | null;
  expiresAt: number | null;
}

// JWT Payload 型別
interface JWTPayload {
  email: string;
  name: string;
  picture: string;
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

// Token Client 實例（用於取得 Access Token）
let tokenClient: any = null;

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
 * 解碼 JWT Token（不驗證簽章，僅用於前端顯示）
 */
const parseJwt = (token: string): JWTPayload => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('❌ Failed to parse JWT:', error);
    throw new Error('Invalid JWT token');
  }
};

/**
 * 初始化 Google OAuth（一次性取得所有權限）
 */
export const initGoogleIdentity = (
  onSuccess: (authStatus: GoogleAuthStatus) => void,
  onError: (error: string) => void
): void => {
  if (!isGoogleAuthLoaded()) {
    onError('Google Identity Services SDK not loaded');
    return;
  }

  try {
    // 初始化 Token Client（一次性取得 ID Token + Access Token）
    if (!tokenClient) {
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES + ' openid email profile',  // 加入 OpenID scopes
        callback: async (response) => {
          if (response.error) {
            console.error('❌ OAuth Error:', response.error, response.error_description);
            onError(response.error_description || response.error);
            return;
          }

          try {
            console.log('✅ OAuth Token obtained');

            const accessToken = response.access_token;
            const expiresIn = response.expires_in;
            const expiresAt = Date.now() + (expiresIn * 1000);

            // 使用 Access Token 取得使用者資訊
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!userInfoResponse.ok) {
              throw new Error('Failed to fetch user info');
            }

            const userInfo = await userInfoResponse.json();
            console.log('👤 User Email:', userInfo.email);
            console.log('👤 User Name:', userInfo.name);

            // 儲存認證資訊
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            localStorage.setItem(STORAGE_KEYS.USER_EMAIL, userInfo.email);
            localStorage.setItem(STORAGE_KEYS.USER_NAME, userInfo.name);
            localStorage.setItem(STORAGE_KEYS.USER_PICTURE, userInfo.picture);
            localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
            localStorage.setItem(STORAGE_KEYS.ID_TOKEN, accessToken); // 使用 Access Token 作為 ID Token

            const authStatus: GoogleAuthStatus = {
              isAuthenticated: true,
              idToken: accessToken,
              accessToken,
              userEmail: userInfo.email,
              userName: userInfo.name,
              userPicture: userInfo.picture,
              expiresAt,
            };

            onSuccess(authStatus);
          } catch (error) {
            console.error('❌ Failed to process OAuth response:', error);
            onError(error instanceof Error ? error.message : 'OAuth processing failed');
          }
        },
        error_callback: (error) => {
          console.error('❌ OAuth Error Callback:', error);
          onError(error.message || 'Failed to authenticate');
        },
      });
    }

    console.log('✅ Google OAuth initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Google OAuth:', error);
    onError(error instanceof Error ? error.message : 'Initialization failed');
  }
};

/**
 * 請求 Access Token（用於呼叫 Google APIs）
 */
const requestAccessToken = (
  onSuccess: (accessToken: string, expiresIn: number) => void,
  onError: (error: string) => void
): void => {
  if (!isGoogleAuthLoaded()) {
    onError('Google Identity Services SDK not loaded');
    return;
  }

  // 初始化 Token Client（只需初始化一次）
  if (!tokenClient) {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error('❌ Access Token Error:', response.error, response.error_description);
          onError(response.error_description || response.error);
          return;
        }

        onSuccess(response.access_token, response.expires_in);
      },
      error_callback: (error) => {
        console.error('❌ Access Token Error Callback:', error);
        onError(error.message || 'Failed to get access token');
      },
    });
  }

  // 請求 Access Token（靜默模式，如果已經授權過）
  tokenClient.requestAccessToken({ prompt: '' });
};

/**
 * 渲染 Google 登入按鈕（自訂按鈕觸發 OAuth 流程）
 */
export const renderGoogleButton = (elementId: string): void => {
  if (!isGoogleAuthLoaded()) {
    console.error('❌ Google Identity Services SDK not loaded');
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`❌ Element with id "${elementId}" not found`);
    return;
  }

  // 清空容器
  element.innerHTML = '';

  // 建立自訂按鈕
  const button = document.createElement('button');
  button.className = 'custom-google-signin-button';
  button.innerHTML = `
    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
    <span>使用 Google 帳戶登入</span>
  `;

  button.onclick = () => {
    console.log('🔐 Starting OAuth flow...');
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
      console.error('❌ Token client not initialized');
    }
  };

  element.appendChild(button);
  console.log('✅ Custom Google Sign-In button rendered');
};

/**
 * 顯示 One Tap 提示
 */
export const showOneTap = (): void => {
  if (!isGoogleAuthLoaded()) {
    console.error('❌ Google Identity Services SDK not loaded');
    return;
  }

  window.google!.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed()) {
      console.log('ℹ️ One Tap not displayed:', notification.getNotDisplayedReason());
    } else if (notification.isSkippedMoment()) {
      console.log('ℹ️ One Tap skipped:', notification.getSkippedReason());
    } else if (notification.isDismissedMoment()) {
      console.log('ℹ️ One Tap dismissed:', notification.getDismissedReason());
    }
  });

  console.log('✅ One Tap prompt triggered');
};

/**
 * 檢查認證狀態
 */
export const getAuthStatus = (): GoogleAuthStatus => {
  const idToken = localStorage.getItem(STORAGE_KEYS.ID_TOKEN);
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const userEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  const userName = localStorage.getItem(STORAGE_KEYS.USER_NAME);
  const userPicture = localStorage.getItem(STORAGE_KEYS.USER_PICTURE);
  const expiresAtStr = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);

  if (!idToken || !accessToken || !userEmail || !expiresAtStr) {
    return {
      isAuthenticated: false,
      idToken: null,
      accessToken: null,
      userEmail: null,
      userName: null,
      userPicture: null,
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
      idToken: null,
      accessToken: null,
      userEmail: null,
      userName: null,
      userPicture: null,
      expiresAt: null,
    };
  }

  return {
    isAuthenticated: true,
    idToken,
    accessToken,
    userEmail,
    userName,
    userPicture,
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
 * 登出（清除本地資料 + 停用自動登入）
 */
export const logout = (callback?: () => void): void => {
  const userEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

  // 清除本地資料
  clearAuthData();

  if (isGoogleAuthLoaded()) {
    // 停用 One Tap 自動登入
    window.google!.accounts.id.disableAutoSelect();
    console.log('✅ Auto-select disabled');

    // 撤銷 Google 認證（可選）
    if (userEmail) {
      window.google!.accounts.id.revoke(userEmail, () => {
        console.log('✅ Google credentials revoked');
      });
    }

    // 撤銷 Access Token
    if (accessToken) {
      window.google!.accounts.oauth2.revoke(accessToken, () => {
        console.log('✅ Google Access Token revoked');
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
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
