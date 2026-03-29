# 專案遷移與資料庫重構：Verda MongoDB 化與內部合規

為了將專案部署至 LINE 內部 Verda 雲端環境，我們必須將目前的資料層從 Firebase Firestore 徹底遷移至 **Verda MongoDB Service**。本計畫將說明架構改動、Verda 內部限制、以及如何利用分支進行安全平滑的遷移。

## ⚠️ Verda 內部限制與規範 (Constraints)

根據 `/internal` 文件的重點解讀，部署至公司內部有以下硬性規定：
1. **封閉網路存取 (Network Isolation)**：正式環境 (Prod) 無法直連外部 Firebase 服務，必須使用內部託管的 Verda MongoDB Service。
2. **映像檔來源 (Harbor Registry)**：App Runner 正式上線 (Route B) 僅支援從 LINE Harbor 拉取 public project 內的映像，不可依賴 Docker Hub 直連。
3. **OpenAI 呼叫限制**：前端絕對不可直連 OpenAI。後端必須使用內部申請的服務 API Key，且金鑰必須透過 App Runner Secret 注入，嚴禁寫入原始碼。

## 🛠️ Proposed Changes (預期更動)

為了確保主線 (Main) 依然保有目前可運作的 Firestore 版本，我們已開立 `feature/verda-mongodb` 分支。所有的改動都會被隔離在此。

### 1. 雙軌資料庫工廠 (Repository Pattern)
將原先寫死的 Firestore 操作抽離出介面，根據環境變數決定使用誰，進行無痛遷移。
- `[NEW] backend/src/repositories/SessionRepository.ts` (定義介面與儲存邏輯)
- `[NEW] backend/src/repositories/UserRepository.ts`
- `[MODIFY] backend/src/index.ts` (Route 中改為呼叫 Repository 而非底層 SDK)
- `[MODIFY] backend/src/db.ts` (改造成 Factory，依據 `process.env.DB_PROVIDER` 輸出對應的 Database 連線個體)

### 2. 新增 MongoDB 核心依賴
- 於 `backend/package.json` 安裝 `mongodb` 原生驅動套件 (比起 Mongoose 更貼近原先 Firestore 的輕量 NoSQL 體驗)。
- 建立 MongoDB 的連線池管理機制。

### 3. Docker 容器化準備 (配合 Route B)
為了能推進 LINE Harbor 與 App Runner，我們將提供最佳實踐的 Dockerfile：
- `[NEW] backend/Dockerfile`: 將 Node.js + TS 編譯打包。
- `[NEW] frontend/Dockerfile`: 使用 Node.js build，並用 Nginx 託管靜態檔。
- `[NEW] .dockerignore`

## 🧪 測試與驗證策略 (Local Testing Plan)

**「Firebase 沒有提供 MongoDB 給我用，我該怎麼測試？」**
由於我們切換到了 MongoDB 體系，開發機 (macOS) 需要一個本地端的 MongoDB 來模擬 Verda MongoDB：

1. **Docker 方案 (強烈建議)**：
   只需在 Terminal 執行一行指令即可拔地而起一個本地端資料庫，完全不污染 Mac 系統：
   ```bash
   docker run -d -p 27017:27017 --name local-mongo mongo:6.0
   ```
2. **變數切換**：
   在 `backend/.env` 加上配置：
   ```env
   DB_PROVIDER=mongodb
   MONGODB_URI=mongodb://localhost:27017/personalrecord
   ```
3. **健康檢查 API (`/healthz/deps`)**：實作 `db: ok` 指標，確保 MongoDB 連線處於就緒狀態。

## ❓ Open Questions (User Review Required)

這是一次重大的底層替換，請確認以下三個問題：

> [!IMPORTANT]
> 1. **MongoDB 套件選擇**：我建議使用標準的 `mongodb` Native Driver，因為它的寫法跟目前的 Firestore `collection().doc()` 思維比較接近，對於程式碼轉換的陣痛期最小。請問你同意嗎，還是更傾向使用 Schema 較嚴格的 `mongoose`？
> 2. **本機 Docker**：你的 Mac 有安裝 `Docker Desktop` 或是 `OrbStack` 嗎？我們需要它來啟動本地測試用的 MongoDB。
> 3. **OpenAI 整合**：文件中有提到需整合公司 OpenAI API，你希望這是「這包 MongoDB 遷移」裡面的一環，還是我們這階段專門換 DB、下一階段再來串 OpenAI？

等待你的批准後，我就會在 `feature/verda-mongodb` 分支上開始執行「雙軌並行」的重構手術！
