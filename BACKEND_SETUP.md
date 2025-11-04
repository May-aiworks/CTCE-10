這邊不要動放原本的樣子這樣才能去跟現在的前端做對照

# Calendar API 前端使用文件

## 🎯 基本資訊

**Base URL**: `http://localhost:8000/api/v1/`
**認證方式**: JWT Token
**回應格式**: JSON

---

## 📋 API 功能總覽

### 認證相關 (`/api/v1/auth/`)
- ✅ Google OAuth 登入流程
- ✅ JWT Token 管理
- ✅ 行事曆資料同步

### 事件查詢 (`/api/v1/auth/`)
- ✅ 本週事件快速查詢
- ✅ 指定行事曆事件同步
- ✅ 行事曆清單取得

### 完整 CRUD 操作 (`/api/v1/calendar/`)
- ✅ 行事曆管理 (讀取)
- ✅ 事件 CRUD (建立、讀取、更新、刪除)
- ✅ 批次更新、事件移動

### 拖放功能 (`/api/v1/calendar/dnd/`)
- ✅ 拖放資料取得
- ✅ 事件歸類管理
- ✅ 使用者偏好設定

---

## 🔐 認證相關 API

### 1. Google OAuth 登入
```http
GET /auth/login/
```

**用途**: 取得 Google OAuth 認證 URL
**認證**: 不需要
**回應**:
```json
{
    "authorization_url": "https://accounts.google.com/oauth2/auth?..."
}
```

### 2. 取得認證資料
```http
GET /auth/data/?token_id={token_id}
```

**用途**: 登入成功後取得使用者資料和 JWT token
**認證**: 不需要
**參數**:
- `token_id`: OAuth callback 回傳的 token ID

**回應**:
```json
{
    "message": "Authentication successful",
    "access_token": "eyJ0eXAiOiJKV1Q...",
    "refresh_token": "eyJ0eXAiOiJKV1Q...",
    "user": {
        "id": 1,
        "username": "user@example.com",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe"
    },
    "calendar_data": {
        "target_calendars": ["rpa_ai_assistant2@aiworks.tw"],
        "total_events": 15,
        "calendars": {...},
        "available_calendars": {...}
    }
}
```

### 3. 認證狀態檢查
```http
GET /auth/status/
Authorization: Bearer {access_token}
```

### 4. 登出
```http
POST /auth/logout/
Authorization: Bearer {access_token}
```

---

## 📅 事件查詢 API

### 1. 取得本週事件 (推薦) ⭐
```http
GET /auth/calendar/events/current-week/
Authorization: Bearer {access_token}
```

**用途**: 快速取得本週事件（週日開始），直接從資料庫查詢，速度最快
**參數**:
- `calendar_id` (可選): 指定行事曆 ID

**回應**:
```json
{
    "success": true,
    "calendar_id": "rpa_ai_assistant2@aiworks.tw",
    "events_count": 15,
    "source": "database",
    "data_type": "current_week",
    "events": [
        {
            "id": "event_id",
            "google_event_id": "6kiij0faajvdov08jejuvan4mu_20250902",
            "title": "May work day 09:30-12:00",
            "summary": "May work day 09:30-12:00",
            "description": "",
            "location": "",
            "start_datetime": "2025-09-23T00:00:00+00:00",
            "end_datetime": "2025-09-24T00:00:00+00:00",
            "start": {
                "dateTime": null,
                "date": "2025-09-23",
                "timeZone": "Asia/Taipei"
            },
            "end": {
                "dateTime": null,
                "date": "2025-09-24",
                "timeZone": "Asia/Taipei"
            },
            "all_day": true,
            "is_all_day": true,
            "status": "confirmed",
            "attendees": ["user1@example.com"],
            "attendees_count": 1,
            "recurrence": [],
            "visibility": "default",
            "color_id": "",
            "calendar_id": "rpa_ai_assistant2@aiworks.tw",
            "duration_minutes": 1440
        }
    ]
}
```

### 2. 同步並取得事件
```http
GET /auth/calendar/events/
Authorization: Bearer {access_token}
```

**用途**: 從 Google Calendar 同步最新事件到資料庫
**參數**:
- `calendar_id` (可選): 行事曆 ID，預設 `rpa_ai_assistant2@aiworks.tw`
- `max_results` (可選): 最大結果數量，預設 50
- `current_week` (可選): 是否只取本週，`true`/`false`，預設 `false`

**範例**:
```javascript
// 同步本週事件
fetch('/api/v1/auth/calendar/events/?current_week=true')

// 同步指定數量事件
fetch('/api/v1/auth/calendar/events/?max_results=100')
```

### 3. 取得行事曆清單
```http
GET /auth/calendar/list/
Authorization: Bearer {access_token}
```

---

## 📅 完整事件 CRUD API (`/api/v1/calendar/`)

### 1. 取得行事曆清單
```http
GET /calendar/calendars/
Authorization: Bearer {access_token}
```

**用途**: 取得使用者所有行事曆
**回應**:
```json
{
    "calendars": [
        {
            "id": "calendar_id",
            "name": "My Calendar",
            "description": "Personal calendar"
        }
    ],
    "count": 1
}
```

### 2. 取得事件列表
```http
GET /calendar/events/?calendar_id={calendar_id}
Authorization: Bearer {access_token}
```

**參數**:
- `calendar_id` (必填): 行事曆 ID
- `time_min` (可選): 開始時間 (ISO 格式)
- `time_max` (可選): 結束時間 (ISO 格式)
- `max_results` (可選): 最大結果數，預設 50

### 3. 建立事件
```http
POST /calendar/events/create/
Authorization: Bearer {access_token}
Content-Type: application/json
```

**請求內容**:
```json
{
    "calendar_id": "calendar_id",
    "title": "新事件",
    "description": "事件描述",
    "start_datetime": "2025-01-01T09:00:00Z",
    "end_datetime": "2025-01-01T10:00:00Z",
    "location": "會議室 A"
}
```

### 4. 更新事件
```http
PUT /calendar/events/{event_id}/update/
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 5. 刪除事件
```http
DELETE /calendar/events/{event_id}/delete/
Authorization: Bearer {access_token}
```

**參數**: 需提供 `calendar_id`

### 6. 批次更新事件
```http
POST /calendar/events/batch-update/
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 7. 移動事件到其他行事曆
```http
POST /calendar/events/move/
Authorization: Bearer {access_token}
Content-Type: application/json
```

**請求內容**:
```json
{
    "source_calendar_id": "source_id",
    "target_calendar_id": "target_id",
    "event_id": "event_id"
}
```

### 8. 取得事件詳情
```http
GET /calendar/events/{event_id}/
Authorization: Bearer {access_token}
```

**參數**:
- `calendar_id` (可選): 指定行事曆 ID

---

## 📚 課程總表 (Master Events) API (`/api/v1/calendar/master-events/`) ⭐ 新增

> **功能說明**: 從 Google Spreadsheet 讀取課程清單作為拖放目標

### 1. 同步課程總表
```http
POST /calendar/master-events/sync/
Authorization: Bearer {access_token}
```

**用途**: 從 Google Spreadsheet「課程總表」同步課程資料到資料庫
**資料來源**:
- Spreadsheet ID: `1RgLFR-0k9sEETiymipAMUKB4EbAVj4ebFI7UuF7HXr4`
- Sheet 名稱: `課程總表`
- 讀取欄位: Column A (ID) + Column D (課程名稱)

**回應**:
```json
{
    "success": true,
    "message": "成功同步 15 個課程",
    "synced_count": 15,
    "created_count": 5,
    "updated_count": 10,
    "synced_at": "2025-10-15T10:30:00Z"
}
```

**⚠️ 首次使用注意事項**:
1. 需要重新授權 Google OAuth (新增 Spreadsheet 權限)
2. 授權時會看到新增的「查看和管理你的試算表」權限
3. 舊的 access_token 無法使用，必須重新登入

---

### 2. 查詢課程列表
```http
GET /calendar/master-events/list/?force_refresh=false
Authorization: Bearer {access_token}
```

**用途**: 查詢已同步的課程列表

**查詢參數**:
- `force_refresh`: `true` 強制從 Spreadsheet 重新同步 | `false` 從資料庫讀取 (預設，快速)

**回應**:
```json
{
    "success": true,
    "events": [
        {
            "id": 1,
            "title": "Python 程式設計",
            "spreadsheet_row_id": "1",
            "event_type": "master",
            "google_event_id": "master_1",
            "description": "課程 ID: 1",
            "start_time": "2025-10-15T10:30:00Z",
            "end_time": "2025-10-15T11:30:00Z",
            "synced_at": "2025-10-15T10:30:00Z"
        }
    ],
    "count": 15,
    "source": "database"
}
```

**欄位說明**:
- `id`: 資料庫 ID (用於拖放時的 `master_event_id`)
- `spreadsheet_row_id`: Google Spreadsheet 中的課程 ID
- `event_type`: 固定為 `"master"` (區別於 `"personal"`)
- `source`: 資料來源 (`cache` / `database` / `google_spreadsheet`)

---

### 3. 取得單一課程詳情
```http
GET /calendar/master-events/{event_id}/
Authorization: Bearer {access_token}
```

**用途**: 查詢指定課程的詳細資訊

**回應**:
```json
{
    "success": true,
    "event": {
        "id": 1,
        "title": "Python 程式設計",
        "spreadsheet_row_id": "1",
        "event_type": "master",
        ...
    }
}
```

---

## 🎯 拖放功能 API (`/api/v1/calendar/dnd/`)

### 1. 取得拖放資料
```http
GET /calendar/dnd/calendar-data/
Authorization: Bearer {access_token}
```

**用途**: 取得拖放功能所需的本週個人事件資料
**回應**:
```json
{
    "success": true,
    "personal_calendar": {
        "calendar_id": "rpa_ai_assistant2@aiworks.tw",
        "events": [...],
        "events_count": 15
    },
    "categorizations": [...],
    "categorizations_count": 5
}
```

**⚠️ 重要變更（2025-10-08 資料庫重構）**：
- `user_preferences` 欄位已移除（UserCalendarPreference 表已刪除）
- 行事曆資訊直接從 `personal_calendar.calendar_id` 取得

### 2. 建立事件歸類
```http
POST /calendar/dnd/categorize/
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 3. 取得我的歸類
```http
GET /calendar/dnd/my-categorizations/
Authorization: Bearer {access_token}
```

### 4. 移除事件歸類
```http
DELETE /calendar/dnd/categorize/{categorization_id}/
Authorization: Bearer {access_token}
```

### 5. 更新歸類位置
```http
PUT /calendar/dnd/categorize/{categorization_id}/position/
Authorization: Bearer {access_token}
Content-Type: application/json
```

### 6. 使用者偏好設定 ❌ **已廢除**
```http
GET/POST /calendar/dnd/preferences/
Authorization: Bearer {access_token}
```

**⚠️ 此 API 已於 2025-10-08 資料庫重構後廢除**
- UserCalendarPreference 模型已刪除
- 改為直接從使用者的 Calendar 物件取得行事曆資訊
- 請使用 `/calendar/dnd/calendar-data/` 中的 `personal_calendar.calendar_id`

---

## 💡 前端使用建議

### **API 選擇策略**

#### 1. 日常查詢事件（推薦）
```javascript
// 最快速度：從資料庫取得本週事件
const response = await fetch('/api/v1/auth/calendar/events/current-week/', {
    headers: {
        'Authorization': `Bearer ${accessToken}`
    }
});
const data = await response.json();
```

#### 2. 強制同步最新資料
```javascript
// 當需要最新資料時才使用（較慢）
const response = await fetch('/api/v1/auth/calendar/events/?current_week=true', {
    headers: {
        'Authorization': `Bearer ${accessToken}`
    }
});
```

#### 3. 完整事件 CRUD 操作
```javascript
// 建立新事件
const response = await fetch('/api/v1/calendar/events/create/', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        calendar_id: 'your_calendar_id',
        title: '新會議',
        start_datetime: '2025-01-01T09:00:00Z',
        end_datetime: '2025-01-01T10:00:00Z'
    })
});

// 刪除事件
await fetch(`/api/v1/calendar/events/${eventId}/delete/`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        calendar_id: 'your_calendar_id'
    })
});
```

### **使用場景建議**

| 使用情境 | 推薦 API | 原因 |
|---------|---------|------|
| 顯示本週行事曆 | `/auth/calendar/events/current-week/` | 最快速度 |
| 即時同步檢查 | `/auth/calendar/events/?current_week=true` | 取得最新資料 |
| 建立/編輯事件 | `/calendar/events/create/` 等 CRUD API | 完整功能 |
| 拖放功能 | `/calendar/dnd/` 系列 API | 專用功能 |

### **處理時間格式**
```javascript
// 事件物件提供多種時間格式，選擇最適合的
const event = data.events[0];

// 方式 1: 使用 ISO 字串
const startTime = new Date(event.start_datetime);

// 方式 2: 使用 Google API 格式
const startTime = event.all_day
    ? new Date(event.start.date)
    : new Date(event.start.dateTime);

// 推薦：直接使用 start_datetime（最簡單）
const startTime = new Date(event.start_datetime);
```

### **錯誤處理**
```javascript
const response = await fetch('/api/v1/auth/calendar/events/current-week/');
const data = await response.json();

if (!data.success) {
    console.error('API 錯誤:', data.error);
    // 處理錯誤
}
```

### **效能最佳化**
- ✅ **日常使用**: `/auth/calendar/events/current-week/` - 超快速度
- ⚠️ **同步資料**: `/auth/calendar/events/` - 較慢但最新
- 🔄 **自動刷新**: 建議每 5-10 分鐘同步一次
- 🎯 **事件管理**: `/calendar/events/` - 完整 CRUD 功能
- 🖱️ **拖放互動**: `/calendar/dnd/` - 專用拖放 API
- 📚 **課程總表**: `/calendar/master-events/list/` - 快取 1 小時 ⭐ 新增

---

### **前端使用範例：課程總表 (Master Events)** ⭐

#### 1. 初始化：同步課程總表
```javascript
// 首次使用或需要更新課程資料時呼叫
async function syncMasterEvents() {
    const response = await fetch('/api/v1/calendar/master-events/sync/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const data = await response.json();

    if (data.success) {
        console.log(`成功同步 ${data.synced_count} 個課程`);
        return data;
    } else {
        console.error('同步失敗:', data.error);

        // 如果是權限錯誤，需要重新授權
        if (data.error.includes('存取權限')) {
            alert('請重新登入授權 (需要 Google Spreadsheet 權限)');
            // 導向登入頁面
        }
    }
}
```

#### 2. 查詢課程列表（日常使用）
```javascript
// 從資料庫/快取讀取 (快速)
async function getMasterEvents() {
    const response = await fetch('/api/v1/calendar/master-events/list/', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    const data = await response.json();

    if (data.success) {
        // 渲染課程下拉選單
        renderMasterEventsDropdown(data.events);
        return data.events;
    }
}

// 渲染下拉選單範例
function renderMasterEventsDropdown(masterEvents) {
    const select = document.getElementById('master-event-select');

    masterEvents.forEach(event => {
        const option = document.createElement('option');
        option.value = event.id;  // 資料庫 ID (用於拖放)
        option.textContent = `${event.spreadsheet_row_id} - ${event.title}`;
        select.appendChild(option);
    });
}
```

#### 3. 強制刷新課程列表
```javascript
// 當課程總表更新時，強制重新同步
async function forceRefreshMasterEvents() {
    const response = await fetch(
        '/api/v1/calendar/master-events/list/?force_refresh=true',
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    const data = await response.json();
    console.log('資料來源:', data.source);  // 'google_spreadsheet'
    return data.events;
}
```

#### 4. 拖放時使用課程 ID
```javascript
// 當使用者拖放個人行程到課程時
async function categorizeToCourse(personalEventId, masterEventId) {
    const response = await fetch('/api/v1/calendar/dnd/categorize/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            personal_event_id: personalEventId,
            master_event_id: masterEventId,  // 使用課程的資料庫 ID
            position_x: 100,
            position_y: 200
        })
    });

    const data = await response.json();

    if (data.success) {
        console.log('歸類成功:', data.categorization);
    }
}
```

#### 5. 完整初始化流程
```javascript
async function initializeApp() {
    try {
        // 1. 檢查是否為首次使用或需要重新授權
        const needsAuth = localStorage.getItem('spreadsheet_auth_done') !== 'true';

        if (needsAuth) {
            console.log('首次使用，需要同步課程總表...');
            await syncMasterEvents();
            localStorage.setItem('spreadsheet_auth_done', 'true');
        }

        // 2. 載入課程列表
        const masterEvents = await getMasterEvents();

        // 3. 載入個人行程
        const personalEvents = await getPersonalEvents();

        // 4. 渲染 UI
        renderUI(masterEvents, personalEvents);

    } catch (error) {
        console.error('初始化失敗:', error);
    }
}
```

---

## 🔧 開發注意事項

### **本週定義**
- 本週從**週日開始**，週六結束
- 自動計算當前週範圍
- 時區使用 `Asia/Taipei`

### **事件資料結構**
- 每個事件提供多種時間格式以確保相容性
- `all_day` 事件使用 `date`，一般事件使用 `dateTime`
- 所有時間均為 ISO 8601 格式

### **認證**
- 使用 JWT Bearer Token
- Token 過期時呼叫 `/auth/refresh/`
- 登入流程採用 OAuth 2.0

### **錯誤狀態碼**
- `200`: 成功
- `400`: 參數錯誤
- `401`: 認證失敗
- `404`: 資源不存在
- `500`: 伺服器錯誤

---

## 📝 資料庫重構說明（2025-10-08）

### **重構目標**
簡化資料庫結構，消除冗餘，提升資料完整性

### **主要變更**

#### 1. 刪除 UserCalendarPreference 模型 ❌
**原因**：完全無用，所有欄位都沒有實際使用或可被其他方式取代

**影響**：
- ❌ `/api/v1/calendar/dnd/preferences/` API 已廢除
- ❌ API 回應中的 `user_preferences` 欄位已移除

**前端應對方式**：
```javascript
// 修改前
const response = await fetch('/api/v1/calendar/dnd/calendar-data/');
const data = await response.json();
const calendarId = data.user_preferences.default_personal_calendar; // ❌ 已移除

// 修改後
const response = await fetch('/api/v1/calendar/dnd/calendar-data/');
const data = await response.json();
const calendarId = data.personal_calendar.calendar_id; // ✅ 正確
```

#### 2. Calendar.user 改用 OneToOneField ✅
**原因**：強制每個使用者只能有一個 Calendar（資料庫層面保證）

**影響**：
- 資料庫層面自動加上 UNIQUE 約束
- 後端程式碼簡化：`user.calendar`（而非 `user.calendars.get()`）
- 前端 API 呼叫完全不受影響

#### 3. 刪除 Event.calendar FK ❌
**原因**：消除資料冗餘（可透過 `event.user.calendar` 推導）

**影響**：
- 後端使用 `@property` 提供 `event.calendar` 屬性
- 前端 API 呼叫完全不受影響
- API 回應格式保持一致

### **前端升級檢查清單**

✅ **完全不受影響的功能**：
- 拖放歸類功能（`POST /calendar/dnd/categorize/`）
- 更新位置（`PUT /calendar/dnd/categorize/{id}/position/`）
- 移除歸類（`DELETE /calendar/dnd/categorize/{id}/`）
- 查詢歸類（`GET /calendar/dnd/my-categorizations/`）
- 所有行事曆同步 API
- 所有事件 CRUD API

⚠️ **需要調整的部分**：
- 如果有使用 `/calendar/dnd/preferences/` API → 改用 `/calendar/dnd/calendar-data/`
- 如果有讀取 `user_preferences` 欄位 → 改用 `personal_calendar.calendar_id`

### **資料庫結構**

```
User (1) ←→ (1) Calendar [OneToOneField]
  ↓
  ├─ Event (*)
  └─ EventCategorization (*)
```

**User**: 使用者帳號
**Calendar**: 每個使用者只有一個行事曆（強制 1:1）
**Event**: 個人行程或主體事件
**EventCategorization**: 拖放歸類關係

---

## 📋 快速開始範例

### **基本設定**
```javascript
// 1. 登入後取得 token
const authData = await fetch('/api/v1/auth/data/?token_id=xxx');
const { access_token } = await authData.json();

// 2. 設定預設 headers
const headers = {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
};
```

### **查詢事件**
```javascript
// 3. 取得本週事件（推薦）
const eventsResponse = await fetch('/api/v1/auth/calendar/events/current-week/', { headers });
const eventsData = await eventsResponse.json();

// 4. 渲染事件
eventsData.events.forEach(event => {
    console.log(`${event.title}: ${event.start_datetime}`);
});
```

### **事件 CRUD 操作**
```javascript
// 建立事件
const createResponse = await fetch('/api/v1/calendar/events/create/', {
    method: 'POST',
    headers,
    body: JSON.stringify({
        calendar_id: 'calendar_id',
        title: '新會議',
        start_datetime: '2025-01-01T09:00:00Z',
        end_datetime: '2025-01-01T10:00:00Z'
    })
});

// 更新事件
const updateResponse = await fetch('/api/v1/calendar/events/event_id/update/', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
        calendar_id: 'calendar_id',
        title: '更新的會議標題'
    })
});

// 刪除事件
await fetch('/api/v1/calendar/events/event_id/delete/', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ calendar_id: 'calendar_id' })
});
```

### **拖放功能**
```javascript
// 取得拖放資料
const dndResponse = await fetch('/api/v1/calendar/dnd/calendar-data/', { headers });
const dndData = await dndResponse.json();

// 建立事件歸類
await fetch('/api/v1/calendar/dnd/categorize/', {
    method: 'POST',
    headers,
    body: JSON.stringify({
        master_event_id: 'master_event',
        personal_event_id: 'personal_event',
        position_x: 100,
        position_y: 200
    })
});
```