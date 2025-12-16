import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AuthButton: React.FC = () => {
  const { isAuthenticated, userEmail, userName, loading, error, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="auth-section">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-section">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-section">
        <button className="auth-button login" onClick={login}>
          <LogIn size={16} />
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="auth-section">
      <div className="user-info">
        <span className="user-email">{userEmail}</span>
        <span className="user-name">{userName}</span>
        <span className="google-connected">
          📅 Google Calendar Connected
        </span>
      </div>
      <div className="auth-buttons">
        <button className="auth-button logout" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
};