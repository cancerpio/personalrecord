## Context

部署 workflow [deploy.yml](../../../.github/workflows/deploy.yml) 目前為兩個 job：`build`（checkout → setup-node → `npm ci` → `npm run build` → upload artifact）與 `deploy`（`needs: build` → deploy-pages）。專案已引入 vitest，`package.json` 有 `test`（`vitest run`）。目前部署前完全不跑測試。

## Goals / Non-Goals

**Goals:**
- 部署前自動跑測試，測試未過就不部署。
- 以最簡單、可靠的方式做閘門（exit code），避免脆弱的自訂邏輯。

**Non-Goals:**
- 不改動應用程式行為、不改動 build/deploy 既有步驟本身。
- 不導入覆蓋率門檻或測試報告上傳（列為未來可選，非本次範圍）。
- 不改動觸發分支設定（沿用現有 `main`/`master`/`mini-app`/`feat/**`）。

## Decisions

- **以 exit code 作為閘門（核心決策）**：`vitest run` 測試失敗會回傳非零 exit code；GitHub Actions 中某步驟非零即該 job 失敗，`deploy`（`needs: build`）便不會執行。閘門天生成立，無需任何額外判斷邏輯。
- **明確不採「產生 report → 檢查 → 刪除」**：該做法脆弱且非必要——閘門由 exit code 決定即可；測試報告的價值在於「失敗時的可視化」，應於失敗時保留/上傳而非刪除。若刪除等於丟掉唯一能解釋失敗原因的產物。
- **放置位置：在 `build` job 內、`npm ci` 之後、`npm run build` 之前，新增 `Test` 步驟執行 `npm test`**。理由：重用同一 job 已完成的 checkout 與 `npm ci`，避免另開 job 重複安裝相依套件；測試失敗即讓 build job 失敗，deploy 自然被擋。
  - 替代方案（未採用）：獨立 `test` job 讓 `build` 加上 `needs: test`。閘門語意更分明、可平行化，但要多一次 checkout + `npm ci`，對此小專案效益不大。日後測試變重再考慮切分。
- **未來可選（不在本次）**：需要門檻時以工具原生設定讓其自行 fail（例如 vitest `coverage.thresholds`，仍是 exit-code 閘門）；需要可視化時以 JUnit reporter 產出並「於失敗時上傳為 artifact」，而非刪除。

## Risks / Trade-offs

- **[部署變慢一點]** 每次部署多跑一次測試 → 目前測試量小、影響可忽略。
- **[測試不穩定會擋部署]** flaky test 可能誤擋 → 緩解：保持測試決定性（現有測試以固定系統時間、mock api，屬決定性）。
- **[閘門僅在 CI]** 本地仍可自行 build；閘門作用於部署 workflow，符合「不部署未通過測試的版本」目標。
