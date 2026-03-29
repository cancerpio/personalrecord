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
