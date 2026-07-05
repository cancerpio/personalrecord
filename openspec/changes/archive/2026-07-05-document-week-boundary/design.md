## Context

週分組行為已由 [src/stores/sessionStore.js](../../../src/stores/sessionStore.js) 的 `getMondayOfDate` 實作：以 `getUTCDay()` 取星期幾，週日（0）回推 6 天、其餘回推至當週週一。此行為正確且已上線，但主規格僅記載 "Monday to Sunday"，未描述 UTC 判定與週日歸屬。本變更僅補文件，不動實作。

## Goals / Non-Goals

**Goals:**
- 將既有的週分組邊界（週一~週日、UTC 判定）明確寫入規格。
- 保留追溯：透過 change 流程而非直接手改主 spec。

**Non-Goals:**
- 不修改 `getMondayOfDate` 或任何計算邏輯。
- 不修正 UTC+8 交界的時區邊界行為（僅記錄為已知行為，另議）。

## Decisions

- **使用 ADDED 而非 MODIFIED**：依 OpenSpec specs instruction，「新增概念且不改變既有行為」應使用 ADDED。既有的「Calculate Weekly Training Volume」需求行為不變，故新增一條獨立的「Weekly Grouping Boundary」需求，而非改寫舊需求。
- **UTC 邊界以備註記錄**：時區交界屬已知行為，以規格備註陳述，不寫成 SHALL，避免把「待改善項」誤列為正規需求。

## Risks / Trade-offs

- [規格與實作漂移] 若日後真的修正時區問題，這條規格需同步更新 → 屆時另開 change 處理，並更新此需求。
