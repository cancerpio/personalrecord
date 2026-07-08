## 1. 在部署 workflow 加入測試閘門

- [x] 1.1 於 [deploy.yml](../../../.github/workflows/deploy.yml) 的 `build` job，在 `Install`（`npm ci`）之後、`Build`（`npm run build`）之前，新增 `Test` 步驟執行 `npm test`
- [x] 1.2 測試失敗（非零 exit code）會使 `build` job 失敗、且 `deploy`（`needs: build`）不執行——未加 continue-on-error
- [x] 1.3 未引入「產生 report → 解析 → 刪除」邏輯，閘門純以 exit code 判定

## 2. 驗證

- [x] 2.1 本地 `npm test` 通過（8 passed）、`npm run build` 通過（正常路徑會綠燈放行）
- [x] 2.2 CI 端已驗證阻擋行為：測試失敗時 build job 失敗、deploy 未執行（部署方確認 OK）
- [x] 2.3 workflow 步驟順序正確：Checkout → Setup Node → Install → Test → Build → Upload → Deploy，縮排與既有步驟一致
