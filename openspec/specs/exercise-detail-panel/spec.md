# Capability: Exercise Detail Panel

## Purpose
本能力在「最近動作總覽」的資料列下方展開一個面板，針對**單一動作**同時回答
排課表時要問的兩件事：**歷史紀錄是多少**（1RM / 3RM / 5RM，含首次達成日期）、
**最近兩週實際做了什麼**（哪幾天、幾組、幾下、多重）。

本能力只呈現資訊，不發出通知，不修改任何資料。

面板刻意分成「低頻」與「高頻」兩層：紀錄是罕見事件，平常只需看數字；
每次訓練的重量只在懷疑紀錄有誤時才需要逐筆查看，因此收在展開之後。

**紀錄與趨勢是兩件事**：紀錄回答「最好做到過多少」（不會往下），
趨勢回答「最近的重量往哪走」（練輕就往下）。面板上半是前者，折線圖是後者。

## Requirements

### Requirement: Strict Rep Records
面板 SHALL 為 1RM、3RM、5RM 各提供一筆紀錄，每筆包含**重量**與**首次達成日期**。

RM 的判定 SHALL 為**嚴格 reps 相等**（1RM 為 `reps === 1`，3RM 為 `reps === 3`，
5RM 為 `reps === 5`），SHALL NOT 解讀為「至少 N 下」。此定義沿用既有圖表，
SHALL NOT 與總覽表的「最大重量」（不限 reps）混用名稱。

日期 SHALL 為**首次**達成該重量的日期，SHALL NOT 為最近一次——
此欄回答的是「這個紀錄多久以前立的」。

`weight` 缺失、為空字串或非數字的紀錄 SHALL 被略過。
某個 RM 完全沒有符合的紀錄時 SHALL 為 `null`，該列 SHALL NOT 顯示。
三個 RM 皆為 `null` 時整個紀錄區塊 SHALL NOT 顯示，其分隔線亦 SHALL NOT 顯示。

#### Scenario: 嚴格 reps 判定
- **WHEN** 某動作有 `100×2` 與 `95×3` 兩筆紀錄
- **THEN** 3RM SHALL 為 95，SHALL NOT 為 100

#### Scenario: 日期為首次達成
- **WHEN** 某動作於 05-14、05-17、08-30 三日皆做到 `140×1`，且 140 為 1RM 紀錄
- **THEN** 1RM 的日期 SHALL 為 05-14

#### Scenario: 沒有符合 reps 的紀錄
- **WHEN** 某動作所有紀錄的 `reps` 皆為 8
- **THEN** 1RM、3RM、5RM SHALL 皆為 `null`，紀錄區塊 SHALL NOT 顯示

#### Scenario: 略過無效重量
- **WHEN** 某動作有 `reps === 1` 但 `weight` 為空字串的紀錄
- **THEN** 該筆 SHALL 被略過，1RM SHALL 取自其餘有效紀錄

### Requirement: Easy Max
1RM 紀錄 SHALL 附帶 **Easy Max**：該 1RM 重量的 90%，四捨五入至小數點一位。

Easy Max SHALL 為衍生值，SHALL NOT 另行儲存——1RM 更新時它 SHALL 自動反映，
因此 SHALL NOT 存在「未同步」的狀態。

某動作沒有嚴格 1RM 紀錄時 SHALL NOT 顯示 Easy Max，
SHALL NOT 以 0、破折號或任何佔位符代替。沒有 1RM 的動作是常態而非例外。

Easy Max SHALL NOT 加入折線圖——它是 1RM 的固定倍數，
其曲線與 1RM 序列平行，SHALL NOT 視為新增資訊。

#### Scenario: 由 1RM 導出
- **WHEN** 某動作的 1RM 為 140
- **THEN** Easy Max SHALL 為 126

#### Scenario: 四捨五入至小數點一位
- **WHEN** 某動作的 1RM 為 107
- **THEN** Easy Max SHALL 為 96.3

#### Scenario: 沒有 1RM 時不顯示
- **WHEN** 某動作有 5RM 紀錄但沒有任何 `reps === 1` 的紀錄
- **THEN** SHALL NOT 顯示 Easy Max，SHALL NOT 顯示 0 或破折號

### Requirement: Achievement History Drilldown
每一筆紀錄列 SHALL 可展開，顯示該 RM 的**完整達成史**：
所有符合該 reps 的訓練日及當日該 reps 的最大重量，依日期由新到舊排列。

達成史與趨勢折線圖 SHALL 使用同一份「每個訓練日該次數之最大重量」的計算，
SHALL NOT 各自實作——兩者是同一序列的兩種呈現。
（達成史固定看 1 / 3 / 5，趨勢圖看該動作最常練的次數，取的次數不同，
但底層計算 SHALL 為同一個。）

此層存在的理由是使用者對紀錄產生懷疑時的查證需求，屬低頻操作，
因此 SHALL 預設收合。

#### Scenario: 展開達成史
- **WHEN** 使用者點擊 3RM 那一列
- **THEN** SHALL 顯示所有 `reps === 3` 的訓練日與當日最大重量，由新到舊

#### Scenario: 達成史預設收合
- **WHEN** 動作詳細面板剛展開
- **THEN** 三筆紀錄的達成史 SHALL 皆為收合狀態

### Requirement: Rep Scheme Trend Chart
面板 SHALL 以折線圖顯示該動作的**重量趨勢**：每條線對應一個**該動作實際做過的次數**，
每個點為該訓練日、該次數的**當日最大重量**。

此圖 SHALL 與紀錄排分屬不同層次：**紀錄不會往下，趨勢會**。
練輕的訓練日 SHALL 如實呈現為下降。

線的次數 SHALL NOT 寫死為 1 / 3 / 5。變更理由（2026-09-08，全庫 529 組查證）：
嚴格 1/3/5 只涵蓋 60% 的組，8 下佔 25%；純 8 下的動作（分腿蹲一個完整週期 20 組、
重量自 40 kg 進步到 45 kg）在舊版**完全沒有圖**，而那正是最需要看趨勢的一段。
次數方案本來就因動作而異——主項低次數、輔項 8 下——寫死一組次數等同假設
所有動作使用同一種練法。

**選取規則**：SHALL 依**訓練日數**由多到少取前 3 種次數；訓練日數相同時
SHALL 取次數較少者（次數低者為主項，資訊量較高，且排序必須確定，
SHALL NOT 隨來源資料順序漂移）。

**顯示順序** SHALL 為次數由少到多，與紀錄排 1RM→3RM→5RM 的方向一致。

圖例 SHALL 以「N 下」標示該線的次數，SHALL NOT 使用 RM 字樣——
RM 指的是紀錄，而此圖是趨勢；沿用 RM 命名會使整張圖被讀成紀錄線
（此為 2026-09-08 使用者實際發生的誤讀）。

圖表 SHALL 附一行說明，且該說明 SHALL 僅在**確實有次數未被畫出時**
才描述選取規則。沒有篩掉任何東西卻描述一條篩選規則只會佔用版面。

該動作沒有任何有效紀錄時整張圖 SHALL NOT 顯示。

圖表 SHALL 只呈現訓練表現，SHALL NOT 疊加體重或體脂率序列，亦 SHALL NOT
使用右側 Y 軸。變更理由（2026-09-06）：體組成 SHALL 集中呈現於 Dashboard 頂部的
12 週圖（見 `weekly-training-volume`），同一件事 SHALL NOT 在兩處各畫一次。
先前版本在此疊加每日體重與體脂率，理由是「該動作的重量相對於體組成如何變化」；
該理由已被「體組成只有一個地方」取代。

圖表 SHALL NOT 附加描述線條組成的說明文字。疊圖移除後，該文字只剩
「左軸為訓練重量 (kg)」，而圖例已說明每條線是什麼。

#### Scenario: 純 8 下的動作也有趨勢線
- **WHEN** 某動作所有紀錄的 `reps` 皆為 8
- **THEN** 圖表 SHALL 顯示一條「8 下」的折線，SHALL NOT 為空

#### Scenario: 超過三種次數時只取訓練日數最多的三種
- **WHEN** 某動作的次數分別出現於 3、2、2、1 個訓練日
- **THEN** 圖表 SHALL 只顯示前三種，說明文字 SHALL 指出僅顯示最常練的三種

#### Scenario: 未篩掉任何次數時不描述選取規則
- **WHEN** 某動作只做過兩種次數
- **THEN** 兩條線 SHALL 皆顯示，說明文字 SHALL NOT 提及「只顯示最常練的 N 種」

#### Scenario: 訓練日數相同時取次數較少者
- **WHEN** 某動作的 1、3、5、8 下各出現於相同天數
- **THEN** 圖表 SHALL 顯示 1、3、5 下三條線

#### Scenario: 練輕的日子如實下降
- **WHEN** 某動作 5 下的當日最大重量由 110 降為 100
- **THEN** 該線 SHALL 在該訓練日下降，SHALL NOT 維持前一個高點

#### Scenario: 有體組成資料也不疊圖
- **WHEN** 期間內有體重與體脂率紀錄，且某動作有 RM 資料
- **THEN** 圖表 SHALL 只顯示 RM 序列，圖例 SHALL NOT 出現體重或體脂率，
  且 SHALL NOT 出現右側 Y 軸

### Requirement: Recent Training Detail
面板 SHALL 顯示該動作在**含今天在內往回 14 天**的滾動視窗內，每個訓練日的明細：
日期、組數、當日容積，以及當日實際的重量×次數組合。

視窗長度 SHALL 與總覽表的「最近 14 天」一致。

同一天內 `weight` 與 `reps` 皆相同的多筆紀錄 SHALL 合併為一組並標示筆數。
一筆紀錄 SHALL 計為一組。容積 SHALL 為 `reps × weight` 的總和，
`reps` 或 `weight` 缺失時 SHALL 以 0 計入該筆，SHALL NOT 使總和成為 `NaN`。

訓練日 SHALL 依日期由新到舊排列。
同一天內的組合 SHALL 依重量由小到大排列，同重量者再依 `reps` 由小到大——
來源資料的順序不保證穩定，顯示順序必須是確定的。

#### Scenario: 相同重量次數合併
- **WHEN** 某動作於某日有四筆 `45×8` 的紀錄
- **THEN** SHALL 顯示為一組 `45×8` 並標示 4 筆，組數 SHALL 為 4

#### Scenario: 同日多種重量分別列出
- **WHEN** 某動作於某日有 `100×5`、`120×3`、三筆 `130×1`、`140×1`
- **THEN** SHALL 列出四種組合，依序為 `100×5`、`120×3`、`130×1`（3 筆）、`140×1`，組數 SHALL 為 6

#### Scenario: 視窗含今天在內共 14 天
- **WHEN** 某動作在第 14 天與第 15 天各有紀錄
- **THEN** 僅第 14 天那筆 SHALL 出現在明細中

#### Scenario: reps 缺失不使容積成為 NaN
- **WHEN** 視窗內某筆紀錄缺少 `reps`
- **THEN** 該筆 SHALL 以 0 計入容積，當日容積 SHALL 為有效數值

### Requirement: Empty Window Fallback
14 天視窗內沒有任何紀錄時，面板 SHALL 顯示「近 14 天未練」並附上**最後一次**訓練的
日期與完整明細（組數、容積、重量×次數組合）。

此回退內容 SHALL 明確標示其日期，SHALL NOT 讓使用者誤以為它落在 14 天視窗內。

該動作完全沒有任何紀錄時 SHALL 顯示「近 14 天未練」而不附任何明細。
此情況在正常流程下不可達（總覽表只列出有紀錄的動作），本條為防禦性規定，
確保資料異常時 SHALL NOT 拋出例外或顯示空白區塊。

備註（記錄已知限制，非正規需求）：「上次」不保證是有代表性的一次訓練——
它可能是週期交界的輕組。本規則只保證使用者不必離開此頁就能看到最後一次做了什麼。

#### Scenario: 視窗內無紀錄時顯示上次
- **WHEN** 某動作最後一次訓練在 30 天前
- **THEN** SHALL 顯示「近 14 天未練」與該次的日期及完整明細

#### Scenario: 視窗內有紀錄時不顯示回退
- **WHEN** 某動作在 14 天視窗內有訓練紀錄
- **THEN** SHALL 只顯示視窗內的明細，SHALL NOT 顯示「上次」區塊

### Requirement: Accordion Presentation
詳細面板 SHALL 以手風琴形式展開於總覽表的該資料列**下方**，
SHALL NOT 捲動至頁面其他位置的常駐區塊。

所有列 SHALL 預設收合。**同一時間 SHALL 至多展開一列**——
展開另一列時前一列 SHALL 自動收合。

再次點擊已展開的列 SHALL 收合該列。

本能力 SHALL NOT 在載入時自動展開任何動作。任意挑選一個動作展開，
與其所取代的舊行為（圖表區塊在載入時自動選第一個動作）具有相同的缺陷：
呈現的內容與使用者的意圖無關。

#### Scenario: 預設全部收合
- **WHEN** Dashboard 剛載入
- **THEN** SHALL 沒有任何動作的詳細面板為展開狀態

#### Scenario: 展開新的一列會收合舊的
- **WHEN** 使用者已展開動作 A，接著點擊動作 B
- **THEN** 動作 B SHALL 展開，動作 A SHALL 收合

#### Scenario: 再次點擊即收合
- **WHEN** 使用者點擊已展開的那一列
- **THEN** 該列 SHALL 收合，且 SHALL NOT 有任何列處於展開狀態

### Requirement: No Exercise Name Aliasing
本能力 SHALL 依 `exercise` 欄位的字串原樣取資料，
SHALL NOT 合併語意相同但字串不同的動作名稱。

此規則與 `exercise-streak-overview` 一致——讓名稱分岔問題直接呈現在畫面上，
而非靜默影響計算結果。

#### Scenario: 同義動作各自獨立
- **WHEN** 資料中同時存在 `Overhead Press` 與 `Barbell Overhead Press`
- **THEN** 兩者的詳細面板 SHALL 各自只包含自己字串的紀錄
