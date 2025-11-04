# API 端點一覽表

## 🔐 認證相關 `/api/v1/auth/`

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/auth/login/` | 取得 Google OAuth 授權 URL | ❌ |
| GET | `/auth/callback/` | OAuth 回調處理 (由 Google 呼叫) | ❌ |
| GET | `/auth/data/?token_id={token_id}` | 取得使用者資料和 JWT Token | ❌ |
| GET | `/auth/status/` | 檢查認證狀態 | ✅ |
| POST | `/auth/logout/` | 登出 | ✅ |
| POST | `/auth/refresh/` | 更新 Access Token | ✅ |

## 📅 行事曆事件查詢 `/api/v1/auth/calendar/`

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/auth/calendar/events/` | 同步並取得事件 | ✅ |
| GET | `/auth/calendar/events/current-week/` | 取得本週事件 | ✅ |
| GET | `/auth/calendar/list/` | 取得行事曆清單 | ✅ |

## 📋 行事曆與事件 CRUD `/api/v1/calendar/`

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/calendar/calendars/` | 取得行事曆列表 | ✅ |
| GET | `/calendar/events/` | 取得事件列表 | ✅ |
| POST | `/calendar/events/create/` | 建立事件 | ✅ |
| GET | `/calendar/events/{event_id}/` | 取得事件詳情 | ✅ |
| PUT | `/calendar/events/{event_id}/update/` | 更新事件 | ✅ |
| DELETE | `/calendar/events/{event_id}/delete/` | 刪除事件 | ✅ |
| POST | `/calendar/events/batch-update/` | 批次更新事件 | ✅ |
| POST | `/calendar/events/move/` | 移動事件到其他行事曆 | ✅ |

## 🔄 個人事件同步 `/api/v1/calendar/personal-events/`

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/calendar/personal-events/weekly/` | 取得每週個人事件 | ✅ |
| POST | `/calendar/personal-events/sync/` | 手動觸發同步 | ✅ |
| GET | `/calendar/sync/status/` | 查詢同步狀態 | ✅ |

## 📚 課程總表 `/api/v1/calendar/master-events/`

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| POST | `/calendar/master-events/sync/` | 從 Google Spreadsheet 同步課程 | ✅ |
| GET | `/calendar/master-events/list/` | 取得課程列表 (支援快取與強制刷新) | ✅ |
| GET | `/calendar/master-events/{event_id}/` | 取得課程詳情 | ✅ |

## 🎯 拖放功能 `/api/v1/calendar/dnd/`

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| GET | `/calendar/dnd/calendar-data/` | 取得拖放所需資料 (個人事件+歸類記錄) | ✅ |
| POST | `/calendar/dnd/categorize/` | 建立事件歸類 (拖放到課程) | ✅ |
| DELETE | `/calendar/dnd/categorize/{id}/` | 刪除事件歸類 | ✅ |
| PUT | `/calendar/dnd/categorize/{id}/position/` | 更新歸類位置 | ✅ |
| GET | `/calendar/dnd/my-categorizations/` | 取得我的歸類列表 | ✅ |

---

**Base URL**: `http://localhost:8000/api/v1/`
**認證方式**: Bearer Token
**總計**: 28 個 API 端點
