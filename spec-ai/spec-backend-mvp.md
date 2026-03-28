# Backend Architecture Specifications (personalrecord)

本文件定義針對「前端與後端採用 REST API 溝通」、「三種前端儲存模式切換 (Vite/Vue3環境)」，以及「後端語言選擇 (Node.js/Go/Python)」的技術分析與架構建議。供後續 AI Agent 開發時作為核心規格。

## 1. 架構核心原則：全面採用 RESTful API

**變更決定：放棄使用 Firebase/Supabase 前端 SDK 進行資料直接存取，全面改用標準 RESTful API。**

### 原因與優勢 (泛用性考量)
1. **解除 Vendor Lock-in (平台綁定)**：如果前端寫滿了 `import { getDoc, collection } from "firebase/firestore"`，未來想換成自己託管的 PostgreSQL 或 AWS DynamoDB，前端程式幾乎需要重寫。改用 `axios/fetch` 打 REST API，未來後端怎麼換，前端都不用改。
2. **安全性與資料驗證集中化**：透過後端 API Layer，可以在寫入資料庫前做更嚴格的 Payload 驗證（例如：深蹲重量不能超過 1000KG），避免惡意使用者透過前端 SDK 直接將髒資料寫入資料庫。
3. **擴充性更佳**：如果未來有其他 Client（例如 Apple Watch 獨立 App）需要寫入資料，REST API 是最通用的標準。

---

## 2. 前端環境變數與雙重儲存模式 (API Client 切換設計)

前端需要實作一個 **Data Service Layer (Repository Pattern)**，根據 `VITE_STORAGE_MODE` 動態切換實作方式。
建議在初期開發與測試階段 100% 依賴 `local` 模式，待整合上線時再切換為 `liff` 模式：

```env
# 可選值: 'local' | 'liff'
VITE_STORAGE_MODE='local'

# 後端 API 基礎路徑 (liff 模式使用)
VITE_API_BASE_URL='https://api.yourdomain.com'
```

### 實作指南 (AI Agent Reference)
無論是哪種模式，前端對 Component 暴露的介面皆必須一致（例如： `createTrainingRecord(data)`）。

1. **`local` 模式 (純前端，開發與離線測試基礎)**：
   - 不發送 HTTP Request。
   - 實作方式：直接將資料以 JSON 格式序列化後存入瀏覽器的 `window.localStorage`。

2. **`liff` 模式 (遠端 API + LINE Mini App 驗證，正式上線環境)**：
   - 實作方式：使用 `fetch` / `axios` 呼叫 `VITE_API_BASE_URL`。
   - 驗證方式：前端透過 `liff.getAccessToken()` 取得 LINE 簽發的 Access Token。將其放入 HTTP Header (`Authorization: Bearer <AccessToken>`)。後端 API 收到 Request 後，必須先透過 `v2.1/verify` 查驗 Channel ID，再透過 `v2/profile` 取出真實的 LINE `userId`，再進行資料庫存取。


---

## 3. 後端語言與架構建議 (REST API 導向)

既然決定前端透過 REST API 溝通，後端就必須扮演好 API Server 的角色。以下是針對 Node.js、Go、Python 的分析：

### 推薦組合一： Node.js (TypeScript) + 雲端 Serverless (Firebase Cloud Functions 或 AWS Lambda)
**適合：希望前後端語言統一、快速迭代、維護成本最低。**

* **架構**：使用 Express 或是更現代的 Fastify 框架包裝成一個 API Server，並掛載在 Firebase Cloud Functions (`onRequest`) 或是 AWS API Gateway + Lambda 上。後方接 Firestore 或 DynamoDB (NoSQL)，或者接 Serverless SQL (如 PlanetScale/Neon)。
* **調整後的評價**：非常推薦。雖然不用直接在前端用 Firebase SDK，但用 Firebase Cloud Functions 把 Node.js 包裝成 REST API 也是主流做法（稱為 callable functions 或 HTTP functions）。這樣既保有 Serverless 的免管伺服器優勢，又做到了 REST API 的完全解耦。

### 推薦組合二： Python (FastAPI) + Google Cloud Run (或 AWS App Runner) + Relational DB (PostgreSQL)
**適合：未來明確有複雜數據分析、AI 預測需求、且偏好關聯式資料庫結構。**

* **架構**：使用 FastAPI (自動生成 OpenAPI Spec 供前端參考) 建立 API Server，打包成 Docker Image 後部署至全託管的 Container 服務。資料庫選用 PostgreSQL。
* **調整後的評價**：如果您未來想要針對「停滯期」或是「RM 成長曲線」套用機器學習模型預測，Python 是唯一霸主。FastAPI 開發神速且效能優異，這會是一個非常「正規且強大」的現代化全端架構。缺點是 Container 可能無法做到像 Serverless 那樣完全零成本的縮放（通常會需要一點基本的最低運行費用，雖然很微小）。

### 備選組合： Go (Golang) + AWS 服務
**適合：極致追求 API 回應速度、高併發量。**

* **架構**：使用 Gin 或 Echo 框架開發 API Server。
* **調整後的評價**：對於個人記錄工具來說，Go 的效能有點殺雞用牛刀。除非您預期這款 App 會突然爆紅有幾十萬人同時使用，否則其較陡峭的開發曲線與繁雜的 AWS 建置步驟，在初期 MVP 階段可能會拖慢您的腳步。

---

## 4. 最終架構建議總結

考慮到「REST API 泛用性高」以及本專案為 LINE Mini App (注重快速互動)：

**🏆 首選架構： Node.js (TypeScript / Express) 包裝成 Cloud Functions (Firebase) + Firestore**

雖然不直接使用 Firebase Client SDK，但我們依舊可以利用其後端基礎設施。
1. **完全解耦**：前端用 Axios 打一般 API。
2. **前後端都在 TS 生態系**：您可以共用 `spec-data.md` 裡面定義的 TypeScript Type。
3. **無伺服器 (Serverless)**：專注寫 API 邏輯，不用管 Docker 或 Server 設定。
4. **Auth 整合單純**：收到前端傳來的 `liff.getIDToken()` 後，Node.js 裡可以直接用 LINE 的 API 或是 Firebase Admin SDK (`firebase-admin`) 驗證並建立使用者 Session。
5. **排程任務易實作**：使用 Firebase 原生的 `pubsub.schedule` 定時去掃資料庫並呼叫 LINE Notify/Messaging API 判斷是否需要發送停滯/未紀錄通知。

**💡 如果您非常渴望擁有「關聯式資料庫 (SQL)」的乾淨結構：**
請將後端換成 **Node.js + Supabase** 或 **Python (FastAPI) + PostgreSQL**。這兩者在實作 REST API 上都有極佳的開發體驗。

---

## 5. 資料庫結構與實作設計 (Firestore Data Model)

為了滿足 MVP 的需求，並以 NoSQL 結構最大化存取效能，我們建議採用以下的 Firestore Collection 結構：

### Collection: `users` (使用者設定與基本資料)
每位使用者只有一份 Document，`docId` 直接使用 LINE 的 `userId`，方便快速查詢。
* `__name__` (Doc ID): `{LINE_USER_ID}` (例如 `U1234567890abcdef...`)
* `displayName` (string): 使用者 LINE 暱稱。
* `pictureUrl` (string): 大頭貼網址。
* `settings` (map): 放推播防怠惰開關設定 (與目前全域的 `PR_SETTINGS` 對齊)。
* `createdAt` (timestamp): 首次註冊時間。
* `updatedAt` (timestamp): 最新更新時間。

### Collection: `training_sessions` (訓練紀錄)
每一組 (Set) 的紀錄都是一篇獨立的 Document。
* `__name__` (Doc ID): `{自動產生的 Firestore ID}`
* `userId` (string): 關聯的 LINE `userId`（必定加上 Index 以便篩選該推播的使用者）。
* `date` (string): `YYYY-MM-DD` 格式（前端傳入的訓練日期）。
* `exercise` (string): 動作名稱 (例如 `Squat`)。
* `weight` (number): 重量 (公斤/磅)。
* `reps` (number): 次數。
* `sets` (number): 組數(或編號)。
* `rtype` (string): `RM` 或是 `Volume`。
* `createdAt` (timestamp)
* `updatedAt` (timestamp)

### Collection: `body_metrics` (體脂與體重數據)
每天一筆，可以用 `userId_YYYY-MM-DD` 的形式當作 `docId` 實現天然且無重複地 Upsert 行為。
* `__name__` (Doc ID): `{LINE_USER_ID}_{YYYY-MM-DD}` (例如 `U1234_2026-03-10`)
* `userId` (string): 關聯的 LINE `userId`。
* `date` (string): `YYYY-MM-DD`。
* `fatPercentage` (number): 體脂率 %。
* `bodyWeight` (number): 體重 KG。
* `createdAt` (timestamp)
* `updatedAt` (timestamp)

> 💡 **Firebase 開發實戰：** 初期為了無痛開發與除錯，我們會在本機啟動 `express` 伺服器，並使用一個變數 `const mockDb = {}` 作為 In-Memory Mock DB 暫存上述的 Collection。待架構與前端 UI 對接成功後，只需把 CRUD 的部份換成真實的 `firebase-admin/firestore` SDK 即可無縫接軌。

---

> **給 AI Agent 的實作指引 (API Design Example)**:
> 
> ```http
> POST /api/v1/training-records
> Authorization: Bearer <LIFF_TOKEN>
> Content-Type: application/json
> 
> {
>   "date": "2026-03-07T10:00:00Z",
>   "exercise": "Squat",
>   "weight": 110,
>   "reps": 5,
>   "sets": 3,
>   "rtype": "RM"
> }
> ```

---

## Need to Confirm

* **[AI 提出] 後端環境初始化方式**：由於時間緊迫，請問要直接在目錄下建立 `functions` 結構以相容 Firebase Cloud Functions，還是先建立一般標準的 `backend` (Node.js/Express) 目錄，之後再決定部署平台？（建議先建立標準 Express + TypeScript API Server，方便本機獨立測試）
* **[AI 提出] 資料庫/環境變數狀況**：目前是否已經建立好 Firebase 專案並取得儲存金鑰 (`serviceAccountKey.json`)？若無，是否同意先以記憶體模擬 (Mock DB) 讓 API 端點運作，優先確保前後端串接完成？

---

## QA 紀錄

| 紀錄時間 | 問題 / 討論重點 | 結論 / 狀態 |
| :--- | :--- | :--- |
| `2026-03-10 17:37` | **使用者指示**：<br>確認後續討論將以後端及前後端整合為主，確立規格文件的更新原則（全端整合更新 `spec_and_tasks_mvp.md`，後端更新 `spec-backend-mvp.md`，前端更新 `spec-behavior-mvp.md`）。因時間緊迫，要求立即開始建置後端架構。 | **AI 結論**：<br>已了解文件更新守則，並於本文件加上 `Need to Confirm` 與 `QA 紀錄` 區塊，統一追蹤未來後端開發過程的決策。同步產生了 MVP 後端開發的 API Task List 與 Implementation Plan，待確認後即刻動工。 |
| `2026-03-10 17:45` | **使用者提問**：<br>1. 是否能在 Mini App (LIFF) 中取得使用者 ID，以便後端存資料與發送推播通知 (Push Message)？<br>2. 如何部署 Firebase Functions 與 Firestore？<br>3. 要求 AI 根據最新規格實作資料表設計與 In-Memory 的 Backend API 雛形。 | **AI 結論**：<br>1. **LINE User ID 擷取與推播解答**：其實目前透過 LIFF 是有辦法拿到 `userId` 的！前端調用 `liff.getProfile()` 即可取得；而在與後端 API 溝通時，前端應呼叫 `liff.getIDToken()` 並作為 JWT 送給後端。後端使用 LINE 官方 SDK (或自建解碼程式) 驗證該 Token 後，即可解出其中藏著的 `sub`，該值就是真實的 `userId`。只要這位使用者**有將你的官方帳號 (Official Account) 加入好友**，你後端隨時可以呼叫 LINE Messaging API (`POST https://api.line.me/v2/bot/message/push`) 並帶上這組 `userId` 來發送收費的 Push Message 推播。<br>2. **部署教學解答**：只需四個步驟：(A) 註冊 Firebase Console 並啟用 Firestore Database (Native 模式) 以及升級到 Blaze 付費方案 (要部署 Node18+ 必須綁卡)。 (B) 在本機 `npm install -g firebase-tools`。 (C) `firebase login` 並 `firebase init functions`。 (D) 撰寫好 Express app 匯出給 Firebase 後，打 `firebase deploy --only functions` 即可上線。<br>3. **動工確認**：已於檔案上方更新「**5. 資料庫結構與實作設計 (Firestore Data Model)**」。並準備切換至 Execution 模式為您馬上建置 In-Memory Mock DB 版的本地 API。 |
| `2026-03-10 18:22` | **使用者提問**：<br>1. 要求整理架構、LINE Middleware、Firestore Schema 與 API Endpoints 位置。<br>2. 要求撰寫 `firebase-deploy.md` 教學手冊，包含如何將 In-memory DB 換成真正的 Firebase Admin SDK。<br>3. 詢問目前的 In-Memory DB 原理，是否重新啟動伺服器資料就會消失？ | **AI 結論**：<br>1. **架構位置說明**：<br>   - **後端架構與 API Endpoints**：皆實作於 `backend/src/index.ts`。包含 `GET/POST/PUT/DELETE /api/v1/sessions` 以及 `GET/POST/DELETE /api/v1/body-metrics`。<br>   - **LINE 身分驗證 Middleware**：實作於 `backend/src/index.ts` 中的 `mockLiffAuth`，目前藉由擷取 HTTP Header 模擬驗證。<br>   - **Firestore Schema (資料表結構)**：文件定義於本檔案 `spec-backend-mvp.md` 的**第 5 點**；目前的本機 Mock 實作邏輯程式碼則位於 `backend/src/mockDb.ts`。<br>2. **操作手冊**：已建立 `spec-ai/firebase-deploy.md`，該手冊包含四階段教學，尤其是第三階段詳細記錄了如何掛載 `firebase-admin` 並將寫死在陣列的 CRUD 函式轉換為非同步的 `db.collection().doc().set()` 真實資料庫寫入。<br>3. **In-Memory DB 原理解答**：完全正確。目前的 `mockDb.ts` 在底層是宣告了 `Map<string, TrainingSession>` (存在 Node.js 行程的 Heap 記憶體中)。因此只要你把 Terminal 的 `npm run dev` 關閉再重開，或是重新部屬，資料就會揮發歸零。這種設計能讓我們初期無痛除錯 API 邏輯與前端畫面連動，待 UI 沒問題後，再依據第 2 點的教學換上不消失的真實 Firebase。 |
