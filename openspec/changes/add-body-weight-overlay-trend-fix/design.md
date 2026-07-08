## Context

首頁容積卡片（[DashboardView.vue](../../../src/views/DashboardView.vue)）目前：標頭僅顯示「當週訓練總容積」單一大數字與趨勢徽章；下方以純 CSS/div 長條圖呈現 16 週容積（前一個變更 `weekly-volume-16week-chart` 刻意以 CSS 實作，並以外觀為驗收基準）。資料層（[sessionStore.js](../../../src/stores/sessionStore.js)）的 `weeklyTrainingVolumeInfo` 以「當週部分加總 vs 過去完整週平均」計算趨勢；`trailing16WeekVolumeInfo` 提供固定 16 筆、補 0 的容積序列。體重資料存於 `state.bodyMetrics`（`{ date, bodyWeight, fatPercentage }`），目前僅以逐筆時間序列供 Performance 圖使用。

視覺基準（實作以此為準）：
- 歸檔於本 change 的靜態預覽（隨 diff 一起版本控管）：[design-preview.html](design-preview.html)
- 可互動線上版（分享用，外部託管、非歸檔）：https://claude.ai/code/artifact/4448a6de-4384-4abd-8523-0d777f47697a

註：此預覽為手繪 SVG 視覺參考（示範資料），非 Vue/Highcharts 實作；驗收看外觀，實作以 Highcharts 為準。

## Goals / Non-Goals

**Goals:**
- 在 16 週容積圖上疊加「每週平均體重」折線，讓使用者對照訓練量與體重關係。
- 修正趨勢比較的不對稱：改為「完整週對完整週」（2A）。
- 標頭以左右兩欄同時呈現當週容積與當週平均體重，各附趨勢指示。

**Non-Goals:**
- 不改動容積公式 `reps × weight`、週邊界（週一~週日、UTC）、趨勢門檻（±5%）。
- 不改動 `bodyMetrics` 資料模型、後端、無資料遷移。
- 不改動 Performance 圖（HistoryChart）、SparklineRow、FilterControls。
- 不做週數切換（維持固定 16 週）。

## Decisions

- **趨勢改採 2A（完整週對完整週）**：在 `weeklyTrainingVolumeInfo` 內，取「有紀錄且非當週」的各週集合；其中最新一週為「上一完整週」，其餘為「前期各週」。趨勢＝上一完整週容積 vs 前期各週平均（±5%）。當週即時容積（partial）維持作為標頭大數字，不參與趨勢計算。**只有一個完整週時直接回傳持平（STABLE）**；完全沒有完整週時維持既有無資料處理。
- **趨勢基準需標示**：因徽章描述的是「上一完整週」而非畫面上的當週即時數字，標頭加一行共用小字（「趨勢基準：上一完整週 vs 前期各週平均」），兩欄共用一份，避免重複佔版面。
- **每週平均體重放進既有 16 週結構**：擴充 `trailing16WeekVolumeInfo`，每一週新增 `avgBodyWeight`（該週 `bodyWeight` 平均，無紀錄為 `null`）。重用既有週分組與 `getMondayOfDate`，避免另建平行 getter 重算週桶。additive 欄位、向後相容。
- **16 週圖改用 Highcharts combo**：以 `highcharts-vue`（與 HistoryChart 一致）重建為 column（容積，`yAxis 0`，0 起算）＋ line（體重，`yAxis 1`，右側，`softMin/softMax` 依資料自動範圍、不從 0 起算）。體重折線以 `null` + `connectNulls: false` 在缺值週斷開。需一併以 Highcharts 重建現以 CSS 呈現者：當週柱強調（point color / zone）、16 週平均虛線（`plotLine`）、稀疏月份 x 軸標籤、hover tooltip（週區間 + 容積 + 體重）。
- **標頭雙欄配置**：左欄容積釘左上、右欄體重釘右上（靠右對齊），兩角對稱、無中間分隔線，以色塊（藍/橘）＋留白區分。每欄結構為「色塊+標題 → 大數字 → 趨勢 chip」。
- **配色**（已通過 dataviz CVD/對比驗證）：容積柱 iOS 藍（淺 `#007AFF` / 深 `#0A84FF`）、體重線橘（淺 `#D97706` / 深 `#FF9F0A`）、當週柱實色其餘半透明、平均線中性灰虛線。
- **體重趨勢用中性語意**：體重升降無好壞之分，chip 採中性灰、只標方向與變化量（kg），不套用容積用的好壞色。體重趨勢同採 2A。
- **體重「持平」門檻（建議值）**：容積用 ±5% 百分比；體重建議改用絕對量門檻 **±0.3 kg**（週平均體重波動小，用百分比不直觀）。此為建議，實作時可再校準。
- **右軸範圍策略（防雜訊放大／防離群值撐爆）**：右軸不完全 auto。以 16 週非 `null` 體重的 min/max 為基礎、上下留邊後，套用兩個夾制：**最小跨度 ≈ 8 kg**（若資料跨度 < 8kg 則置中撐開到 8kg，避免 ±0.3kg 水分雜訊被放大成趨勢）、**最大跨度 ≈ 50 kg**（若跨度 > 50kg 則夾到 50kg，防止體重打錯字之類的離群值把整條線壓平）。左軸容積軸與右軸各自獨立，右軸設定不影響左軸尺度。
- **當週柱以「進行中」樣式呈現**：當週長條是「週一→當日」的部分加總、天生偏矮，若畫成一般實柱會被誤讀為容積驟降（需求 2 的視覺版陷阱）。當週柱 SHALL 以 ghost／虛線外框樣式並標示「進行中」，與共用基準小字一起讓語意閉環。
- **體重資料的空狀態**：當 16 週皆無體重紀錄時，折線區塊 SHALL 顯示引導文案（提示記錄體重可對照），右欄當週平均體重顯示「尚無體重紀錄」，而非留白讓人以為壞掉。
- **觸控觸發明細**：本專案為 LIFF 手機 mini-app，hover 在觸控裝置不存在。單週明細 tooltip SHALL 支援點擊／tap 觸發（沿用既有 hover 或點擊語意），確保手機使用者可看到單週容積與體重。

## Risks / Trade-offs

- **[徽章語意 vs 大數字]** 徽章描述上一完整週、大數字是當週即時值，兩者可能給人不一致感 → 緩解：共用基準小字明確標示比較對象。
- **[重建視覺成本]** 前一變更以 CSS 定案的 iPhone 風長條，改用 Highcharts 需重做當週強調、平均線、極簡軸與 tooltip，等同重新驗收外觀 → 緩解：以視覺預覽為準逐項對齊。
- **[缺值折線觀感]** 體重紀錄稀疏時折線會出現多處斷點 → 已與使用者確認採「斷開留空」而非內插，語意誠實優先。
- **[既有測試/快照]** 趨勢語意變更會改變輸出，既有 `weeklyTrainingVolumeInfo` 相關測試需同步更新。
- **[體重門檻待定]** ±0.3 kg 為建議值，需以真實資料觀察後再確認。
