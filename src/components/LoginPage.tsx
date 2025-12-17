/**
 * 登入頁面
 * 使用標準的 Google Identity Services
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Calendar, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { renderGoogleButton } from '../services/googleAuth';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { login, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 初始化 Google Identity 並渲染按鈕
  useEffect(() => {
    // 初始化 Google Identity Services
    login();

    // 等待 DOM 載入後渲染按鈕
    const timer = setTimeout(() => {
      renderGoogleButton('google-signin-button');
    }, 100);

    return () => clearTimeout(timer);
  }, [login]);

  // 登入成功後導向首頁
  useEffect(() => {
    if (isAuthenticated) {
      console.log('✅ Authentication successful, redirecting to home...');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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

          {/* Google 登入按鈕容器 */}
          <div className="google-button-container">
            <div id="google-signin-button"></div>
          </div>

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
