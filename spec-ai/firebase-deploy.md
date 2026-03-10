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

2. **安裝 Firebase Admin SDK**：
   這是讓我們的 Node.js 有權限以最高權限 (Admin) 寫入 Firestore 的套件。
   ```bash
   npm install firebase-admin firebase-functions
   ```

3. **修改 `src/index.ts` 進行匯出**：
   打開 `backend/src/index.ts`，滑到**最下面**。把原本的 `app.listen(PORT, ...)` 取代成 Firebase 的匯出格式：

   ```typescript
   // 原本的程式碼：
   // const PORT = process.env.PORT || 3001;
   // app.listen(PORT, () => { console.log(...) });

   // 修改為 Firebase Functions 的匯出格式：
   import * as functions from "firebase-functions";
   
   // 告訴 Firebase，所有發送到 api 這個 function 的請求，都交由 Express (app) 處理
   export const api = functions.region('asia-east1').https.onRequest(app);
   ```

---

## 第三部分：抽換 In-Memory DB 改為真實的 Firestore

你問到：「*現在的 In-Memory DB 是怎麼做的？重新 deploy 就會消失嗎？*」
**沒錯，完全正確！**
目前的 `mockDb.ts` 裡面只是宣告了 `const users = new Map();`。這意味著資料是存在 Node.js 這個行程（Process）的記憶體裡。一旦伺服器關閉 (Ctrl+C) 或重新啟動，記憶體被釋放，資料就全部歸零了。

### 🚨 轉換步驟 (手動作業)：
為了持久化，我們需要把 `mockDb.ts` 的內容徹底換成調用 Firestore SDK。

1. **初始化 Admin SDK**
   在 `backend/src/mockDb.ts` (你可以改名為 `db.ts`) 的最上方加入：
   ```typescript
   import * as admin from 'firebase-admin';

   // 初始化 Admin SDK (部署到 Cloud Functions 時不需要金鑰，它會自動抓環境的最高權限)
   admin.initializeApp();
   const db = admin.firestore();
   ```

2. **改寫 CRUD 函數 (範例：AddSession)**
   原本的陣列推入 (`this.sessions.set()`) 會變成非同步的資料庫存取：
   ```typescript
   async addSession(userId: string, data: any) {
     const now = admin.firestore.FieldValue.serverTimestamp();
     const sessionRef = db.collection('training_sessions').doc(); // 自動產生 ID
     
     const newRecord = {
       ...data,
       userId,
       createdAt: now,
       updatedAt: now
     };
     
     await sessionRef.set(newRecord);
     return { docId: sessionRef.id, ...newRecord };
   }
   ```
   > 備註：這個過程需要將所有方法 (getSessions, addSession, 等等) 改寫成 `async/await`，且前端接收到資料的時間格式可能會變成 Firestore 的 Timestamp 物件，需做格式化對齊。

---

## 第四部分：部署上線 (Deploy to Cloud)

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
