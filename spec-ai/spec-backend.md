# Backend Architecture Specifications (personalrecord)

本文件定義針對「三種前端儲存模式切換 (Vite/Vue3環境)」、「雲端服務選擇 (Firebase vs AWS)」以及「後端語言選擇 (Node.js/Go/Python)」的技術分析與架構建議。供 AI Agent 實作後端架構時參考。

## 1. 前端環境變數與三種儲存模式切換設計

為了滿足前端可以自由切換「純本地、遠端(無驗證)、遠端(LINE Mini App驗證)」，建議在前端專案 (`.env` 或 `.env.local`) 中使用以下環境變數設計：

```env
# 可選值: 'local' | 'remote' | 'liff'
VITE_STORAGE_MODE='liff' 

# 後端 API 基礎路徑
VITE_API_BASE_URL='https://api.yourdomain.com'
```

### 針對三種模式的 API Client 設計 (AI Agent 實作指南)
前端需要實作一個 **Data Service/Repository Layer**，根據 `VITE_STORAGE_MODE` 動態切換實作方式：

1. **`local` 模式 (純前端 localStorage)**：
   - 不呼叫任何 HTTP Request。
   - 所有 CRUD 操作直接讀寫 `window.localStorage`。

2. **`remote` 模式 (資料存後端但無 Mini App 驗證)**：
   - 透過 `fetch` 或 `axios` 呼叫 `VITE_API_BASE_URL`。
   - 身分驗證機制：可以使用簡單的 JWT (例如前端隨機產生或簡單註冊的 UUID 作為 Token 放進 Header `Authorization: Bearer <token>`) 來區分這台裝置的 user，但不綁定 LINE 帳號。

3. **`liff` 模式 (資料存後端且使用 LINE Mini App)**：
   - 呼叫 `liff.init()` 並取得 `liff.getAccessToken()` 或 `liff.getIDToken()`。
   - 將取得的 Token 放進 Header，後端透過 LINE Login API / LIFF SDK 驗證該 Token 並取得真實的 LINE `userId` 進行資料存取。

---

## 2. 後端語言與雲端服務組合搭配分析

針對建置這套包含「即時記錄、圖表查詢、定時推播通知 (Cron job)」的系統，以下是主流的組合分析：

### 組合 A： Node.js (TypeScript) + Firebase (Cloud Functions + Firestore)
**架構描述**：完全 Serverless 方案。前端 Vue3 可以直接接 Firebase SDK 或是透過 Cloud Functions 提供 REST API。定時任務使用 Cloud Scheduler 搭配 Pub/Sub 觸發 Cloud Functions 執行 LINE 通知。

- **優點**：
  - **開發速度極快**：前後端都使用 JS/TS 生態系，開發無縫接軌。
  - **Real-time 支援**：Firestore 天然支援即時資料同步。
  - **維運成本極低**：免管 Server，免費額度對初期專案非常夠用。
  - **Auth 整合容易**：若未來想加入 Email/Google登入，Firebase Auth 很方便（也可與 LINE OIDC 整合）。
- **缺點**：
  - **NoSQL 限制**：Firestore 在做複雜的多表關聯查詢或龐大的報表聚合時（例如跨月份計算特定 RM 分佈）較為笨重且昂貴。
  - **Vendor Lock-in**：高度綁定 Google Firebase 生態圈。
  - **冷啟動 (Cold Start)**：Cloud Functions 偶爾會有幾百毫秒到幾秒的冷啟動延遲。

### 組合 B： Go (Golang) + AWS (API Gateway + Lambda + DynamoDB 或 RDS)
**架構描述**：使用 AWS Serverless 架構，Go 語言提供極致效能的 API。

- **優點**：
  - **效能頂尖**：Go 的冷啟動極快，執行效能極高，對 API 反應速度有非常好的體驗。
  - **高併發**：未來如果突然有百萬人紀錄深蹲，Go 撐得住。
  - **架構嚴謹**：Go 的強型別適合建立穩定且易於維護的後端邏輯。
- **缺點**：
  - **建置門檻高**：AWS 的 IaC (Terraform/CDK) 建置與權限管理 (IAM) 較為複雜。
  - **開發速度較慢**：相比 Node.js，初期建置基礎框架與 ORM 所需時間較長。

### 組合 C： Python (FastAPI) + AWS/GCP (Cloud Run / App Runner + PostgreSQL)
**架構描述**：將後端打包成 Docker Image，跑在全託管的 Container 服務上，搭配關聯式資料庫。

- **優點**：
  - **資料分析友好**：Python 有 Pandas 等強大生態，如果未來想做非常深度的「健身數據 AI 預測 / 疲勞度分析模型」，Python 是唯一解。
  - **PostgreSQL 強項**：關聯式資料庫非常適合處理「使用者 - 訓練紀錄 - 不同種類圖表聚合」這種複雜結構。
  - **框架開發體驗**：FastAPI 自動產出 Swagger 文件，前後端對接很舒適。
- **缺點**：
  - **常駐成本**：只要 Container 開著，或是使用關聯式資料庫 (RDS/Cloud SQL)，即使沒人用也有一筆基礎的低消成本（比 Serverless 貴）。
  - **部署稍慢**：需要 Build Docker Image。

---

## 3. 建議與總結 (AI Agent 推薦架構)

### 🏆 最終推薦組合：Node.js (TypeScript / Express 或 NestJS) + Firebase (或是 Google Cloud Run + PostgreSQL)

針對您的 **Personal Record** 專案，我最強烈建議以下實作方式：

**1. 若著重於「最快上線、成本最低、以紀錄與簡單圖表為主」：**
👉 **選擇： Node.js + Firebase Cloud Functions + Firestore**
**原因**：
您這是一個獨立的 LINE Mini App 專案。前端已經使用 Vue 3 (Vite)，後端使用 Node.js (TypeScript) 能最大化語言的複用性。Firebase Cloud Functions 可以直接寫 REST API，且內建整合度極高，對於您的需求（紀錄 RM、拉圖表資料、定時推播）非常足夠，且初期幾乎 **零維運成本**。這對於個人開發或初步推出的 MVP 專案是絕佳選擇。

**2. 若著重於「未來想要做複雜的健身數據報表、確保關聯資料乾淨」：**
👉 **選擇： Node.js (Fastify/Express) + Google Cloud Run + PostgreSQL (Supabase 是一個極佳的平替方案)**
**原因**：
健身數據本質上非常具有「關聯性」 (使用者 -> 訓練課表 -> 單次訓練紀錄 -> 各組細節)。如果您的圖表需求非常多變（例如：我想看過去三個月，所有下肢訓練重量超過體重兩倍的機率分佈），關聯式資料庫 (SQL) 會比 Firestore 好寫一萬倍。
**Supabase** (基於 PostgreSQL 的開源 Firebase 替代品) 可以一次滿足您「關聯式資料庫 + 便宜 + 快速建立 REST API」的需求。

**💡 關於「提醒通知設定與排程推播」的實作建議：**
不管選哪個，您都需要一個 Cron Job。
- 如果用 Firebase：直接寫一支 `functions.pubsub.schedule('every 24 hours').onRun()` 的腳本，裡面用 Node.js 的 Line Messaging API SDK 發送 Push Message。
- 這樣設計非常輕量且直覺。
