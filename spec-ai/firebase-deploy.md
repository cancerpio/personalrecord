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
