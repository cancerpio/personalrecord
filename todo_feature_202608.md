# Feature TODO — 2026/08

依「重要性 + 可行性」排序的待辦功能清單。可行性以 ★ 表示（★★★★★ = 最容易落地）。

## 排名總表

| # | Feature | 重要性 | 可行性 | 梯隊 | 狀態 |
|---|---|---|---|---|---|
| 1 | 選動作時記得上次的組次數 | 中高 | ★★★★★ | 馬上做 | [x] 完成 |
| 2 | 動作變化通知（黃/紅燈） | ★★★★★ | 中高 | 馬上做（先定規則） | [ ] |
| 3 | 撈出訓練資料的 API / 匯出 | 中高 | ★★★★ | 地基 | [ ] |
| 4 | CICD（backend 部分） | 中 | ★★★★★ | 地基（前端已完成） | [ ] |
| 5 | MCP | 中 | ★★★ | 之後 | [ ] |
| 6 | SKILLS | 低（成本近零） | ★★★★★ | 隨時插隊 | [ ] |
| 7 | AI chatbot 檢視 / 優化課表 | 高 | ★★ | 之後 | [ ] |
| 8 | 紀錄前一天吃啥 | 低中 | ★★★ | 之後 | [ ] |
| 9 | 跟好友比賽訓練量和身體組成 | 中 | ★ | 最後 | [ ] |

---

## 1. 選動作時記得上次的組次數

**為什麼排第一**：投報率碾壓其他項。資料已在 store 裡，零後端、零 schema 變更，半天內完成，且是每次進健身房都會走到的路徑。

**做法**
- `src/stores/sessionStore.js` 加 getter `getLastSetForExercise(name)`：取該動作最近一次紀錄。
- `src/views/RecordView.vue`（`SearchableDropdown`，約 L233）選完動作後 prefill `form.weight` / `form.reps`。

---

## 2. 動作變化通知（動作持續週數 → 黃燈 / 紅燈）

**原始需求**
- 動作持續週數連續 **3 週**沒變 → 黃燈提示，並顯示該動作。
- 連續 **4 週**沒變 → 紅燈提示，並顯示該動作。
- 動作持續週數定義：
  - 計算起始日：跟訓練量一樣，從週日開始算。
  - 同一動作在一週內出現 2 次 → 該動作持續週數 +1。
  - 同一動作間隔 5 天未出現 → 不算連續，持續週數不加。
  - 同一動作間隔 10 天未出現 → 持續週數歸 0。

**目的（產品洞察）**
加入「變化動作」的概念。同一動作一直不換，容易讓該動作用到的某些肌群疲乏；換成變化動作可以解決這個問題並讓訓練持續下去。
例：持續不換的高背槓深蹲課表可能讓脊椎壓力過大、恢復不良；隔一段時間換成分腿蹲，可緩解脊椎壓力並持續給腿部足夠訓練量，下次換回高背槓深蹲時理論上能保留分腿蹲的好處，同時在脊椎壓力釋放的情況下取得進步。

**可以復用的資產**
- `src/components/CycleStatus.vue` 已寫好黃/紅燈 UI（`warning` / `critical` 樣式），目前只掛在 `src/App.vue.bak`、未被使用，可直接改造復用。
- `sessions` 已有 `date` + `exercise` 欄位，純前端 getter 即可算出。

**⚠️ 開工前必須先釐清的三個問題**
1. **週邊界與既有 spec 衝突**：需求寫「從週日開始算」，但這不是模糊地帶 —— `openspec/specs/weekly-training-volume/spec.md` 的 `Requirement: Weekly Grouping Boundary` 已明確規定「訓練週的範圍為**週一（起）至週日（迄）**，週日 SHALL 歸入其前一個週一所開始的那一週」，實作為 `getMondayOfDate()`（`src/stores/sessionStore.js:4`）。兩種處理方式：
   - **(建議) 沿用現況**：本功能直接複用週一起算的邊界，與訓練量一致，不需動既有程式。
   - **改成週日起算**：這是獨立的一件事，SHALL 另開一個 OpenSpec change（`MODIFIED: weekly-training-volume`），會動到當週容積、12 週序列、每週平均體重與整組測試。**不要混進本功能順手做**（見下方「衍生候選項」）。
2. **三條規則會互相打架**：「一週出現 2 次 +1」是以**週**為掃描單位，「隔 5 天 / 隔 10 天」是以**相鄰兩次間隔**為單位，兩種算法對同一份資料會給出不同答案。待決：
   - 某週出現 2 次但兩次相隔 6 天 → 算 +1 還是斷連續？
   - 某週只出現 1 次 → 不加、還是歸零？
   - 最終採「以週掃描、間隔天數只當打斷條件」還是反過來？
3. **動作名稱是自由文字**：`exercise` 可由使用者自行輸入，`Squat` / `squat` / `Squat ` 會被當成三個動作而切斷連續週數。至少要 trim + 大小寫正規化。

**建議做法**：把「持續週數」抽成 pure function，用 TDD 把上述邊界 case 一條條釘死，再接 UI。

**流程定位**：本項目前只是 backlog，規則未定案。依本 repo 既有節奏，開工時走 superpowers brainstorming → `docs/superpowers/specs/<date>-exercise-variation-alert-design.md` → `plans/<date>-*.md` → 實作時一併同步 `openspec/specs/`。定案後會是一個 **New Capability**（暫名 `exercise-variation-alert`）。

**衍生候選項（尚未決定要不要做）**
- [ ] 將訓練週邊界由「週一起算」改為「週日起算」 —— 獨立的 OpenSpec change，`MODIFIED: weekly-training-volume`，影響既有全部容積與體重計算。

---

## 3. 撈出訓練資料的 API / 匯出

**現況**：後端已有 `GET /api/v1/sessions`（`backend/src/index.ts:93`），但綁死 LIFF token middleware；前端 local 模式資料只存在 localStorage。

**待決定要哪一種**
- (a) 個人備份／餵給 AI → 前端一顆「匯出 JSON/CSV」按鈕，約 1 小時。
- (b) 對外 read-only API → 需另做 API key 機制（LIFF token 無法給 script 使用）。

**排序理由**：是 #5 MCP 與 #7 chatbot 的前置。建議先做 (a)，需求明確後再做 (b)。

---

## 4. CICD

**已完成**：`.github/workflows/deploy.yml` 已有 `npm test` gate + GitHub Pages 部署，前端這塊完成。

**缺口（本項待辦內容）**
- backend 完全沒有 CI/CD workflow。
- `backend/package.json` 沒有 test script。
- Firestore / Mongo 兩個 repository 實作零測試覆蓋。

重要性中等但可行性最高，且後面每個後端功能都受益。

---

## 5. MCP

排在 chatbot 前面：兩者目的重疊（用 AI 看課表），但 MCP 是把資料暴露給已在付費的 Claude，不用自己接 LLM API、不用管 key 與成本；chatbot 要後端 proxy、prompt 設計、還要付 token 費。同樣價值，MCP 便宜一個數量級。做完 #3 後大概就是包一層。

---

## 6. SKILLS

開發工具層、不是產品功能，所以重要性低；但成本近乎零（幾個 .md），repo 已有 `.claude/skills/` 慣例。想到就寫，不用排隊。

---

## 7. 讓 AI chatbot 幫忙檢視 / 優化課表

概念上最吸引人，但可行性最差：LLM key 管理、後端 proxy、成本、prompt 設計，且需等 #3。

**注意**：第一版其實不需要 LLM —「連續 4 週沒換動作」「訓練量連 3 週下滑」這類規則式建議就能覆蓋八成價值，而那正好是 #2 的延伸。

---

## 8. 紀錄前一天吃啥

新資料模型、新 UI、新的每日輸入習慣，但自由文字很難拿來分析，跟 `bodyMetrics` 也接不起來。除非結構化（熱量／蛋白質），否則做完只是個日記。

---

## 9. 跟好友比賽訓練量和身體組成

工程量最大。目前後端是純 per-user（`getSessions(userId)`），要加好友關係、授權、隱私設定、排行榜，等於一個新子系統，且對「自己好好訓練」這個核心價值幫助最不確定。

---

## 建議執行順序

1. **#1** 記住上次組次數（半天，立刻有感）
2. **#2** 動作變化通知（主菜；先走 brainstorming 把三個規則問題定案再寫，週邊界建議沿用現況）
3. **#4** backend CI（順手，之後都受益）
4. **#3** 資料匯出
5. **#5** MCP

**#6 SKILLS** 成本近零，可隨時插隊。
