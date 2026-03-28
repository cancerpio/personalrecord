# Firebase 部署與資料庫轉換手冊 (firebase-deploy.md)

本文件記載了如何將我們以 Express.js 撰寫的 Node.js Backend API，正式部署到 **Firebase Cloud Functions**，並將現行的 `In-Memory Mock DB` 無縫切換為真正的 **Firestore 資料庫**的標準作業流程。

---

## 第一部分：準備你的 Firebase 專案與環境

1. **建立專案**：
   - 進入 [Firebase Console (https://console.firebase.google.com/)](https://console.firebase.google.com/)。
   - 點擊「新增專案」，為專案命名 (例如 `personalrecord-xxx`)，並依照精靈指示完成建立。

2. **啟用資料庫 (Firestore)**：
   - 在專案左側選單，點選 **Build > Firestore Database**。
   - 點擊「Create database」，選擇你的主要客群位置 (例如 `asia-east1` 台灣或東京)。
   - 安全性規則 (Security Rules) 先選擇「**Start in production mode**」，我們後端會由 Admin SDK 操作，不受此規則限制。

3. **升級付費方案 (Blaze Plan) - 必做！**：
   - 由於 Google 規定部署 Node.js 10 以上的 Cloud Functions 必須啟用 Blaze (隨收隨付) 方案。
   - 點擊左下角的「Upgrade」並綁定信用卡。請放心，Firebase 每月提供高達 200 萬次函式呼叫的**免費額度**，對個人專案而言完全不會產生費用。

4. **安裝 Firebase CLI**：
   - 打開你的 Terminal (終端機)，安裝全域指令：
     ```bash
     npm install -g firebase-tools
     ```
   - 輸入 `firebase login`，這會彈出瀏覽器讓你登入 Google 帳號授權。

---

## 第二部分：將 Backend 初始化為 Firebase 結構

在我們目前專案根目錄的 `backend/` 下方：

1. **初始化 Firebase Functions**：
   ```bash
   cd backend
   firebase init functions
   ```
   - **選項 1**: 選擇 `Use an existing project`，並選取你剛剛在 Console 建立的專案。
   - **選項 2**: 它會問你要用哪種語言 (JavaScript / TypeScript)，請選擇 **TypeScript**。
   - **選項 3**: 它會問是否要用 ESLint，你可以選 `No` 保持單純。
   - **選項 4**: 它會問是否要覆寫 `package.json` 等檔案，請**小心選擇 No (不要覆寫)**，因為我們已經有了自己的設定！但如果有缺少的檔案，讓它補上即可。
   
   > 💡 這步驟做完後，你的 `backend` 裡面會多出 `firebase.json` 與 `.firebaserc`。

2. **刪除冗餘資料夾與修改設定檔 (已由 AI 完成此步驟)**：
   - Firebase 預設會在 `backend/` 下方再建立一個 `functions/` 結構，這會導致雙層 `package.json` 難以管理。
   - 我們選擇刪除該空的 `functions/` 資料夾，並開啟根目錄的 `firebase.json`，將 `source: "functions"` 改為 `source: "."`。
   - 同時在 `package.json` 加入 `"build": "tsc"` 和 `"main": "dist/index.js"`，讓 Firebase 能在部署前自動編譯 TypeScript 程式碼。

3. **匯出 Express 供雲端呼叫 (已由 AI 完成此步驟)**：
   打開 `backend/src/index.ts`，滑到**最下面**。把原本的 `app.listen(PORT, ...)` 取代成 Firebase 的匯出格式：

   ```typescript
   // 供本地開發使用的傾聽者
   if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTIONS_EMULATOR) {
       app.listen(PORT, () => { console.log(...) });
   }

   // 供 Firebase Cloud Functions 呼叫的匯出端點
   import * as functions from "firebase-functions/v1";
   export const api = functions.region('asia-east1').https.onRequest(app);
   ```

4. **解決 Firebase 強制拔除網址前綴的 404 陷阱 (雙掛載 Router)**：
   - **痛點原因**：當雲端函式名稱被定義為 `api` (`exports.api = ...`) 時，其實際網址會是 `https://.../api/v1/sessions`。
   - **雙重宇宙的底層架構差異 (API Gateway / Reverse Proxy)**：
     - **情境 A (本機直連)**：本機開發時 `http://localhost:3001` 是直接對著 Express 的大門開火。因為沒有總機擋在前面，Express 收到的第一手原始路徑就是一字不漏的 `/api/v1/sessions`。
     - **情境 B (雲端總機)**：部署上雲端後，最外層有一道防護網叫 **Google Cloud API Gateway (總機)**。總機收到 `https://.../api/v1/sessions` 後，它說：「喔，這要交給叫作 `api` 的雲端函式」。因此，總機會**強制把門牌 `/api` 扒下來**，只把剩下的文件 `/v1/sessions` 塞進房門給 Express。
   - **錯誤情形**：這導致同樣一套程式碼，若你在本機寫死 `app.get('/api/v1/sessions')`，上雲端後 Express 只收到 `/v1/sessions`，以為路由對不上，直接吐回無情的 **404 Not Found**。
   - **解法實作 (已由 AI 完成)**：我們將所有 `/v1/` 底下的 API 改為註冊給一個獨立的 `v1Router`。最後在核心 App 上同時註冊「被閹割版」與「完整版」的路由：
     ```typescript
     const v1Router = express.Router();
     v1Router.get('/sessions', ...);

     // 給本地端 localhost 開發測試配對用，匹配: /api/v1/sessions
     app.use('/api/v1', v1Router); 
     
     // 給真正上雲端 Firebase 後配對用，匹配: /v1/sessions
     app.use('/v1', v1Router);
     ```
     這保證了不管在雲端或是本機，我們的資料都能精準無誤地導向前方的 Router 處理器。

---

## 第三部分：本機開發與真實資料庫串接測試 (Local Development)

如果每次寫扣都要 `firebase deploy` 等一分鐘才能測，效率會太低。因此我們提供了在本機 `localhost:3001` 就能直接對雲端 Firestore 讀寫的作法。

1. **取得服務帳戶金鑰 (Service Account Key)**：
   - 到 Firebase Console > 專案設定 (齒輪圖示) > 服務帳戶 (Service Accounts)。
   - 點擊「**產生新的私密金鑰 (Generate new private key)**」。
   - 它會下載一個包含超高權限的 JSON 檔案。

2. **放置金鑰與設定環境變數**：
   - 把這個 JSON 檔案拉進 `backend/` 資料夾，並更名為 `serviceAccountKey.json`。
   - **(安全警告)**：請確保 `.gitignore` 裡面有寫入 `serviceAccountKey.json`，**絕對不可以推上 GitHub**。
   - 在 Terminal 中 (需於 `backend/` 下)，透過匯出環境變數讓 Node.js 吃這個金鑰：
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
     npm run dev
     ```

3. **前端呼叫測試**：
   - 到專案根目錄的前端 `.env` 中，確認 `VITE_STORAGE_MODE=liff`，以及 `VITE_API_BASE_URL=http://localhost:3001/api/v1`。
   - 此時你在前端操作網頁存一筆新的「深蹲重量」，資料就會透過本機伺服器直達遠端資料庫。
   - (註：這部分已由 AI 全面實作為 TypeScript 的 Async/Await 搭配 `firebase-admin` 模組)。

---

## 第四部分：部署上線 (Deploy to Cloud Functions)

當你把程式碼都改好，且在 Terminal 用 `npm run build` (tsc 編譯 TypeScript) 沒有報錯後，就可以發射上雲端了：

```bash
firebase deploy --only functions
```

部署成功後，Terminal 上會吐出一串 URL（類似 `https://asia-east1-personalrecord-xxx.cloudfunctions.net/api`）。

最後一步，打開你前端專案的 `.env`：
```env
VITE_STORAGE_MODE=liff
VITE_API_BASE_URL=https://asia-east1-personalrecord-xxx.cloudfunctions.net/api/v1
```

**恭喜！你的 Personal Record 正式成為一款具備 Serverless 後端、無上限資料庫擴充性，而且永不消失的雲端全端 App 了！**

---

## 第五部分：全端環境變數 (Environment Variables) 設定

專案正式上線時，我們的架構將敏感的環境變數交由 `.env` 檔案管理，且設定為 `.gitignore` 不上傳至版控。為了讓部署上去的前端與雲端後端都能吃到對的參數，請依據以下步驟設定：

### 🎯 全端環境變數速查表 (Cheat Sheet)

為方便後續維護，以下統整本專案從前端到後端**所有支援的環境變數**及其用途：

#### 📍 前端 (設定於 `/.env` 或 GitHub Variables)
| 變數名稱 | 允許值 / 範例 | 功能說明 | 必填 |
| :--- | :--- | :--- | :--- |
| **`VITE_STORAGE_MODE`** | `local` 或 `liff` | 將前端模式切換為「純離線 UI 版(`local`)」或「連線打 API 版(`liff`)」。 | ✅ |
| **`VITE_API_BASE_URL`** | `http://localhost:3001/api/v1` | 後端 API 的根網址。如果模式為 `liff`，此為前端發送請求的網域。 | *(liff 模式必填)* |
| **`VITE_MOCK_LIFF_TOKEN`** | `true` 或不設定 | 本機端開發專用：測試 `liff` 連線到後端時，是否要**跳過真實的 LINE 身分驗證**，直接塞一顆假 Token 給後端（用以獲得完美的除錯體驗）。 | ❌ |

#### 📍 後端 (設定於 `/backend/.env` 或 Firebase Secrets)
| 變數名稱 | 允許值 / 範例 | 功能說明 | 必填 |
| :--- | :--- | :--- | :--- |
| **`PORT`** | `3001` (預設) | 本機開發專用：Node.js Express 伺服器的啟動對接埠口 (部署雲端時 Firebase 會接管此變數)。 | ❌ |
| **`GOOGLE_APPLICATION_CREDENTIALS`**| `./serviceAccountKey.json` | 本機開發專用：讓本機的 Node.js 能取得最高層級金鑰來存取真正的雲端 Firestore。(嚴禁推上 Git 版控) | *(本機連線版必填)* |
| **`MOCK_LIFF_TOKEN`** | `true` 或 `false` | 控制後端 `mockLiffAuth` Middleware 是否要放行假字串。**正式上線環境務必設為 `false` 或不寫 (預設為 false)**，以防止前端偽造身分攻擊。 | ❌ |

---

### 5.1 前端 (Frontend - 部署至 GitHub Pages)

因為 GitHub Actions 電腦在執行打包 (`npm run build`) 時抓不到你電腦裡的 `.env`，必須進行以下兩步操作：

**步驟 A：修改 GitHub Actions Workflow 腳本**
於專案 `.github/workflows/deploy.yml` 的 `Build` 步驟中，手動注入由 GitHub 後台讀取的變數：
```yaml
      - name: Build
        env:
          VITE_STORAGE_MODE: ${{ vars.VITE_STORAGE_MODE }}
          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
        run: npm run build
```

**步驟 B：於 GitHub 後台新增 Variables**
請進入 GitHub 專案 ➡️ **Settings** ➡️ 左側 **Secrets and variables** ➡️ **Actions** ➡️ 點擊上方 **Variables** 分頁標籤 ➡️ 點擊綠色按鈕 `New repository variable` 建立以下兩把鑰匙：
*   **Name**: `VITE_STORAGE_MODE`, **Value**: `liff`
*   **Name**: `VITE_API_BASE_URL`, **Value**: `https://asia-east1-personalrecord-xxx.cloudfunctions.net/api/v1` (替換為你的 Firebase 網址)

最後只要執行 `git push`，打包精靈就會自動燒錄這些變數並發佈網頁。

---

### 5.2 後端 (Backend - 部署至 Firebase Cloud Functions)

後端的環境變數控制著安全邏輯（例如 `Task 10.7` 提到的 `MOCK_LIFF_TOKEN`）。
Firebase CLI (版本 > 10.0) 已經原生支援讀取 `.env`。所以設定方式非常直覺：

**步驟 A：在 `backend/` 建立 `.env` 檔案**
在你的 `/backend` 資料夾下，新增一個名為 `.env` 的純文字檔，寫入你想要的正式環境設定：
```env
# 控制是否要在雲端打假 Token 通關，正式上線應設定為 false 或乾脆不要寫這行
MOCK_LIFF_TOKEN=false
```

**步驟 B：直接 Deploy**
當你執行 `firebase deploy --only functions` 的時候，Firebase CLI 會自動抓取 `backend/.env` 裡面的參數，將它們挾帶上雲端，直接變成該 Cloud Function 專屬的環境變數。完全不需要去 Google Cloud 後台手動點擊介面！

---

### 5.3 企業級高機密變數設定 (Google Cloud Secret Manager)

對於普通變數如 `MOCK_LIFF_TOKEN=false`，寫入 `.env` 並上傳是絕對安全的（因為外部使用者無法讀取後端程式碼）。
**但若你的變數是極度機密的金鑰（例如：OpenAI API Key, Stripe 私鑰、資料庫 Root 密碼），為防止團隊成員設定 `.gitignore` 失誤而不小心將 `.env` 原始檔推上 GitHub 造成外洩，強烈建議使用原生支援的 Secret Manager：**

**步驟 A：在終端機加密上傳**
不要寫在文字檔裡，打開終端機 (進入 `backend/` 目錄) 直接輸入指令：
```bash
firebase functions:secrets:set OPENAI_API_KEY
```
此時系統會請你輸入密碼（輸入時螢幕不顯示）。輸入完成後，這把金鑰會直接被鎖進 Google 的金庫中，你的電腦硬碟不會留下任何痕跡。

**步驟 B：於程式碼中安全讀取**
在雲端環境啟動時，再透過 `firebase-functions/params` 模組將金鑰提取出來用：
```typescript
import { defineSecret } from "firebase-functions/params";
const openaiKey = defineSecret("OPENAI_API_KEY");

// 在 API 被呼叫的當下才提取：
const key = openaiKey.value(); 
```

---

## 附錄：給 MongoDB 開發者的 Firestore 避坑指南

如果團隊成員曾熟悉 MongoDB 等傳統 Document DB，剛接觸 Firestore 時可能會遭遇思維落差。請務必閱讀以下三大轉彎：

### 1. 查詢語法的差異 (連綴 V.S. 巢狀 JSON)
*   **MongoDB** 習慣在一個 JSON 物件網內寫完條件：`db.users.find({ age: { $gt: 20 }, status: "A" })`。
*   **Firestore** 則採用 SQL 風格的連綴 (Chaining) 語句，查詢上更為直覺，但缺乏正規表達式 (Regex) 等超複雜條件支援：
    `db.collection('users').where('age', '>', 20).where('status', '==', 'A').get()`

### 2. 「交錯樹狀層級」與「淺層讀取 (Shallow Query)」
*   **MongoDB** 中的 Subdocument 往往就是一個巨大的巢狀 Array，抓取時會把幾萬筆歷史紀錄「一次整包拖出來」，極耗效能。
*   **Firestore** 規定資料必須是精準的 `Collection -> Document -> Collection -> Document...` 的交錯樹狀結構。
    最重要的是，Firestore 的讀取是**極度的淺層查詢**。抓出某個 User Document，它底下的 `training_sessions` (次級 Collection) 資料**完全不會被抓出來**。不管資料庫有十筆還是一億筆，淺層撈取的時間永遠恆常極速。

### 3. 禁止 Server-Side Join，用「降正規化 (Denormalization)」換取速度
*   **MongoDB** 有非常暴力的 `Aggregate Pipeline` 可以在伺服器端算清各種 JOIN (`$lookup`) 和大數據加總。
*   **Firestore** 刻意**拔掉了幾乎所有動態運算能力** (沒有 $lookup、無法多表聯集)。
    *   **核心思維**：不要因為「偷懶不重複寫入資料」，而指望在讀取時用 SQL 把它們 Join 在一起算半天。
    *   **Firestore 思維 (空間換時間)**：如果是前端「深蹲總次數」這種需要加總的畫面，我們不該寫一個查詢把 100 筆深蹲拉出來加總；而是要在每次使用者發出深蹲「寫入」請求時，**直接去更新一個叫做 `total_reps` 的寫死計數數字**。
    *   **結果**：每次讀取畫面只需「O(1) 的極速代價」，因為那只是去讀一個已經算好且寫死的數字欄位。這讓 Firestore 具備了世界級的無限並發與橫向擴充極限。

### 4. 真正「零設定 (Schema-less)」，把關責任交還給應用層 (TypeScript)
*   **傳統關聯表 / ORM**：開發前必須先在資料庫端下 `CREATE TABLE`，或透過腳本跑 DB Migration 把欄位定死。
*   **Firestore**：你在雲端 Console 大廳**完全不需要手動建立任何檔案櫃**！當後端的程式碼第一手塞入 JSON 的瞬間 (`db.collection('sessions').set(..)`），只要有寫入動作，Firestore 就敢直接無中生有幫你把資料夾跟層級全建好。
    *   **設計哲學（重要！）**：沒有 Schema 束縛不代表可以亂塞垃圾。我們將防呆的保護網從「資料庫層」全數上移到了「**應用層 (Node.js)**」。請務必透過 `backend/src/db.ts` 中的 **TypeScript 介面 (Interface)** 來強制定義所有型別；只要 TypeScript 編譯能過，資料庫就不會弄髒。
