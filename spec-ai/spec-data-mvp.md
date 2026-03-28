# Data Specifications for AI Agents (personalrecord)

該文件定義了本專案所需的核心資料結構與規格要求，供後續 AI Agent 在開發與串接資料庫或狀態管理 (例如: Vuex / Pinia / LocalStorage / Firebase) 時作為參考標準。以下使用 TypeScript Interfaces 的型式來表達資料結構。

## 1. 訓練紀錄 (Training Records)
用於記錄每日或單次的重量訓練細節。包含主要資訊如動作、重量、組數、次數。

```typescript
interface TrainingRecord {
  id: string;              // 紀錄的唯一識別碼 (例如: UUID)
  date: string;            // 訓練日期與時間 (ISO 8601 格式，如 "YYYY-MM-DDTHH:mm:ssZ")
  exercise: string;        // 訓練動作名稱 (例如: "Squat", "Bench Press")
  weight: number;          // 重量數值 (單位: KG)
  reps: number;            // 該組次數 (如果是 RM 紀錄，則記錄下達到的次數，例如 5)
  sets: number;            // 組數
  rtype: 'RM' | 'Normal';  // 紀錄類型 (若為破紀錄/達到指定 RM 的紀錄則標記為 'RM')
  notes?: string;          // 補充備註 (例如: RPE 感受、狀態)
}
```
*範例：Squat 110KG 5RM * 3 set，則 `exercise: 'Squat', weight: 110, reps: 5, sets: 3, rtype: 'RM'`*

## 2. 訓練表現與身體數據紀錄 (Performance & Body Metrics)
用於追蹤使用者的最佳表現 (PR, Personal Records) 與關鍵身體指標。

```typescript
// 訓練表現紀錄 (Performance Metrics)
interface PerformanceRecord {
  id: string;
  date: string;            // 記錄日期
  exercise: string;        // 訓練動作 (例如: "Squat")
  rmType: '1RM' | '3RM' | '5RM'; // 紀錄類型
  weight: number;          // 重量 (KG)
}

// 身體數據紀錄 (Body Metrics)
interface BodyMetricsRecord {
  id: string;
  date: string;            // 記錄日期
  bodyWeight: number;      // 體重數值 (KG)
  bodyFatPercentage: number; // 體脂率 (%)
}
```

## 3. 圖表資訊與互動規格 (Chart Data Specifications)
UI 上圖表 (Highcharts) 將結合訓練表現與身體數據，以時間維度顯示趨勢。

- **支援時間維度 (Time Scopes)**:
  - Day (日)
  - Week (週)
  - Month (月)
  - Year (年)
- **UI 互動與操作**:
  - 支援使用 Highcharts 在介面上「隨意拖拉時間軸 (Draggable X-axis/Timeline Pan)」。
  - 支援「時間範圍選取 (Zooming/Range Selection)」。
- **資料聚合要求**:
  - AI Agent 在處理資料給圖表前，需依據所選擇的時間維度，對 `PerformanceRecord` 與 `BodyMetricsRecord` 進行聚合 (Aggregation) 處理，確保圖表渲染效能與準確率。

```typescript
interface ChartDataSeries {
  name: string;            // 數值名稱 (例如: "Squat 3RM", "Body Fat %")
  data: [number, number][]; // [Timestamp (毫秒), Value] 的陣列，供 Highcharts 時間序列圖表使用
  type: 'line' | 'spline' | 'column'; // 圖表呈現類型
}
```

## 4. 提醒通知設定 (Reminder & Notification Settings)
用於決定是否透過 LINE 推送通知，以及觸發通知的條件（停滯或無紀錄）。

```typescript
interface NotificationSettings {
  userId: string;
  
  // 停滯提醒設定 (Stagnation Alert)
  stagnationAlert: {
    enabled: boolean;        // [開關] 當體脂率 / 訓練表現停滯時是否開啟 LINE 通知
    thresholdDays: number;   // [條件] 當體脂率 / 訓練表現停滯多久(天)時要跳通知
  };

  // 無紀錄提醒設定 (Missing Records Alert)
  missingRecordAlert: {
    enabled: boolean;        // [開關] 當體脂率 / 訓練表現沒有紀錄時是否開啟 LINE 通知
    thresholdDays: number;   // [條件] 當體脂率 / 訓練表現多久(天)沒有紀錄時要跳通知
  };
}
```

## 5. LocalStorage (JSON Export) Data Structure
目前純前端模式 (`local` storage mode) 的完整資料狀態被儲存在瀏覽器的 `localStorage` 中。匯出檔案 (例如 `personal_record_app.json`) 結構如以下 JSON Schema：

```typescript
interface LocalStorageExport {
  // 1. 動作自定義清單
  PR_CUSTOM_EXERCISES?: string[]; // 例: ["Hang Clean", "Deadlift"]

  // 2. 訓練表現紀錄集合
  PR_SESSIONS?: {
    id: string;              // 唯一碼 UUID
    date: string;            // 日期 YYYY-MM-DD
    exercise: string;        // 動作名稱
    weight: number;          // 重量 (KG)
    reps: number;            // 次數
    createdAt: number;       // 時間戳記 (毫秒)
  }[];

  // 3. 身體數據紀錄集合
  PR_BODY_METRICS?: {
    id: string;              // 唯一碼 UUID
    date: string;            // 日期 YYYY-MM-DD
    bodyWeight?: number;     // 體重 (KG)，可選
    fatPercentage?: number;  // 體脂率 (%)，可選
    updatedAt: number;       // 更新時間戳記 (毫秒)
  }[];

  // 4. 使用者偏好設定
  PR_SETTINGS?: {
    notifyStaleExercise: boolean; // 停滯太久未更換動作提醒
    notifyNoTraining: boolean;    // 沒有訓練紀錄提醒
    notifyNoBodyFat: boolean;     // 沒有體脂紀錄提醒
    themeMode: 'auto' | 'light' | 'dark'; // 主題偏好
  };

  // 5. 其他音訊/播放列表資料 (與本次訓練核心無關，可視需求忽略)
  playlists?: Record<string, any[]>;
  playlistTimestamps?: Record<string, number>;

  // 6. 開發階段 PoC 資料 (開發過程產物，可忽略)
  PR_POC_SESSIONS?: any[];
}
```

## 6. Database Migration Strategy (LocalStorage to Firestore)
為了支援跨裝置且與 LINE 推播整合的進階功能，未來需將上述 LocalStorage 資料轉換並匯入 Firestore。
匯入策略與對應表如下：

1. **User Settings & Custom Exercises (`users` collection)**
   - 提取 `PR_SETTINGS` 與 `PR_CUSTOM_EXERCISES`。
   - 更新至 Document `users/{LINE_USER_ID}` 中：
     ```json
     {
       "settings": { /* PR_SETTINGS 內容 */ },
       "customExercises": [ /* PR_CUSTOM_EXERCISES 內容 */ ],
       "updatedAt": <Firestore Timestamp>
     }
     ```

2. **Training Sessions (`training_sessions` collection)**
   - 走訪 `PR_SESSIONS` 陣列中的每一個物件。
   - 寫入 `training_sessions` 表，可使用原本的 `session.id` 作為 Document ID，或由 Firestore 自動生成 ID。
   - 映射成 Firestore 中的格式：
     - `userId`: 綁定目前的登入者 `{LINE_USER_ID}`。
     - `date`: `session.date`。
     - `exercise`: `session.exercise`。
     - `weight`: `session.weight`。
     - `reps`: `session.reps`。
     - `createdAt` / `updatedAt`: Firestore Timestamp (可透過 `session.createdAt` 轉換)。
     - *註：若舊有紀錄缺乏 `sets` 或 `rtype` 欄位，可給予預設值 (例如 `sets: 1`, `rtype: "Normal"`) 或進行資料清洗。*

3. **Body Metrics (`body_metrics` collection)**
   - 走訪 `PR_BODY_METRICS` 陣列。
   - 寫入 `body_metrics` 表，推薦使用 `{LINE_USER_ID}_{date}` 作為 Document ID 以防止同一天重複。
   - 映射成 Firestore 中的格式：
     - `userId`: `{LINE_USER_ID}`。
     - `date`: `metric.date`。
     - `bodyWeight`: `metric.bodyWeight` (若有)。
     - `fatPercentage`: `metric.fatPercentage` (若有)。
     - `createdAt` / `updatedAt`: Firestore Timestamp (透過 `metric.updatedAt` 轉換，若無 createdAt 則共用 updatedAt)。
