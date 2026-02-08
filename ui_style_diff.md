# UI Style & Navigation Pattern Comparison: ly vs. personalrecord

## 概覽

這兩個專案皆為 LINE Mini App，但採取了不同的 UI/UX 設計策略。這並非因為 LINE 官方強制規範的差異，而是基於**專案性質**與**使用者需求**的不同所做的設計決策。

本文件旨在比較兩者的設計模式，並為 `personalrecord` (目前的重訓紀錄專案) 提供設計建議。

---

## 比較分析

| 特徵 | `ly` (音樂/歌詞專案) | `personalrecord` (重訓紀錄專案) |
| :--- | :--- | :--- |
| **導航模式 (Navigation Pattern)** | **Bottom Tab Bar (底部導航列)** | **Single Page Dashboard (單頁儀表板)** |
| **頁面結構** | **多頁面結構 (Multi-page)**：<br>- 首頁 (Home)<br>- 播放列表 (Lists)<br>- 設定 (Settings)<br>使用者需頻繁切換不同功能區塊。 | **單一長頁面 (Vertical Scroll)**：<br>- 狀態概覽 (Cycle Status)<br>- 效能圖表 (Performance)<br>- 篩選控制 (Filters)<br>所有核心資訊集中，上下滑動即可瀏覽。 |
| **視覺風格 (Visual Style)** | **LINE Native-like**：<br>- 簡潔、輕量<br>- 綠色主色調<br>- 標準毛玻璃效果 | **iOS 16 Liquid Glass**：<br>- 華麗、高質感<br>- 高飽和度模糊 (Vibrancy)<br>- 豐富漸層背景<br>- 仿 iOS 原生組件質感 |
| **適用場景** | 資訊架構複雜、功能模組獨立的應用。 | 資訊高度相關、需快速查看與操作的工具類應用。 |

---

## 設計建議 (針對 `personalrecord`)

基於目前的專案需求 (查看 PR 紀錄、確認週期狀態、快速篩選)，我們建議：

### 1. 維持 Single Page Dashboard 模式 (短期/中期)

**理由**：
-   **操作效率**：使用者只需「滑動」就能查看所有數據，無需點擊切換頁面，符合訓練時分秒必爭的情境。
-   **空間利用**：省去 Bottom Tab Bar (約 80px 高度)，能最大化圖表顯示區域，避免重要的 Performance Chart 被遮擋。
-   **聚焦核心**：目前的 App 只有「紀錄檢視」這一核心功能，硬加導航列會顯得空洞且多餘。

### 2. 未來擴充策略 (長期)

若未來專案擴充以下功能，則應考慮導入 **Bottom Tab Bar**：
-   **Log Entry (紀錄輸入)**：獨立且複雜的輸入介面。
-   **History List (詳細列表)**：非圖表形式的逐日訓練日誌。
-   **Analysis (進階分析)**：體重、身體圍度、RM 預估等獨立報表。
-   **Settings (個人設定)**：動作管理、目標設定等。

### 3. 風格延續

-   **iOS Liquid Glass**：繼續保持此風格，它為單頁應用帶來了良好的層次感與視覺愉悅感。
-   **Consistent Feedback**：如我們在 [Feature: Fix UI Flicker] 中實作的，保持流暢的轉場與回應 (Fluid UI)，這對單頁應用尤為重要。

---

## LINE Mini App 規範備註

-   **Header**：LINE Mini App 強制顯示原生 Header (含 Service Name & Close Button)。我們的設計已透過 `env(safe-area-inset-top)` 預留空間，並避免在此區域放置互動元件。
-   **Tabs vs. Dashboards**：LINE 官方文件並未強制規定必須使用哪種模式，開發者可根據 App 的複雜度自由選擇最適合的 UX Pattern。
