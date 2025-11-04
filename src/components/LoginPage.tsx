import React, { useState } from 'react';
import { LogIn, Lock, Shield } from 'lucide-react';
import { authApi } from '../services/api';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { authorization_url } = await authApi.login();
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-icon">
            <Shield size={48} />
          </div>
          <h1>Welcome to Kanban Board</h1>
          <p>Please authorize your account to continue</p>
        </div>

        <div className="login-content">
          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={loading}
          >
            <LogIn size={20} />
            {loading ? 'Authorizing...' : 'Authorize Login'}
          </button>

          <div className="login-info">
            <div className="info-item">
              <Lock size={16} />
              <span>Secure OAuth 2.0 Authentication</span>
            </div>
            <p className="info-text">
              You will be redirected to authorize your Google account for calendar integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};