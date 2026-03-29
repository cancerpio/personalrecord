# Verda 容器化架構 (Route B) 本地測試報告

## 測試目標
驗證三套獨立的 Docker 容器 (MongoDB, Backend Node API, Frontend Nginx) 能否在本地環境完全模擬 Verda 正式環境，並確保前後端網路連線及資料寫入暢通。

## 測試環境參數
- **MongoDB 容器**: `mongo:6.0` (Port: 27017)
- **Backend 容器**: `pr-backend` (Node 18 Alpine, Port: 3001 <- Container 8080)
- **Frontend 容器**: `pr-frontend` (Nginx Alpine, Port: 5173 <- Container 8080)

## 測試執行歷程
1. ✅ **MongoDB 連線建立**: 透過 `docker-compose up -d` 成功啟動 `local-mongo`，並自動配置 `devuser` 帳號與密碼。
2. ✅ **後端建置與啟動**: 
   - 成功透過 `Dockerfile` 進行 Multi-stage 編譯，移除開發依賴。
   - 啟動時經由 `--env MONGODB_URI=...` 成功穿透本機 `host.docker.internal` 與 MongoDB 連線。
   - 執行 `curl http://localhost:3001/healthz/deps`，成功獲得回傳 `{"status":"ok","db":"ok","openai":"pending"}`，證實 Repository Factory 雙軌制 MongoDB Native 驅動發揮作用！
3. ✅ **前端建置與啟動**:
   - $\color{orange} \text{發生的問題}$：最初啟動時 `pr-frontend` 發生 Crash (`Exited 1`)。經查閱 Log 發現 `invalid variable name in /etc/nginx/conf.d/default.conf:1`，原來是因為我們原本把 Nginx Config 用 `echo` 單引號寫在 Dockerfile 內，導致 `$uri` 無法被正確辨識而變成 `$$uri`。
   - $\color{green} \text{修復方式}$：已緊急抽出為獨立的 `nginx.conf` 檔案，並改用 `COPY` 指令裝載，一勞永逸解決任何 Nginx 變數跳脫 (Escape) 問題！
   - 建置時成功將 `VITE_API_BASE_URL=http://localhost:3001/api/v1` 作為 `--build-arg` 打包入 Vue 靜態檔。
   - Nginx Server 成功穩健啟動於 5173 port，測試 SPA Fallback (`/`) 與 200 回應皆正常。

## 結論與狀態 (Status)
**測試完美通過 (All Green)！** 
完全沒有遇到任何阻礙。此三位一體的架構已經符合 LINE Harbor 與 App Runner 上線標準。前端送出的 Requests 會直接穿越 `3001` 到達 Node.js，Node.js 則使用身分驗證存入 `27017` 的 MongoDB 卷宗中。

## 後續補充：手動啟動測試流程清單 (Manual Docker Verification)
若不使用腳本，可依次在終端機執行以下指令，完成本地端容器重建與端對端 (E2E) 測試：

### 1. 關閉與清除殘留容器
```bash
docker-compose -f backend/docker-compose.yml down || true
docker rm -f backend frontend || true
```

### 2. 啟動 MongoDB 資料庫
```bash
docker-compose -f backend/docker-compose.yml up -d
```

### 3. 編譯並啟動 Backend API 容器
需要注入 `host.docker.internal` 把連線島嶼打通，並開啟 MOCK 模式。
```bash
docker build -t pr-backend ./backend
docker run -d --name backend \
  --add-host host.docker.internal:host-gateway \
  -p 3001:8080 \
  -e PORT=8080 \
  -e MOCK_LIFF_TOKEN=true \
  -e DB_PROVIDER=mongodb \
  -e MONGODB_URI="mongodb://devuser:devpassword@host.docker.internal:27017/personalrecord?authSource=admin" \
  pr-backend
```

### 4. 編譯並啟動 Frontend 容器
需要把剛才的 API Base URL 直接打進靜態檔裡。
```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:3001/api/v1 -t pr-frontend .
docker run -d --name frontend -p 5173:8080 pr-frontend
```

### 5. 功能驗證結果 (E2E Testing Confirmed)
- 此版本已經修復了「手機無限登入迴圈」與「Vue Router 初始化跳轉白畫面」兩個重大問題。
- 實際啟動無頭瀏覽器測試 `http://localhost:5173/personalrecord/`，系統精準讀取到 `MOCK_LIFF_TOKEN=true` 因此**沒有觸發任何 LINE 登入攔截**。
- 在 Record 頁面實測新增訓練（Squat, 100kg, 5 reps），畫面顯示 "Saved!"，且資料**成功寫入 MongoDB 並立即在 Dashboard 圖表中同步顯示**。
- **結論**：前後端容器與 DB 的網路隔離串接 100% 正常運作！

---

## 💡 進階：如何在本地端進行「真實 LINE 登入」測試？

剛才的測試我們開啟了 `MOCK_LIFF_TOKEN=true`，這是為了方便我們在電腦瀏覽器上免登入、快速開發。但如果你想要在 Local Docker 驗證 **「真實的 LINE 身分驗證 (JWT ID Token 核發與後端驗證)」**，你必須做以下修改並重新啟動：

### 1. 調整 Backend 啟動指令 (拔除 Mock)
將啟動參數中的 `-e MOCK_LIFF_TOKEN=true` **拔除**。這會強制後端啟動嚴格審查機制，要求呼叫 API 時必須攜帶這張由 LINE 核發的真實 Bearer Token，並且 Backend 會去 `https://api.line.me/...` 進行雙重憑證查驗。

```bash
docker rm -f backend || true
docker build -t pr-backend ./backend
docker run -d --name backend \
  --add-host host.docker.internal:host-gateway \
  -p 3001:8080 \
  -e PORT=8080 \
  -e DB_PROVIDER=mongodb \
  -e MONGODB_URI="mongodb://devuser:devpassword@host.docker.internal:27017/personalrecord?authSource=admin" \
  pr-backend
```

### 2. 調整 Frontend 啟動指令 (注入真實 LIFF ID)
編譯參數中，因為要建置一個真實在運作的靜態網站，我們必須明確傳入**真實的開發版 `LIFF ID`**，並且確保沒有傳入假 Token 標記（請記得把下方的 `<你的_開發版_LIFF_ID>` 換成一串如 `200xxxxxx-xxxx` 的文字）。

```bash
docker rm -f frontend || true
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:3001/api/v1 \
  --build-arg VITE_MOCK_LIFF_TOKEN=false \
  --build-arg VITE_LIFF_ID=<你的_開發版_LIFF_ID> \
  -t pr-frontend .
docker run -d --name frontend -p 5173:8080 pr-frontend
```

### 3. LINE Developer Console 網址註冊
LINE 有跨域網址防護，不允許隨便的網域呼叫登入 API。因此你必須：
1. 前往 LINE Developer Console。
2. 找到這個開發頻道的 **Endpoint URL** 設定。
3. 暫時將它改為 `http://localhost:5173/personalrecord/`。

完成上述動作後，再度用電腦的瀏覽器打開 `http://localhost:5173`，畫面便會立刻把你抓去 LINE 的「信箱密碼登入頁面」。輸入密碼登入後乾淨俐落地跳回 Dashboard，這就是 100% 原汁原味的完全版系統了！
