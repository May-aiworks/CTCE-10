# 日曆應用功能擴展實施計劃

## 📌 概述

本文檔描述了三個主要功能的實施計劃：
1. 可拖動分隔線調整左右欄位寬度
2. 雙擊課程展開周視圖
3. 在周視圖中拖放事件進行歸類和編輯

---

## 🎯 需求總結

### 需求 1: 可拖動分隔線
- **目標**: Personal Events 與 Master Events 之間的分隔線可以拖動
- **樣式**: 橫式左右箭頭圖標（⟷）
- **功能**: 自由調整兩邊畫面的分割大小比例
- **持久化**: 保存用戶偏好設置

### 需求 2: 雙擊課程展開周視圖
- **觸發**: 雙擊右欄的課程卡片
- **視圖**: 展開完整周視圖（周日-周六）
- **時間軸**: 0:00-23:59 全天
- **顯示內容**: 只顯示已歸類到該課程的 personal events
- **可編輯**: 支持拖動調整事件時間和長度

### 需求 3: 周視圖中的拖放歸類
- **場景**: 在周視圖 Modal 中操作
- **布局**: 左側 personal events 列表保持不變（除非調整分隔線）
- **功能**: 從左側拖動 personal events 到右側時間格子
- **行為**: 建立歸類關係，**不改變**事件原始時間
- **限制**: 只能在展開的課程周視圖中進行歸類

---

## 🏗️ 架構變更

### 主畫面流程變更

#### 現有流程（將被移除）
```
左欄 Personal Events (可拖動)
    ↓ 拖放
右欄 Course Cards (可接收拖放)
    ↓
建立歸類關係
```

#### 新流程
```
左欄 Personal Events (不可拖動)

右欄 Course Cards (只能雙擊，不接收拖放)
    ↓ 雙擊
打開周視圖 Modal
    ↓
在 Modal 中進行歸類和編輯
```

### Modal 架構
```
┌─────────────────────────────────────────────────────────────┐
│  [課程名稱]                                        [關閉 ×] │
├──────────────────┬──┬──────────────────────────────────────┤
│ Personal Events  │⟷│  周日  周一  周二  周三  周四  周五  周六 │
│                  │  │ ┌────────────────────────────────────┐ │
│ ┌──────────────┐ │  │ │ 00:00 ────────────────────────────│ │
│ │ Event 1      │ │  │ │ 01:00 ────────────────────────────│ │
│ │ 09:00-10:00  │ │  │ │ 02:00 ────────────────────────────│ │
│ └──────────────┘ │  │ │ 03:00 ────────────────────────────│ │
│                  │  │ │  ...                               │ │
│ ┌──────────────┐ │  │ │ 22:00 ────────────────────────────│ │
│ │ Event 2      │ │  │ │ 23:00 ────────────────────────────│ │
│ │ 14:00-15:30  │ │  │ └────────────────────────────────────┘ │
│ └──────────────┘ │  │                                        │
│                  │  │  [已歸類事件顯示在對應時間格子中]      │
└──────────────────┴──┴──────────────────────────────────────┘
```

---

## 📋 實施階段

### 階段 1: 實現可拖動分隔線
**檔案**: 新增 `src/components/ResizableSplitter.tsx`

**功能**:
- 可復用的分隔線組件
- 支持水平方向拖動
- 視覺樣式：中央線 + 左右箭頭圖標（⟷）
- 拖動時顯示視覺反饋（例如改變顏色）

**技術實現**:
```typescript
interface ResizableSplitterProps {
  onResize: (leftWidth: number, rightWidth: number) => void;
  minLeftWidth?: number;  // 最小左側寬度百分比
  minRightWidth?: number; // 最小右側寬度百分比
  initialLeftWidth?: number; // 初始左側寬度百分比
}
```

**事件流程**:
1. `mousedown` - 開始拖動
2. `mousemove` - 計算新的寬度比例
3. `mouseup` - 停止拖動，保存到 localStorage

**修改檔案**:
- `src/components/WeeklyCategorization.tsx`
  - 將 `.two-column-layout` 的 grid-template-columns 改為動態值
  - 插入 `<ResizableSplitter />` 組件
  - 從 localStorage 讀取/保存寬度偏好

**CSS 變更**:
- 移除固定的 `grid-template-columns: 1fr 1fr`
- 改用動態計算的百分比值

---

### 階段 2: 移除主畫面拖放功能

**修改檔案**: `src/components/WeeklyCategorization.tsx`

**變更內容**:
1. **移除 DndContext**（主畫面層級）
   - 移除 `<DndContext>` wrapper
   - 移除 `handleDragStart`, `handleDragEnd` 函數
   - 移除 `sensors`, `activeEvent` state

2. **修改 Personal Events 列表**
   - 將 `DraggableEventCard` 改為普通的 `EventCard`
   - 移除 `useDraggable` hook
   - 保留雙擊編輯功能

3. **修改 Course Cards**
   - 將 `DroppableCourseCard` 改為普通的 `CourseCard`
   - 移除 `useDroppable` hook
   - 移除懸浮高亮效果
   - **新增雙擊事件處理**:
     ```typescript
     const handleDoubleClick = (courseId: string) => {
       setSelectedCourse(courseId);
       setShowWeekViewModal(true);
     };
     ```

4. **課程卡片 UI 更新**
   - 顯示課程名稱
   - 新增提示文字："雙擊展開周視圖"
   - 可選：顯示已歸類事件數量

**CSS 變更**:
- 移除拖動相關的 CSS (`.dragging`, `.drag-overlay`, etc.)
- 新增雙擊提示的樣式
- 新增 hover 效果（提示可以雙擊）

---

### 階段 3: 實現周視圖 Modal

#### 3.1 創建周視圖組件
**新增檔案**: `src/components/WeekCalendarView.tsx`

**功能**:
- 顯示 7 天 × 24 小時的網格
- 時間軸從 0:00 到 23:59（每小時一格，共 24 格）
- 顯示已歸類到該課程的 personal events
- 事件顯示在其原始時間位置
- 可接收從左側列表拖放的事件

**組件結構**:
```typescript
interface WeekCalendarViewProps {
  courseId: string;
  courseName: string;
  categorizedEvents: NormalizedEvent[]; // 已歸類的事件
  weekOffset: number; // 當前顯示的週次
  onEventDrop: (eventId: string, newStartTime: string) => void;
  onEventResize: (eventId: string, newEndTime: string) => void;
}
```

**網格布局**:
- 使用 CSS Grid
- 8 列：時間軸標籤 + 7 天
- 24 行：0:00-23:00（每小時）
- 時間格子高度：建議 60px（每小時）

**事件渲染邏輯**:
```typescript
// 計算事件在網格中的位置
const calculateEventPosition = (event: NormalizedEvent) => {
  const startTime = new Date(event.startDateTime);
  const dayOfWeek = startTime.getDay(); // 0-6 (周日-周六)
  const hour = startTime.getHours();
  const minute = startTime.getMinutes();

  return {
    column: dayOfWeek + 2, // +2 因為第一列是時間標籤
    row: hour + 1,         // +1 因為有 header row
    top: minute,           // 分鐘偏移
    height: event.durationMinutes // 事件高度
  };
};
```

**CSS 要點**:
```css
.week-calendar-grid {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  grid-template-rows: 40px repeat(24, 60px);
}

.time-slot {
  border: 1px solid #e0e0e0;
  position: relative;
}

.calendar-event {
  position: absolute;
  background: #4285f4;
  border-radius: 4px;
  padding: 4px;
  overflow: hidden;
  cursor: move;
}
```

#### 3.2 創建 Modal 組件
**新增檔案**: `src/components/CourseWeekViewModal.tsx`

**功能**:
- 全屏或大尺寸 Modal
- 左側：Personal Events 列表（可拖動）
- 中間：可拖動分隔線
- 右側：WeekCalendarView 組件
- 頂部：課程名稱 + 關閉按鈕

**組件結構**:
```typescript
interface CourseWeekViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  weekOffset: number; // 從主畫面傳入當前週次
}
```

**布局**:
```tsx
<Modal isOpen={isOpen} onClose={onClose} size="fullscreen">
  <ModalHeader>
    <h2>{courseName} - 周視圖</h2>
    <CloseButton onClick={onClose} />
  </ModalHeader>

  <ModalBody className="week-view-container">
    <DndContext onDragEnd={handleDragEnd}>
      <div className="week-view-layout">
        <div className="left-panel" style={{ width: `${leftWidth}%` }}>
          <h3>Personal Events</h3>
          <div className="events-list">
            {personalEvents.map(event => (
              <DraggableEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        <ResizableSplitter
          onResize={handleResize}
          initialLeftWidth={30}
        />

        <div className="right-panel" style={{ width: `${rightWidth}%` }}>
          <WeekCalendarView
            courseId={courseId}
            courseName={courseName}
            categorizedEvents={categorizedEvents}
            weekOffset={weekOffset}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
          />
        </div>
      </div>
    </DndContext>
  </ModalBody>
</Modal>
```

**State 管理**:
```typescript
const [leftWidth, setLeftWidth] = useState(30); // 左側佔 30%
const [categorizedEvents, setCategorizedEvents] = useState<NormalizedEvent[]>([]);
const [personalEvents, setPersonalEvents] = useState<NormalizedEvent[]>([]);
```

---

### 階段 4: 實現 Modal 內的拖放功能

**檔案**: `src/components/CourseWeekViewModal.tsx`

#### 4.1 左側事件列表拖放設置
```typescript
// DraggableEventCard - 在 Modal 中啟用拖動
const { attributes, listeners, setNodeRef, transform } = useDraggable({
  id: `modal-personal-event-${event.id}`,
  data: {
    type: 'personal-event',
    event: event
  }
});
```

#### 4.2 右側時間格子接收拖放
```typescript
// 每個時間格子作為 droppable
const TimeSlot = ({ day, hour }: { day: number; hour: number }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `time-slot-${day}-${hour}`,
    data: { day, hour }
  });

  return (
    <div
      ref={setNodeRef}
      className={`time-slot ${isOver ? 'hover' : ''}`}
    >
      {/* 時間格子內容 */}
    </div>
  );
};
```

#### 4.3 拖放事件處理
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) return;

  // 從左側拖到時間格子 = 建立歸類
  if (active.data.current?.type === 'personal-event') {
    const personalEvent = active.data.current.event;
    const { day, hour } = over.data.current;

    // 建立歸類關係（不改變事件時間）
    createCategorization({
      personalEventId: personalEvent.id,
      masterEventId: courseId,
      personalEventTitle: personalEvent.title,
      masterEventTitle: courseName,
      personalEventStart: personalEvent.startDateTime,
      personalEventEnd: personalEvent.endDateTime,
    });

    // 更新顯示
    setCategorizedEvents(prev => [...prev, personalEvent]);
    setPersonalEvents(prev => prev.filter(e => e.id !== personalEvent.id));
  }

  // 在時間格子中拖動 = 調整時間
  if (active.data.current?.type === 'calendar-event') {
    const eventId = active.data.current.eventId;
    const { day, hour } = over.data.current;

    // 計算新的開始時間
    const newStartTime = calculateNewStartTime(weekOffset, day, hour);

    // 更新事件時間
    updateEventTime(eventId, newStartTime);
  }
};
```

---

### 階段 5: 周視圖內的事件編輯

**檔案**: `src/components/WeekCalendarView.tsx`

#### 5.1 拖動調整開始時間
```typescript
// CalendarEvent 組件
const CalendarEvent = ({ event }: { event: NormalizedEvent }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `calendar-event-${event.id}`,
    data: {
      type: 'calendar-event',
      eventId: event.id,
      event: event
    }
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="calendar-event"
      style={{
        transform: CSS.Transform.toString(transform),
        top: `${calculateTop(event)}px`,
        height: `${calculateHeight(event)}px`,
      }}
    >
      <div className="event-title">{event.title}</div>
      <div className="event-time">{formatEventTime(event)}</div>

      {/* 底部調整大小手柄 */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
};
```

#### 5.2 拖動底部調整長度
```typescript
const handleResizeStart = (e: React.MouseEvent) => {
  e.stopPropagation(); // 防止觸發拖動

  const startY = e.clientY;
  const startHeight = eventRef.current.offsetHeight;

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.clientY - startY;
    const newHeight = Math.max(30, startHeight + deltaY); // 最小 30px

    // 計算新的結束時間
    const newDurationMinutes = Math.round(newHeight / 60 * 60); // 60px = 1小時
    const newEndTime = calculateNewEndTime(event.startDateTime, newDurationMinutes);

    // 更新預覽
    setPreviewEndTime(newEndTime);
  };

  const handleMouseUp = () => {
    // 更新事件
    updateEventEndTime(event.id, previewEndTime);

    // 清理事件監聽
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
```

#### 5.3 更新 Google Calendar
```typescript
// src/services/googleCalendar.ts

export const updateEventTime = async (
  eventId: string,
  newStartTime: string,
  newEndTime?: string
): Promise<void> => {
  const event = await gapi.client.calendar.events.get({
    calendarId: 'primary',
    eventId: eventId,
  });

  const updatedEvent = {
    ...event.result,
    start: { dateTime: newStartTime },
    end: { dateTime: newEndTime || event.result.end.dateTime },
  };

  await gapi.client.calendar.events.update({
    calendarId: 'primary',
    eventId: eventId,
    resource: updatedEvent,
  });
};
```

---

## 🗂️ 檔案結構

### 新增檔案
```
src/
├── components/
│   ├── ResizableSplitter.tsx          # 可拖動分隔線組件
│   ├── ResizableSplitter.css
│   ├── WeekCalendarView.tsx           # 周視圖組件
│   ├── WeekCalendarView.css
│   ├── CourseWeekViewModal.tsx        # 課程周視圖 Modal
│   └── CourseWeekViewModal.css
```

### 修改檔案
```
src/
├── components/
│   ├── WeeklyCategorization.tsx       # 移除拖放、添加分隔線、添加雙擊
│   └── WeeklyCategorization.css       # 更新樣式
├── services/
│   └── googleCalendar.ts              # 新增 updateEventTime 函數
```

---

## 🎨 視覺設計要點

### 分隔線樣式
```css
.resizable-splitter {
  width: 16px;
  background: #f5f5f5;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  transition: background-color 0.2s;
}

.resizable-splitter:hover {
  background: #e8e8e8;
}

.resizable-splitter.dragging {
  background: #4285f4;
}

.splitter-icon {
  color: #666;
  font-size: 16px;
}
```

### 課程卡片樣式（雙擊提示）
```css
.course-card {
  cursor: pointer;
  transition: all 0.2s;
}

.course-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.course-card .hint {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.course-card:hover .hint {
  opacity: 1;
}
```

### 周視圖樣式
```css
.week-calendar-view {
  overflow: auto;
  height: 100%;
}

.time-slot {
  border: 1px solid #e0e0e0;
  min-height: 60px;
  position: relative;
  background: #fff;
}

.time-slot:hover {
  background: #f5f5f5;
}

.time-slot.droppable-hover {
  background: #e3f2fd;
  border-color: #4285f4;
}

.calendar-event {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 4px;
  padding: 8px;
  margin: 2px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: move;
  position: absolute;
  left: 2px;
  right: 2px;
}

.calendar-event:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.calendar-event .resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  background: rgba(255,255,255,0.3);
  border-radius: 0 0 4px 4px;
}

.calendar-event .resize-handle:hover {
  background: rgba(255,255,255,0.5);
}
```

---

## 🔧 技術細節

### 時間計算工具函數
```typescript
// src/utils/timeCalculations.ts

/**
 * 根據週次偏移、星期幾、小時計算具體時間
 */
export const calculateDateTime = (
  weekOffset: number,
  dayOfWeek: number,  // 0-6 (周日-周六)
  hour: number,       // 0-23
  minute: number = 0
): string => {
  const now = new Date();
  const currentDay = now.getDay();
  const daysToAdd = (weekOffset * 7) + (dayOfWeek - currentDay);

  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysToAdd);
  targetDate.setHours(hour, minute, 0, 0);

  return targetDate.toISOString();
};

/**
 * 計算事件在網格中的位置
 */
export const getEventGridPosition = (event: NormalizedEvent) => {
  const start = new Date(event.startDateTime);

  return {
    day: start.getDay(),           // 0-6
    hour: start.getHours(),        // 0-23
    minute: start.getMinutes(),    // 0-59
    topOffset: start.getMinutes(), // 在格子內的偏移（px）
    height: event.durationMinutes  // 高度（分鐘）
  };
};

/**
 * 將分鐘轉換為像素高度（1小時=60px）
 */
export const minutesToPixels = (minutes: number): number => {
  return (minutes / 60) * 60; // 60px per hour
};

/**
 * 將像素高度轉換為分鐘
 */
export const pixelsToMinutes = (pixels: number): number => {
  return Math.round((pixels / 60) * 60);
};
```

### 事件衝突處理
當多個事件在同一時間段時：
```typescript
/**
 * 檢測並處理事件衝突
 */
export const layoutOverlappingEvents = (
  events: NormalizedEvent[]
): Array<NormalizedEvent & { width: number; left: number }> => {
  // 按開始時間排序
  const sorted = [...events].sort((a, b) =>
    new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );

  const columns: NormalizedEvent[][] = [];

  sorted.forEach(event => {
    // 找到第一個不衝突的列
    let placed = false;
    for (let col of columns) {
      const lastEvent = col[col.length - 1];
      if (new Date(event.startDateTime) >= new Date(lastEvent.endDateTime)) {
        col.push(event);
        placed = true;
        break;
      }
    }

    // 如果沒有找到，創建新列
    if (!placed) {
      columns.push([event]);
    }
  });

  // 計算每個事件的寬度和左偏移
  return sorted.map(event => {
    const colIndex = columns.findIndex(col => col.includes(event));
    const totalCols = columns.length;

    return {
      ...event,
      width: 100 / totalCols,        // 百分比寬度
      left: (100 / totalCols) * colIndex  // 百分比偏移
    };
  });
};
```

### localStorage 結構
```typescript
// 分隔線寬度偏好
interface SplitterPreference {
  mainView: {
    leftWidth: number;   // 百分比 (0-100)
    rightWidth: number;
  };
  modalView: {
    leftWidth: number;
    rightWidth: number;
  };
}

// 儲存鍵名
const SPLITTER_PREF_KEY = 'splitter_preferences';

// 保存偏好
export const saveSplitterPreference = (
  view: 'mainView' | 'modalView',
  leftWidth: number,
  rightWidth: number
) => {
  const prefs = JSON.parse(localStorage.getItem(SPLITTER_PREF_KEY) || '{}');
  prefs[view] = { leftWidth, rightWidth };
  localStorage.setItem(SPLITTER_PREF_KEY, JSON.stringify(prefs));
};

// 讀取偏好
export const loadSplitterPreference = (
  view: 'mainView' | 'modalView'
): { leftWidth: number; rightWidth: number } => {
  const prefs = JSON.parse(localStorage.getItem(SPLITTER_PREF_KEY) || '{}');
  return prefs[view] || { leftWidth: 50, rightWidth: 50 }; // 預設值
};
```

---

## ⚠️ 注意事項與邊界情況

### 1. 事件時間與顯示週次不符
**問題**: Personal event 的時間可能不在當前顯示的週次內

**解決方案**:
- 在左側列表顯示所有 personal events（不限週次）
- 拖到周視圖時，不自動調整時間
- 如果事件時間不在當前週，在周視圖中不顯示
- 提示用戶：「此事件時間不在當前週，拖入後需手動調整時間」

### 2. 全天事件處理
**問題**: 目前過濾掉全天事件，但用戶可能想歸類全天事件

**解決方案**:
- 在左側列表顯示全天事件（標記為「全天」）
- 在周視圖頂部添加全天事件區域（類似 Google Calendar）
- 或：不允許歸類全天事件（保持現有邏輯）

**建議**: 保持現有邏輯（過濾全天事件），簡化實現

### 3. 事件跨天處理
**問題**: 事件可能跨越多天（例如：Monday 23:00 - Tuesday 02:00）

**解決方案**:
- 在周視圖中，事件只顯示在開始日期的列
- 高度延伸到該列底部，並在視覺上提示「跨天」
- 或：拆分顯示（在兩天都顯示部分）

**建議**: 簡化實現 - 只在開始日期顯示，並限制拖動調整時不能跨天

### 4. 事件衝突與重疊
**問題**: 多個事件在同一時間段

**解決方案**: 使用 `layoutOverlappingEvents` 函數並排顯示，自動調整寬度

### 5. 時區問題
**問題**: Google Calendar API 返回的時間可能包含時區資訊

**解決方案**:
- 統一使用用戶本地時區
- 在計算網格位置時，確保使用本地時間

### 6. 拖動效能
**問題**: 大量事件時，拖動可能卡頓

**優化方案**:
- 使用 `React.memo` 優化事件卡片渲染
- 使用虛擬滾動（如果事件數量超過 100）
- 限制同時顯示的週次（只顯示當前週）

### 7. 移動端支持
**問題**: 拖放在觸控設備上可能不好用

**解決方案**:
- 使用 `@dnd-kit` 的 TouchSensor
- 添加長按開始拖動的提示
- 或：在移動端使用不同的 UI（例如點擊選擇）

**建議**: 先專注桌面端，移動端可後續優化

---

## 🧪 測試計劃

### 階段 1 測試：分隔線
- [ ] 拖動分隔線可以調整左右寬度
- [ ] 拖動到最小/最大寬度時停止
- [ ] 刷新頁面後，寬度偏好保持不變
- [ ] 分隔線視覺反饋正常（hover、dragging 狀態）

### 階段 2 測試：移除拖放
- [ ] 主畫面無法拖動 personal events
- [ ] 主畫面課程卡片無法接收拖放
- [ ] 雙擊課程卡片可以打開 Modal
- [ ] 課程卡片顯示「雙擊展開」提示

### 階段 3 測試：周視圖 Modal
- [ ] Modal 正確顯示 7 天 × 24 小時網格
- [ ] 已歸類事件顯示在正確的時間位置
- [ ] 未歸類事件顯示在左側列表
- [ ] Modal 內的分隔線可以正常拖動
- [ ] 關閉 Modal 後，主畫面狀態不變

### 階段 4 測試：Modal 拖放
- [ ] 從左側拖動事件到時間格子成功
- [ ] 建立歸類關係（存到 sessionStorage）
- [ ] 事件從左側列表移除，出現在周視圖
- [ ] 事件顯示在原始時間位置（不改變時間）
- [ ] 拖放視覺反饋正常

### 階段 5 測試：事件編輯
- [ ] 拖動事件可以調整開始時間
- [ ] 拖動底部可以調整事件長度
- [ ] 更新同步到 Google Calendar
- [ ] 更新後刷新可以看到最新數據
- [ ] 事件衝突時正確並排顯示

### 邊界情況測試
- [ ] 事件時間不在當前週時的處理
- [ ] 事件跨天時的顯示
- [ ] 大量事件時的效能
- [ ] 快速拖動時的響應

---

## 📅 預估工作量

| 階段 | 主要任務 | 複雜度 |
|-----|---------|--------|
| 階段 1 | 實現可拖動分隔線 | 中 |
| 階段 2 | 移除現有拖放功能 | 低 |
| 階段 3 | 實現周視圖 Modal | 高 |
| 階段 4 | Modal 內拖放功能 | 中 |
| 階段 5 | 事件編輯功能 | 高 |

**關鍵挑戰**:
1. 周視圖的網格佈局和事件定位計算
2. 事件拖動時的時間計算
3. 事件衝突時的佈局算法
4. Google Calendar API 的更新同步

---

## 🚀 開始實施

準備好後，將按照以下順序實施：
1. ✅ 階段 1: 實現可拖動分隔線
2. ✅ 階段 2: 移除主畫面拖放功能
3. ✅ 階段 3: 實現周視圖 Modal
4. ✅ 階段 4: Modal 內拖放功能
5. ✅ 階段 5: 事件編輯功能

每個階段完成後會進行測試和確認，再繼續下一階段。

---

**文檔版本**: 1.0
**最後更新**: 2025-12-17
**狀態**: 待實施
