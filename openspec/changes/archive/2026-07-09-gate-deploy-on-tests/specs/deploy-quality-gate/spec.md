## ADDED Requirements

### Requirement: Tests Gate Deployment
部署流程 SHALL 在建置與部署之前執行自動測試套件（`npm test`）。當測試套件回傳非零 exit code（任一測試失敗）時，系統 SHALL 阻擋該次部署，使部署步驟不被執行。僅當測試全數通過（exit code 0）時，SHALL 繼續進行建置與部署。

閘門 SHALL 以測試指令的 exit code 判定，SHALL NOT 依賴「產生報告檔、解析其內容、再刪除」的方式。

#### Scenario: 測試通過則繼續部署
- **WHEN** 觸發部署的 workflow 執行，且 `npm test` 全數通過（exit code 0）
- **THEN** 系統 SHALL 繼續執行建置與部署

#### Scenario: 測試失敗則阻擋部署
- **WHEN** 觸發部署的 workflow 執行，且 `npm test` 有任一測試失敗（非零 exit code）
- **THEN** 系統 SHALL 阻擋部署（deploy 步驟不執行），並使該 workflow 判定為失敗

#### Scenario: 閘門對所有觸發部署的分支生效
- **WHEN** 由任一會觸發部署的分支（`main` / `master` / `mini-app` / `feat/**`）啟動部署
- **THEN** 測試閘門 SHALL 同樣套用，測試未過即不部署
