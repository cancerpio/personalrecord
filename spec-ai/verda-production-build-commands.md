# Verda 正式環境 (Production) Docker 建置指令指南

當準備將專案推上 Verda (App Runner、VM、VKS 等) 或任何正式環境時，請使用以下**無 Mock、純真實連線**的建置與部署參數。

---

## 🏗️ 1. 前端 (Frontend) 生產環境建置指令

前端因為是編譯成靜態檔案 (Vue SPA)，所以必須在 `docker build` 時透過 `--build-arg` 將**遠端實際的網址與安全開關**直接注入 Image 中。

### 建置指令 (Execute in CI/CD or Local Terminal)
```bash
# 請在專案根目錄執行 (包含 Dockerfile 的地方)
docker build \
  --build-arg VITE_API_BASE_URL=https://api.your-verda-domain.com/api/v1 \
  --build-arg VITE_MOCK_LIFF_TOKEN=false \
  --build-arg VITE_LIFF_ID=你的真實_LIFF_ID \
  -t your-harbor-registry.com/project/pr-frontend:latest .
```

> [!WARNING] 注意事項
> 1. `VITE_API_BASE_URL`：**絕不能**再使用 `localhost`，請替換為你後端實際上線後的 Verda HTTPS 網域。
> 2. `VITE_MOCK_LIFF_TOKEN=false`：非常關鍵，這會關閉我們在本地開發用的通關後門，強制前端呼叫 `liff.init()` 進行真實的 LINE 登入。
> 3. `VITE_LIFF_ID`：請填寫 LINE Developer Console 核發的真實 LIFF ID。

---

## 🏗️ 2. 後端 (Backend) 生產環境建置指令

後端的建置非常單純，**請不要把任何密碼或變數寫進 docker build 中**，後端的秘密必須在容器啟動時 (Run-time) 才由 Verda 平台注入。

### 建置指令 (Execute in CI/CD or Local Terminal)
```bash
# 請在 backend 目錄下執行
cd backend
docker build -t your-harbor-registry.com/project/pr-backend:latest .
```

### 啟動參數設定 (Verda Console Configuration)
當你在 Verda Console 上把上面這包 Image 跑起來時，請於環境變數 (Environment Variables) 面板設定以下參數：

*   `NODE_ENV=production`
*   `PORT=8080` (依據你的 Verda 網路轉發設定)
*   `DB_PROVIDER=mongodb`
*   `MONGODB_URI=mongodb://[真實帳號]:[真實密碼]@[Verda_MongoDB_Host]:[Port]/personalrecord?authSource=admin`

> [!CAUTION] 資安與驗證鐵則
> 在 Verda 正式機上，**絕對不要設定** `-e MOCK_LIFF_TOKEN=true`。
> 只要這個變數不存在（或設為 false），後端的 `liffAuthMiddleware` 就會啟動嚴格模式，無情拒絕任何使用 `fake-liff-token` 的流量，並向 LINE 伺服器二次驗證你的 JWT！
