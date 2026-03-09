# Backend Architecture Specifications (personalrecord)

本文件定義針對「前端與後端採用 REST API 溝通」、「三種前端儲存模式切換 (Vite/Vue3環境)」，以及「後端語言選擇 (Node.js/Go/Python)」的技術分析與架構建議。供後續 AI Agent 開發時作為核心規格。

## 1. 架構核心原則：全面採用 RESTful API

**變更決定：放棄使用 Firebase/Supabase 前端 SDK 進行資料直接存取，全面改用標準 RESTful API。**

### 原因與優勢 (泛用性考量)
1. **解除 Vendor Lock-in (平台綁定)**：如果前端寫滿了 `import { getDoc, collection } from "firebase/firestore"`，未來想換成自己託管的 PostgreSQL 或 AWS DynamoDB，前端程式幾乎需要重寫。改用 `axios/fetch` 打 REST API，未來後端怎麼換，前端都不用改。
2. **安全性與資料驗證集中化**：透過後端 API Layer，可以在寫入資料庫前做更嚴格的 Payload 驗證（例如：深蹲重量不能超過 1000KG），避免惡意使用者透過前端 SDK 直接將髒資料寫入資料庫。
3. **擴充性更佳**：如果未來有其他 Client（例如 Apple Watch 獨立 App）需要寫入資料，REST API 是最通用的標準。

---

## 2. 前端環境變數與三種儲存模式 (API Client 切換設計)

前端需要實作一個 **Data Service Layer (Repository Pattern)**，根據 `VITE_STORAGE_MODE` 動態切換實作方式：

```env
# 可選值: 'local' | 'remote' | 'liff'
VITE_STORAGE_MODE='liff'

# 後端 API 基礎路徑 (remote 與 liff 模式使用)
VITE_API_BASE_URL='https://api.yourdomain.com'
```

### 實作指南 (AI Agent Reference)
無論是哪種模式，前端對 Component 暴露的介面皆必須一致（例如： `createTrainingRecord(data)`）。

1. **`local` 模式 (純前端)**：
   - 不發送 HTTP Request。
   - 實作方式：直接將資料以 JSON 格式序列化後存入 `window.localStorage`。

2. **`remote` 模式 (純遠端 API，無 LINE 驗證)**：
   - 實作方式：使用 `fetch` / `axios` 呼叫 `VITE_API_BASE_URL`。
   - 驗證方式：前端可自動產生一個 UUID 存放在 localStorage 作為 `deviceId`，並放在 HTTP Request Header (`Authorization: Bearer <deviceId>`)，後端以此區分使用者。

3. **`liff` 模式 (遠端 API + LINE Mini App 驗證)**：
   - 實作方式：同 `remote`，呼叫 `VITE_API_BASE_URL`。
   - 驗證方式：前端透過 `liff.getIDToken()` 取得 LINE 簽發的 JWT。將其放入 HTTP Header (`Authorization: Bearer <IDToken>`)。後端 API 收到 Request 後，必須先驗證此 Token 的合法性並解析出真實的 LINE `userId`，再進行資料庫存取。

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
