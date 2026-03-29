# API Request Flow Review (Code Review)

本文件將展示一個「新增訓練紀錄 (Add Session)」的請求，是如何從使用者按下網頁按鈕開始，一路貫穿前端元件、狀態管理、API 介接、後端路由、身分驗證，最終抵達 Firestore 資料庫的完整生命週期。在 Code Review 過程中，若有發現需要回饋修改的地方，皆可直接記錄於本文件。

---

## 範例情境：使用者按下「存檔 (Save)」新增深蹲紀錄

### Phase 1: 前端起手式 (Frontend User Interaction)

**1. 觸發位置：`src/views/RecordView.vue`**
- 使用者填寫完 Weight, Reps 後按下 Save。
- Vue Component 綁定的 `<form @submit.prevent="...">` 被觸發。
- Component 不會自己呼叫 API，而是將組合好的 `FormData` 打包，派發 (Dispatch) 給狀態管理中心：
  ```javascript
  await sessionStore.addSession({
      exercise: 'Squat',
      weight: 100,
      reps: 5,
      sets: 1,
      rtype: 'RM'
  });
  ```

### Phase 2: 狀態管理與 API 層 (Frontend State & Service Layer)

**2. 狀態中心：`src/stores/sessionStore.js`**
- Store 接收到 `addSession` Action 請求。
- 它不知道底層是用 LocalStorage 還是遠端 API，只負責呼叫統一對外的 `api.js`，並在成功後把資料推入畫面的變數中。
  ```javascript
  const newSession = await api.addSession(sessionData);
  this.sessions.push(newSession); // 畫面圖表自動更新
  ```

**3. API 工廠：`src/services/api.js`**
- 根據你的 `.env` 設定 (`VITE_STORAGE_MODE=liff`)，大腦工廠把這個請求指派給遠端服務專家 `LIFFService` 處理。

**4. 網路通訊：`src/services/LIFFService.js`**
- 準備發出真實的 HTTP Request。
- **環境設定與身份覆寫 (Mock Bypass)**：為了滿足本地 Docker 的全端測試環境，服務會檢查 `VITE_MOCK_LIFF_TOKEN`。如果啟用，會自動配發測試用的 Token 騙過後台，避開真實的 LINE OAuth 驗證門檻。
- **身分挾帶 (正常流程)**：為了避開 LINE Mini App 開發初期的 `openid` 權限問題，改呼叫 LINE SDK (`liff.getAccessToken()`) 取得該使用者的「Access Token」，作為連線門票。
- 將 `VITE_API_BASE_URL` (例如在 Docker Compose 測試時會是 `http://localhost:3001/api/v1`) 與端點 `/sessions` 組合，執行 `fetch`。
  ```http
  POST /api/v1/sessions
  Content-Type: application/json
  Authorization: Bearer <AccessToken>
  
  { "exercise": "Squat", "weight": 100, "reps": 5 ...}
  ```

---

### Phase 3: 後端路由與安全驗證 (Backend Routing & Auth)

**5. 接收請求：`backend/src/index.ts`**
- Express 伺服器第一關先用 `app.use(express.json())` 把剛剛從網路飛來的字串還原成 JSON Object (`req.body`)。

**6. 身分驗證 Middleware：`liffAuthMiddleware`**
- 當請求來到 `/api/v1/*` 區域前，被嚴格的保安 `liffAuthMiddleware` 攔截。
- 保安檢查 HTTP Header 裡面有沒有 `Authorization: Bearer <AccessToken>`。
- **防偽造機制**：保安先向 `https://api.line.me/oauth2/v2.1/verify` 查驗這張票是否屬於我們的 `LINE_CLIENT_ID`。
- **取出身分**：查驗無誤後，保安再拿著票去 `https://api.line.me/v2/profile`，獲取真實身分 `userId`。
- 保安最後將真實的 `userId` 貼在這次的包裹上（`req.user = { userId }`）後放行，並順手將個資同步到 Firestore `Users` 集合中。

**7. 路由控制器 (Controller)：`app.post('/api/v1/sessions', ...)`**
- Controller 接手，它知道是「誰」發的請求（這點超重要，防止竄改別人的紀錄），也知道要發什麼「資料」。
- 它轉身交代資料庫總管 (FirestoreDatabase) 去幹活，自己在此 `await` 等待：
  ```typescript
  const newSession = await db.addSession(userId, req.body);
  ```

---

### Phase 4: 資料庫與雲端 (Database Layer / Repository)

**8. Factory 模式調用：`backend/src/db.ts`**
- `db.addSession` 得知指令。此處的 `db` 已經具備了 **Repository Factory** 的身份，它會依據 `process.env.DB_PROVIDER` 決定將請求交付給 `MongoRepository` 或 `FirestoreRepository` 處理。

**8.1 (如果是 MongoDB 模式)**
- **連線池檢查**：`MongoRepository` 確認 `MongoClient` 已連線並取得 `Db` 實體。
- **自動產生存檔抽屜**：呼叫 `new ObjectId().toString()` 產生唯一的主鍵與 `docId`。
- **加上時間浮水印**：建立 `new Date().toISOString()` 當作 `createdAt` 與 `updatedAt`。
- **塞入資料庫**：執行 `await collection.insertOne(...)`，資料正式沉睡在 Verda MongoDB 叢集內。

**9. 沿途折返 (Response Return)**
- Repository 把剛才加上 ID 與時間戳記的完整資料，轉換為通用的 `TrainingSession` 介面字串丟回給 Controller。
- Controller 看到資料搞定了，開心地回覆 `HTTP 201 Created` 並且把 JSON 吐回前端：
  ```javascript
  res.status(201).json({ data: newSession });
  ```
- 前端 `LIFFService` 收到後解開 JSON，一路拋回給 `sessionStore`，最終讓使用者的深蹲曲線在網頁上跳躍了一格。

---

## 🔥 踩坑避雷指南 (Troubleshooting)

### 🚨 錯誤代碼：HTTP 400 Bad Request (`invalid authorization code`)
- **發生情境**：在 LINE Mini App / 外部瀏覽器剛登入並跳轉回來時（網址帶有 `?code=xxx`），前端突然報錯 `LIFF initialization failed`。
- **根本原因 (Vue Concurrency Race Condition)**：
  當使用者打開 `#/dashboard` 時，`App.vue` 的 `onMounted` 鉤子與 `DashboardView.vue` 內的 API 呼叫（如 `api.getSessions()`）可能**同時並發 (Concurrent)** 執行。
  這導致兩方同時判定「LIFF 尚未初始化」而向 LINE API 發送 `liff.init()`。跑最快的請求 A 會成功兌換網址上的 `code` 為 Token，但慢了 1 毫秒的請求 B 也拿著同一張 `code` 試圖兌換，進而遭到 LINE 總部退回 `HTTP 400 Bad Request`（認證碼已被使用）。
- **解決方案 (Promise Lock)**：
  在 Zustand / Pinia 狀態庫 (`src/stores/liffStore.js`) 中加入了一把 `_initPromise` 交換鎖。一旦第一支 Component 開始初始化，就將其 `Promise` 快取起來。後續千軍萬馬的高併發請求，都只會 `return this._initPromise` 安靜排隊等待結果，確保這張一次性的 `code` 絕對不會被重複擊發。

---

## Code Review Feedback (請在這裡紀錄您的意見)

*   [ ] Reviewer feedback 1: ...
*   [ ] Reviewer feedback 2: ...
