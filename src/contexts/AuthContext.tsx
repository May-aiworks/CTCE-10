/**
 * 前端 Google OAuth 認證 Context
 * 使用 Google Identity Services，不依賴後端
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  loadGoogleIdentityServices,
  initGoogleLogin,
  getAuthStatus,
  logout as googleLogout,
  GoogleAuthStatus,
  getTokenExpiryInfo,
} from '../services/googleAuth';

interface AuthContextType {
  authStatus: GoogleAuthStatus;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
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

  // 登入函數
  const login = () => {
    setError(null);
    console.log('🔐 Initiating Google Login...');

    initGoogleLogin(
      (status) => {
        console.log('✅ Login successful:', status.userEmail);
        setAuthStatus(status);
        setError(null);
      },
      (errorMsg) => {
        console.error('❌ Login failed:', errorMsg);
        setError(errorMsg);
      }
    );
  };

  // 登出函數
  const logout = () => {
    console.log('🚪 Logging out...');
    googleLogout(() => {
      console.log('✅ Logged out successfully');
      setAuthStatus({
        isAuthenticated: false,
        accessToken: null,
        userEmail: null,
        userName: null,
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
    isAuthenticated: authStatus.isAuthenticated,
    userEmail: authStatus.userEmail,
    userName: authStatus.userName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
