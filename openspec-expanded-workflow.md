# OpenSpec Expanded Workflow 導入說明

> 範例情境：既有的 Yomi Cards / 歌詞日文學習卡 LINE Mini App 專案，原本沒有導入 OpenSpec，現在要新增功能：「顯示 user 最近最常點選的三張卡片」。

---

## 1. 這份文件要解決什麼問題

你的狀況是典型的 brownfield / legacy-like 專案：

- 專案已經存在，而且可能已經由 AI Agent 實作過不少功能。
- 每次加功能可能有紀錄，但沒有一份穩定的系統規格作為 source of truth。
- 新功能開發時，Agent 容易直接看需求就改 code，導致規格、實作、歷史決策難以追溯。
- 你希望改動 spec 之後，AI Agent 能依照 spec / design / tasks 進行大型功能實作。

OpenSpec Expanded Workflow 的價值是：

> 不讓 AI 從「模糊需求」直接跳到「大量改 code」，而是把中間的探索、proposal、spec delta、design、tasks、implementation、verify、archive 都拆成可 review 的步驟。

---

## 2. Core Workflow vs Expanded Workflow

OpenSpec 預設的 core workflow 適合需求明確、變更較小的情境；expanded workflow 則適合 brownfield、legacy、大型功能、需要逐步 review 的情境。

| 比較項目 | Core Workflow | Expanded Workflow |
|---|---|---|
| 適合情境 | 需求明確、範圍小到中等 | brownfield、legacy、大型功能、需要精細控制 |
| 建立 change | `/opsx:propose` 一次產生 planning artifacts | `/opsx:new` 先建 scaffold，再用 `/opsx:continue` 逐步產生 artifacts |
| artifact 產生方式 | 一次產生 proposal / specs / design / tasks | 可逐步產生，也可用 `/opsx:ff` 一次產生 |
| review 節奏 | 較快，但中間檢查點少 | 每一步都可以停下來檢查 |
| implementation 驗證 | 主要靠人工 review | 可用 `/opsx:verify` 檢查 implementation 是否對齊 artifacts |
| 多個 change 管理 | 逐個 archive | 可用 `/opsx:bulk-archive` 批次 archive |
| 對你的 mini app 適合度 | 可以，但不建議一開始就用 | 建議使用 |

### 簡單判斷

| 情境 | 建議 |
|---|---|
| 已經很清楚要做什麼，小功能 | Core 或 Expanded + `/opsx:ff` |
| 需求還不清楚，要先理解舊 code | Expanded + `/opsx:explore` |
| 需要每一步都 review | Expanded + `/opsx:new` + `/opsx:continue` |
| 新增資料模型、Auth、Storage、跨頁面功能 | Expanded |
| AI Agent 曾經寫過很多 code，你現在不完全放心 | Expanded |

---

## 3. OpenSpec 指令總表

### 3.1 Core Profile 預設指令

| 指令 | 用途 | 適合時機 |
|---|---|---|
| `/opsx:propose` | 建立 change，並一次產生 planning artifacts | 需求明確，想快速從需求進到 implementation plan |
| `/opsx:explore` | 探索需求、調查 codebase、比較方案，不一定建立 change | brownfield 專案、需求不清楚、要先做 impact analysis |
| `/opsx:apply` | 依照 change 裡的 tasks 實作 | proposal / specs / design / tasks 已確認後 |
| `/opsx:sync` | 將 delta specs 合併到 main specs | 需要先同步 spec，但還不想 archive change 時 |
| `/opsx:archive` | 歸檔完成的 change，並保存歷史紀錄 | 功能完成、驗證通過、準備讓 spec 成為正式 source of truth 時 |

### 3.2 Expanded Workflow 指令

| 指令 | 用途 | 適合時機 |
|---|---|---|
| `/opsx:new` | 建立新的 change scaffold，但不一次產生所有 artifacts | 想逐步控制 proposal / specs / design / tasks 的產生 |
| `/opsx:continue` | 依照 artifact dependency 產生下一個 artifact | 想每一步 review：proposal → specs → design → tasks |
| `/opsx:ff` | fast-forward，一次產生所有 planning artifacts | 需求已清楚，但仍想使用 expanded workflow |
| `/opsx:verify` | 驗證 implementation 是否符合 artifacts | `/opsx:apply` 後、archive 前 |
| `/opsx:bulk-archive` | 一次 archive 多個完成的 changes | 同時處理多個完成的 change |
| `/opsx:onboard` | 用目前 codebase 跑 guided tutorial | 第一次學 OpenSpec，或想用真實專案熟悉流程 |

---

## 4. 為什麼你的 LINE Mini App 建議用 Expanded Workflow

你的專案不是從零開始，而是：

```text
已有 codebase
沒有正式 OpenSpec specs
功能紀錄分散
AI Agent 可能已經改過很多區域
現在要新增「最近最常點選的三張卡片」
```

這種情況最怕兩件事：

1. Agent 沒理解既有系統，就直接亂加資料欄位、亂改 UI、亂接 storage。
2. 一開始試圖把整個舊系統補成完整規格，結果成本過高，導入流程卡住。

所以推薦策略是：

> 先建立最小但可信的全局 baseline，再針對這次新功能會碰到的 domain 補深。

也就是：

```text
全系統：先畫地圖
會被改到的區域：補成正式規格
不相關區域：之後改到再補
```

---

## 5. 導入前的建議 repo 狀態

導入 OpenSpec 前，建議先確認：

| 項目 | 目的 |
|---|---|
| 專案可以正常 build / test | 避免 OpenSpec 導入後分不清是原本壞掉還是導入造成問題 |
| 先開新 branch | 避免直接污染 main |
| 先 commit 目前狀態 | 保留導入前基準點 |
| 確認 AI 工具 | Claude Code、Cursor、Antigravity 等工具產生的 skill / command 路徑可能不同 |

範例：

```bash
git status
git checkout -b chore/introduce-openspec
npm install
git status
```

---

## 6. Phase 1：安裝並啟用 Expanded Workflow

### 6.1 安裝 OpenSpec

```bash
npm install -g @fission-ai/openspec@latest
cd your-line-mini-app-project
openspec init
```

### 6.2 啟用 expanded workflow

```bash
openspec config profile
openspec update
```

在 `openspec config profile` 裡選擇 expanded workflow 或選擇包含以下 workflow 的 custom profile：

```text
new
continue
ff
verify
bulk-archive
onboard
```

### 6.3 檢查產生的檔案

依工具不同，可能會看到類似：

```text
openspec/
  specs/
  changes/
  config.yaml

.claude/
  skills/
    openspec-*/
  commands/
    opsx/

.cursor/
  skills/
    openspec-*/
  commands/
    opsx-*.md

.agent/
  skills/
    openspec-*/
  workflows/
    opsx-*.md
```

### 6.4 先 commit OpenSpec 導入

```bash
git add .
git commit -m "chore: introduce OpenSpec expanded workflow"
```

---

## 7. Phase 2：先探索 brownfield codebase，不直接寫 spec

這一步的目的不是改 code，也不是一次補完整系統規格，而是讓 agent 先理解目前專案地圖。

### 建議指令

```text
/opsx:explore

This is an existing brownfield LINE Mini App / web app project for Japanese learning cards.
The project currently has no OpenSpec specs.

Please inspect the codebase and summarize:
1. app purpose and core user flow
2. current frontend structure
3. current card and collection data model
4. current user identity / auth flow
5. current storage layer
6. where card open / click behavior is handled
7. where the home page / dashboard is implemented
8. which areas must be documented before adding "top 3 most clicked cards"

Do not change code.
Do not create a change yet.
Mark uncertain findings as Unknown or Needs Verification.
```

### 這一步應該得到的結果

| 輸出 | 用途 |
|---|---|
| app purpose summary | 避免 agent 誤解產品方向 |
| code structure map | 知道該去哪裡改 |
| data model summary | 知道 card / collection / user 的關係 |
| storage / auth summary | 確保 user isolation 與跨裝置同步正確 |
| unknown list | 不讓 agent 把推測寫成事實 |
| affected domains | 決定 baseline spec 要先補哪些區域 |

---

## 8. Phase 3：建立最小 baseline specs

因為原本專案完全沒有 OpenSpec，所以不要直接新增功能。先建立一個 baseline change，補最低限度的主規格。

### 8.1 建立 baseline change scaffold

```text
/opsx:new create-yomi-cards-baseline-specs
```

### 8.2 逐步產生 proposal

```text
/opsx:continue
```

這次 proposal 應該包含：

| 區塊 | 內容 |
|---|---|
| Intent | 為既有 Yomi Cards 專案建立最小 OpenSpec baseline |
| Scope | app overview、architecture、user identity、cards、collections、storage |
| Out of scope | 不完整描述所有舊功能、不新增新功能、不改 code |
| Risk | AI 可能誤讀 code；不確定處必須標 Unknown / Needs Verification |

### 8.3 逐步產生 baseline specs

```text
/opsx:continue
```

建議產生：

```text
openspec/changes/create-yomi-cards-baseline-specs/specs/
  app-overview/spec.md
  architecture/spec.md
  user-identity/spec.md
  cards/spec.md
  collections/spec.md
  storage/spec.md
```

建議內容：

| Spec | 描述重點 |
|---|---|
| `app-overview/spec.md` | App 是讓 user 從歌詞或文章片段建立日文學習卡片 |
| `architecture/spec.md` | Vue / Firebase / LINE Mini App / hosting / functions 的整體關係 |
| `user-identity/spec.md` | user id 怎麼來、web app 與 LINE Mini App 如何辨識 user |
| `cards/spec.md` | card 的欄位、建立、開啟、顯示行為 |
| `collections/spec.md` | collection 與 card 的關係 |
| `storage/spec.md` | Firestore / localStorage / API / security rules 的目前假設 |

### 8.4 逐步產生 design

```text
/opsx:continue
```

baseline 的 `design.md` 不是設計新功能，而是記錄目前系統架構。

建議包含：

| 區塊 | 內容 |
|---|---|
| Frontend structure | 主要 routes、pages、components、stores |
| Data access | card / collection 透過哪些 service / repository 存取 |
| Auth | user identity 如何取得 |
| Storage | 目前資料儲存在 Firestore、localStorage 或 backend API |
| Known constraints | 現在還不確定、不能亂假設的地方 |

### 8.5 逐步產生 tasks

```text
/opsx:continue
```

baseline tasks 應偏向「確認與校正」：

```md
# Tasks

- [ ] Confirm app overview is accurate
- [ ] Confirm current card data model
- [ ] Confirm current collection data model
- [ ] Confirm current user identity flow
- [ ] Confirm current storage implementation
- [ ] Mark uncertain behavior as Unknown or Needs Verification
- [ ] Do not modify application code in this baseline change
```

### 8.6 Review baseline 並 archive

人工確認 baseline 沒有把幻想寫成事實後：

```text
/opsx:archive create-yomi-cards-baseline-specs
```

archive 後，baseline specs 會成為主規格的一部分：

```text
openspec/specs/
  app-overview/spec.md
  architecture/spec.md
  user-identity/spec.md
  cards/spec.md
  collections/spec.md
  storage/spec.md
```

---

## 9. Phase 4：建立新功能 change：Top 3 Most Clicked Cards

baseline 完成後，才開始正式新增功能。

### 9.1 建立 feature change scaffold

```text
/opsx:new add-top-3-most-clicked-cards
```

### 9.2 產生 proposal

```text
/opsx:continue
```

建議 prompt：

```text
Create a proposal for adding top 3 most clicked cards for each user.

Feature:
Show the current user's top 3 most clicked cards on the home page.

Requirements:
1. Track card click count per user.
2. Show up to 3 cards with highest click count.
3. Sort by click count descending.
4. If click counts tie, sort by most recently clicked.
5. If fewer than 3 clicked cards exist, show only available cards.
6. Do not include cards from other users.
7. Support refresh and cross-device persistence if the project uses Firestore.

Out of scope:
- No recommendation algorithm.
- No spaced repetition.
- No analytics dashboard.
- No full event log unless required by current architecture.

Do not implement code yet.
```

### proposal.md 應包含

| 區塊 | 內容 |
|---|---|
| Intent | 讓 user 在首頁快速回到最常看的卡片 |
| Problem | user 現在需要從 collection / card list 裡找常看的卡片 |
| Scope | click count、last clicked time、top 3 query、首頁顯示 |
| Out of Scope | 推薦演算法、analytics、spaced repetition |
| Success Criteria | 排序正確、user isolation、舊資料不 crash、跨刷新保存 |

---

## 10. Phase 5：產生 delta specs

```text
/opsx:continue
```

建議 affected specs：

```text
openspec/changes/add-top-3-most-clicked-cards/specs/
  cards/spec.md
  storage/spec.md
  app-overview/spec.md
```

### cards/spec.md delta 範例

```md
## ADDED Requirements

### Requirement: Track Card Click Count

The system SHALL track how many times the current user opens a card.

#### Scenario: User opens an owned card
- GIVEN the user is signed in
- AND the card belongs to the user
- WHEN the user opens the card
- THEN the system increments that card's click count
- AND updates the card's last clicked time

### Requirement: Show Top Three Most Clicked Cards

The system SHALL show up to three cards with the highest click count for the current user.

#### Scenario: User has more than three clicked cards
- GIVEN the user has clicked more than three cards
- WHEN the home page loads
- THEN the system shows the three cards with the highest click count
- AND breaks ties by latest clicked time descending

#### Scenario: User has fewer than three clicked cards
- GIVEN the user has clicked fewer than three cards
- WHEN the home page loads
- THEN the system shows only available clicked cards

#### Scenario: User has no clicked cards
- GIVEN the user has not clicked any cards
- WHEN the home page loads
- THEN the system hides the top clicked cards section
- OR shows an empty state if the product design requires it
```

---

## 11. Phase 6：產生 design.md

```text
/opsx:continue
```

### design.md 應回答的問題

| 問題 | 說明 |
|---|---|
| click count 存在哪裡？ | card document、user-card stats document，或 event log |
| 什麼時候更新 click count？ | card detail opened、card clicked、或進入 review 時 |
| 舊資料沒有 clickCount 怎麼辦？ | fallback 為 0，避免 crash |
| user isolation 怎麼保證？ | query path / userId filter / security rules |
| top 3 怎麼查？ | sort by clickCount desc + lastClickedAt desc + limit 3 |
| 是否需要 Firestore index？ | 如果使用複合排序，可能需要 composite index |
| 是否要 debounce / throttle？ | 避免同一張卡片短時間內被重複計數 |

### Firestore MVP 設計範例

如果目前使用 Firestore，MVP 可先採用：

```text
users/{userId}/cards/{cardId}
  text: string
  reading: string
  translation: string
  collectionId: string
  clickCount: number
  lastClickedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
```

查詢：

```text
users/{userId}/cards
  orderBy("clickCount", "desc")
  orderBy("lastClickedAt", "desc")
  limit(3)
```

### 方案比較

| 方案 | 優點 | 缺點 | 建議 |
|---|---|---|---|
| 在 card document 加 `clickCount` / `lastClickedAt` | 簡單、查詢直接、適合 MVP | 無法保留完整點擊歷史 | 推薦 MVP |
| 建立 `card_click_events` event log | 可做 analytics、可追溯每次點擊 | 寫入量高、設計較重 | 之後有 analytics 再做 |
| localStorage 記錄 | 實作最快 | 無法跨裝置、資料不可同步 | 不建議正式功能 |
| user-card stats subcollection | 統計資料與 card 分離 | schema 較複雜 | 若 card 是全域共享才考慮 |

---

## 12. Phase 7：產生 tasks.md

```text
/opsx:continue
```

### tasks.md 範例

```md
# Tasks

## 1. Data Model
- [ ] 1.1 Add clickCount to card model
- [ ] 1.2 Add lastClickedAt to card model
- [ ] 1.3 Ensure old cards without clickCount are treated as 0

## 2. Click Tracking
- [ ] 2.1 Identify the existing card open / click handler
- [ ] 2.2 Increment clickCount when the current user opens a card
- [ ] 2.3 Update lastClickedAt at the same time
- [ ] 2.4 Prevent updates for cards not owned by the current user
- [ ] 2.5 Avoid duplicate counting if the existing UX causes repeated open events

## 3. Query
- [ ] 3.1 Add repository / service method to fetch top 3 clicked cards
- [ ] 3.2 Sort by clickCount descending
- [ ] 3.3 Break ties by lastClickedAt descending
- [ ] 3.4 Limit result to 3

## 4. UI
- [ ] 4.1 Add top clicked cards section to home page
- [ ] 4.2 Render 0, 1, 2, or 3 cards correctly
- [ ] 4.3 Navigate to card detail when a top card is clicked
- [ ] 4.4 Use copy that does not imply AI recommendation

## 5. Security and Data Isolation
- [ ] 5.1 Confirm the query only reads current user's cards
- [ ] 5.2 Confirm click updates only affect current user's cards
- [ ] 5.3 Update Firestore rules if needed

## 6. Tests and Verification
- [ ] 6.1 Test no clicked cards
- [ ] 6.2 Test fewer than 3 clicked cards
- [ ] 6.3 Test more than 3 clicked cards
- [ ] 6.4 Test tie-breaker sorting
- [ ] 6.5 Test old cards without clickCount
- [ ] 6.6 Test user isolation
```

---

## 13. Phase 8：分段實作，不要一次全部交給 Agent

### 13.1 第一輪：data model + click tracking

```text
/opsx:apply add-top-3-most-clicked-cards

Only implement tasks related to data model and click tracking first.
Do not implement the home page UI yet.
After implementation, summarize files changed and tests run.
```

### 13.2 第二輪：query service

```text
/opsx:apply add-top-3-most-clicked-cards

Now implement the query service for fetching top 3 most clicked cards.
Do not implement UI yet.
Focus on sorting, fallback behavior, and user isolation.
```

### 13.3 第三輪：home page UI

```text
/opsx:apply add-top-3-most-clicked-cards

Now implement the home page UI section for top 3 most clicked cards.
Use the existing design system and component style.
Do not introduce unrelated UI redesign.
```

### 13.4 第四輪：tests / cleanup

```text
/opsx:apply add-top-3-most-clicked-cards

Now complete remaining test and cleanup tasks.
Do not expand scope beyond the approved OpenSpec change.
```

---

## 14. Phase 9：驗證 implementation

```text
/opsx:verify add-top-3-most-clicked-cards
```

### verify 時要特別看

| 檢查項目 | 預期 |
|---|---|
| tasks 是否完成 | `tasks.md` 的 relevant tasks 已完成或有理由 postponed |
| requirements 是否有對應實作 | 每個 requirement / scenario 都能在 code 或測試中找到對應 |
| sorting 是否正確 | clickCount desc，tie by lastClickedAt desc |
| empty state 是否正確 | 0 張、1 張、2 張都不 crash |
| 舊資料是否相容 | 沒有 clickCount 的 card 不會 crash |
| user isolation 是否正確 | user 不能看到或更新別人的 card |
| design 是否被遵守 | 沒有偷加 event log、推薦演算法、analytics dashboard |

如果 verify 發現問題，應該先修正 implementation 或修正 spec / design / tasks，不要急著 archive。

---

## 15. Phase 10：Archive change

確認功能完成後：

```text
/opsx:archive add-top-3-most-clicked-cards
```

archive 後，delta specs 會合併回主 specs，change 會被保留在 archive 中，形成追溯紀錄。

可能結果：

```text
openspec/
  specs/
    app-overview/spec.md
    architecture/spec.md
    user-identity/spec.md
    cards/spec.md
    collections/spec.md
    storage/spec.md

  changes/
    archive/
      2026-05-10-create-yomi-cards-baseline-specs/
      2026-05-10-add-top-3-most-clicked-cards/
```

---

## 16. 後續維護規則

建議在 `AGENTS.md`、`CLAUDE.md` 或對應工具的 project rules 裡加入：

```md
# Required OpenSpec Workflow

For any non-trivial feature, behavior change, data model change, auth change, storage change, or architecture change:

1. Do not edit code directly.
2. Start with OpenSpec.
3. Use `/opsx:explore` if the affected area is unclear.
4. Use `/opsx:new` and `/opsx:continue` for complex or brownfield changes.
5. Use `/opsx:ff` only when the scope is clear and low-risk.
6. Do not implement until proposal, specs, design, and tasks are reviewed.
7. Run `/opsx:verify` before finalizing.
8. Do not archive until the user confirms the behavior is correct.
9. If an undocumented area is touched, document the current behavior first.
```

---

## 17. Skill / Command 注意事項

OpenSpec 可能會依工具產生 skills 和 commands。概念上可以這樣理解：

| 類型 | 角色 |
|---|---|
| Command | 人類明確啟動某個 workflow 的入口，例如 `/opsx:new` |
| Skill | Agent 執行該 workflow 時使用的方法書，例如 `openspec-new-change` |
| AGENTS.md / CLAUDE.md | 常駐的專案規則 |
| CI / PR checklist | 最接近硬性保證的流程 gate |

注意：

- Skill 不保證 100% 自動觸發。
- Slash command 比自動觸發 skill 更可靠，但仍不是 compiler-level guarantee。
- 真正要避免 Agent 繞過規格流程，應該搭配 PR checklist、Git hook、CI 檢查。

---

## 18. 建議 PR Checklist

```md
## OpenSpec

- Change ID:
- Related specs:
- Proposal reviewed: yes / no
- Design reviewed: yes / no
- Tasks completed: yes / no
- `/opsx:verify` completed: yes / no
- Archive after merge: yes / no

## Risk Areas

- [ ] Data model change
- [ ] Auth / user identity change
- [ ] Firestore / storage change
- [ ] UI behavior change
- [ ] Security rules change
- [ ] Legacy data compatibility
```

---

## 19. 最推薦的完整流程

針對你的 LINE Mini App，我建議完整流程如下：

```text
git checkout -b chore/introduce-openspec
openspec init
openspec config profile
openspec update
git add .
git commit -m "chore: introduce OpenSpec expanded workflow"

/opsx:explore
/opsx:new create-yomi-cards-baseline-specs
/opsx:continue
/opsx:continue
/opsx:continue
/opsx:continue
/opsx:archive create-yomi-cards-baseline-specs

/opsx:new add-top-3-most-clicked-cards
/opsx:continue
/opsx:continue
/opsx:continue
/opsx:continue
/opsx:apply add-top-3-most-clicked-cards
/opsx:verify add-top-3-most-clicked-cards
/opsx:archive add-top-3-most-clicked-cards
```

如果需求已經很清楚，也可以把 feature change 的 planning 階段簡化為：

```text
/opsx:new add-top-3-most-clicked-cards
/opsx:ff
/opsx:apply
/opsx:verify
/opsx:archive
```

但以 brownfield 導入初期來說，建議先用 `/opsx:continue`，不要直接 `/opsx:ff`。

---

## 20. 一句話總結

> OpenSpec Expanded Workflow 的重點不是讓流程變複雜，而是讓 AI Agent 在 brownfield 專案裡不能直接從需求跳到改 code；它把探索、規格、設計、任務、實作、驗證、歸檔拆成可控制的節點，讓每次功能開發都能逐步累積成可追溯的 living spec。

---

## 參考資料

- OpenSpec Commands: https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md
- OpenSpec Supported Tools: https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md
- OpenSpec OPSX Workflow: https://github.com/Fission-AI/OpenSpec/blob/main/docs/opsx.md
- OpenSpec Workflows: https://lzw.me/docs/openspec/en/workflows.html
