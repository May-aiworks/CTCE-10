/**
 * 登入頁面
 * 使用 Google Identity Services 前端 OAuth
 */

import React from 'react';
import { LogIn, Shield, Calendar, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { login, loading, error } = useAuth();

  const handleLogin = () => {
    console.log('👆 User clicked login button');
    login();
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-icon">
            <Shield size={48} />
          </div>
          <h1>時數記錄系統</h1>
          <p>請使用 Google 帳號登入以開始使用</p>
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
            {loading ? '載入中...' : '使用 Google 登入'}
          </button>

          <div className="login-info">
            <div className="info-item">
              <Calendar size={16} />
              <span>讀取 Google Calendar 行程</span>
            </div>
            <div className="info-item">
              <FileSpreadsheet size={16} />
              <span>同步課程總表資料</span>
            </div>
            <p className="info-text">
              登入後將會請求以下權限：
              <br />
              • 讀取您的 Google Calendar 事件
              <br />
              • 讀取 Google Sheets 課程資料
              <br />
              • 取得您的 Email 資訊
            </p>
          </div>
        </div>

        <div className="login-footer">
          <p>使用安全的 Google OAuth 2.0 認證</p>
        </div>
      </div>
    </div>
  );
};
