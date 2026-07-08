## Why

目前部署 workflow 只做 build → deploy，**未跑任何測試**，有問題的程式可能直接上線到 GitHub Pages。專案已引入 vitest（`npm test`），應把它接進部署流程當作品質閘門：測試沒過就不允許部署。

## What Changes

- 在部署 workflow（[deploy.yml](../../../.github/workflows/deploy.yml)）於 build **之前**加入測試步驟（`npm test`，即 `vitest run`）。
- 以 **exit code** 作為閘門：測試失敗 → job 失敗 → `deploy`（`needs: build`）自動不執行。**不採「產生 report → 解析內容 → 刪除 report」的做法**（脆弱且非必要；report 應用於失敗時的可視化，而非閘門，且不該刪除）。
- 閘門對所有會觸發部署的分支生效（`main` / `master` / `mini-app` / `feat/**`）。

## Capabilities

### New Capabilities
- `deploy-quality-gate`: 部署前必須通過自動測試的品質閘門行為（測試失敗即阻擋部署）。

### Modified Capabilities
<!-- 無既有能力的需求變更 -->

## Impact

- [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml)：`build` job 於 `npm ci` 之後、`npm run build` 之前新增 `npm test` 步驟。
- 依賴：沿用既有 `vitest` 與 `test` script，無新增套件。
- 行為影響：任一測試失敗時，該分支的部署會被阻擋（deploy job 不執行），屬預期的閘門行為。
- 無應用程式行為變更、無資料模型變更。
