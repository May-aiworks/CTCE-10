import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthStatus, User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  authStatus: AuthStatus | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  revokeGoogleAccess: () => Promise<void>;
  checkAuth: () => Promise<void>;
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
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Checking authentication status...');
      const status = await authApi.checkAuthStatus();
      console.log('📊 Auth status response:', status);
      setAuthStatus(status);
      setUser(status.user || null);

      if (status.is_authenticated) {
        console.log('✅ User is authenticated, should redirect to Kanban');
      } else {
        console.log('❌ User is not authenticated');
      }
    } catch (err) {
      console.error('🚨 Authentication check failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication check failed');
      setAuthStatus({ is_authenticated: false });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async () => {
    try {
      setError(null);
      const { authorization_url } = await authApi.login();
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authApi.logout();
      setAuthStatus({ is_authenticated: false });
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  const refreshToken = useCallback(async () => {
    try {
      setError(null);
      await authApi.refreshToken();
      await checkAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token refresh failed');
    }
  }, [checkAuth]);

  const revokeGoogleAccess = async () => {
    try {
      setError(null);
      await authApi.revokeGoogleAccess();
      setAuthStatus({ is_authenticated: false });
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke access failed');
    }
  };

  useEffect(() => {
    // Check for OAuth success parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    const tokenId = urlParams.get('token_id');

    if (authSuccess === 'success' && tokenId) {
      console.log('OAuth success detected, checking auth status...');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkAuth();
  }, []);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (user?.token_expires_at) {
      const expiresAt = new Date(user.token_expires_at);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      // Refresh token 5 minutes before expiry
      const refreshTime = timeUntilExpiry - 5 * 60 * 1000;

      if (refreshTime > 0) {
        const timeoutId = setTimeout(() => {
          refreshToken();
        }, refreshTime);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [user?.token_expires_at, refreshToken]);

  const value: AuthContextType = {
    authStatus,
    user,
    loading,
    error,
    login,
    logout,
    refreshToken,
    revokeGoogleAccess,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};