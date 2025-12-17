/**
 * 前端 Google OAuth 認證 Context
 * 使用標準的 Google Identity Services
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  loadGoogleIdentityServices,
  initGoogleIdentity,
  getAuthStatus,
  logout as googleLogout,
  GoogleAuthStatus,
  getTokenExpiryInfo,
  showOneTap,
} from '../services/googleAuth';

interface AuthContextType {
  authStatus: GoogleAuthStatus;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  triggerOneTap: () => void;
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  userPicture: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<GoogleAuthStatus>(getAuthStatus());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化：載入 Google Identity Services SDK
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Loading Google Identity Services SDK...');
        await loadGoogleIdentityServices();
        console.log('✅ Google Identity Services SDK loaded');

        // 檢查本地認證狀態
        const status = getAuthStatus();
        setAuthStatus(status);

        if (status.isAuthenticated) {
          console.log('✅ User authenticated:', status.userEmail);

          // 檢查 Token 是否即將過期
          const expiryInfo = getTokenExpiryInfo();
          if (expiryInfo.isExpiringSoon) {
            console.warn(`⚠️ Token expiring in ${expiryInfo.expiresInMinutes} minutes`);
          }
        } else {
          console.log('ℹ️ User not authenticated');
        }
      } catch (err) {
        console.error('❌ Failed to initialize Google Auth:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // 初始化 Google Identity（在 LoginPage 中呼叫）
  const login = () => {
    setError(null);
    console.log('🔐 Initializing Google Identity...');

    initGoogleIdentity(
      (status: GoogleAuthStatus) => {
        console.log('✅ Login successful:', status.userEmail);
        setAuthStatus(status);
        setError(null);
      },
      (errorMsg: string) => {
        console.error('❌ Login failed:', errorMsg);
        setError(errorMsg);
      }
    );
  };

  // 顯示 One Tap（用於自動登入）
  const triggerOneTap = () => {
    if (authStatus.isAuthenticated) {
      return; // 已登入，不需要顯示 One Tap
    }
    console.log('🔄 Triggering One Tap...');
    showOneTap();
  };

  // 登出函數
  const logout = () => {
    console.log('🚪 Logging out...');
    googleLogout(() => {
      console.log('✅ Logged out successfully');
      setAuthStatus({
        isAuthenticated: false,
        idToken: null,
        accessToken: null,
        userEmail: null,
        userName: null,
        userPicture: null,
        expiresAt: null,
      });
      setError(null);
    });
  };

  const value: AuthContextType = {
    authStatus,
    loading,
    error,
    login,
    logout,
    triggerOneTap,
    isAuthenticated: authStatus.isAuthenticated,
    userEmail: authStatus.userEmail,
    userName: authStatus.userName,
    userPicture: authStatus.userPicture,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
