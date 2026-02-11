# Feature 調整指令

## 自然語言使用規則

**重要**：除非使用者明確指定其他語言，否則：
- **對話**：AI 與使用者的所有對話都使用繁體中文
- **文件修改**：所有文件的修改與編輯都使用繁體中文
- **文件記錄**：所有生成的記錄文件（Update.md、diff.md、changelog 等）都使用繁體中文

**例外情況**：
- 如果文件本身是英文的（例如：原始檔案的註解、變數名稱、API 文檔等），則保持原有的英文內容，不強制翻譯

## 指令目的

本指令目的是直接根據需求產出可還原且有被記錄的實作

**特點**：
- 提供完整的備份還原機制和變更記錄

**適用場景**：
- 獨立功能或實驗性功能的實作

## 執行流程順序

AI 執行本指令時，必須依照以下順序進行：

1. **確認調整需求**：根據指令方式確認要調整的內容（見下方「如何指定調整需求」說明）
2. **建立還原點**：在開始實作前，建立還原點以便後續還原（見下方「還原機制」說明）
3. **實作前回覆**：顯示預計修改的檔案清單和驗收計畫
4. **執行實作**：開始實作功能調整
   - 根據使用者的需求描述或指定檔案內容執行
   - 需遵守一般的最佳實踐和程式碼規範
5. **實作後回覆**：記錄實際修改內容
   
   **記錄**
   - Update.md：專案更新摘要
   - diff.md：詳細變更記錄和還原資訊（見下方「還原機制」說明）

### 如何指定調整需求

使用 slash command 時，支援以下三種方式：

#### 方式 1：直接執行（不帶參數）

```
/implement_normal_feature_task
```

**AI 必須執行以下步驟**：

1. **提醒使用者這是功能調整**
   ```
   注意：這是功能調整指令，用於在既有規格上新增或調整功能，而非實作 SDD 的初始功能。
   
   如果是首次實作功能，請使用完整的 SDD 流程（spec → plan → tasks → implement）。
   ```

2. **詢問要調整的內容**
   ```
   請描述要新增或調整的功能：
   - 可以直接描述功能需求
   - 也可以提供檔案路徑，讓我根據檔案內容確認要新增/調整的功能
   ```

3. **等待使用者回覆**
   - 如果使用者提供描述：按照「方式 2」處理
   - 如果使用者提供檔案路徑：按照「方式 3」處理

#### 方式 2：帶描述執行

```
/implement_normal_feature_task 新增使用者登入功能，包含帳號密碼驗證和 JWT token 發放
```

**AI 處理流程**：
1. 根據描述理解要新增/調整的功能
2. 自動生成 feature name（例如：從「新增使用者登入功能」→ `user-login`）
3. 繼續執行後續流程

#### 方式 3：帶檔案路徑執行

```
/implement_normal_feature_task path/to/feature-request.md
```

**AI 處理流程**：
1. 讀取指定檔案內容
2. 從檔案路徑或檔案內容提取 feature name
   - 優先使用檔案名稱（不含副檔名）
   - 例如：`feature-request.md` → feature name 為 `feature-request`
3. 根據檔案內容確認要新增/調整的功能
4. 繼續執行後續流程

**檔案路徑格式**：
- 相對路徑：`docs/new-feature.md`
- 絕對路徑：`/Users/user/Project/docs/new-feature.md`
- 支援 `.md`、`.txt`、`.json` 等文字格式

### Feature Name 命名規則

- **如果使用者指定檔案路徑**：使用檔案名稱（不含副檔名）
  - 範例：`docs/user-authentication.md` → feature name: `user-authentication`
- **如果使用者提供描述**：AI 自行根據需求取名
  - 規則：使用 2-4 個單字，使用連字號連接，採用 action-noun 格式
  - 範例：「新增使用者登入功能」→ `user-login`
  - 範例：「調整價格計算邏輯」→ `price-calculation-update`
  - 範例：「修復登入錯誤」→ `login-fix`

### 確認調整需求

在確認調整需求時，AI 必須：

1. **理解調整範圍**
   - 確認是新增功能還是調整既有功能，如果是調整既有專案的功能，需要盡量與既有專案的風格（Ex: 程式語言，盡量用已存在的功能，Coding style...etc）
   - 確認調整的功能範圍和影響範圍
   - 確認是否需要修改資料結構、API、UI 等

2. **顯示確認訊息**，包含：
   - 調整需求摘要
   - 預估會修改/新增的檔案清單（概要）
   - 預估會影響的功能範圍
   - 是否需要更新四份文件（constitution.md, spec.md, plan.md, tasks.md）

3. **等待使用者明確確認**（例如：回覆「確認執行」或「是」）才開始實作

4. **確認 Feature Name**
   - 根據前述規則確定 feature name
   - 用於後續的 changelog 檔案命名

## 實作限制

### 嚴格禁止的行為

以下行為**除非經過討論並取得同意，否則不允許AI執行**：
- 新增依賴（npm 套件、外部服務等）
- 改動資料 schema（資料結構、型別定義）
- 改動部署策略（CI/CD、部署流程）

### 檔案修改範圍限制

**重要原則**：

1. **只修改與任務/需求直接相關的檔案**
   - **禁止**修改任何與指定的任務/需求不相關的檔案
   - 如果發現需要修改不相關的檔案，必須先與使用者討論並獲得同意
   - 在「實作前回覆」中，如果有修改不相關檔案的需求，必須特別標註並說明原因

2. **移除既有檔案必須獲得使用者同意**
   - **禁止**未經使用者同意就刪除或移除既有的檔案
   - 如果實作需要移除既有檔案，必須先暫停執行並與使用者討論：
     - 說明為什麼需要移除該檔案
     - 說明移除該檔案的影響範圍
     - 等待使用者明確同意後才能繼續執行
   - 在「實作前回覆」中，如果有移除檔案的需求，必須明確列出並說明原因

3. **修改既有文件內容必須先顯示 diff 並獲得同意**
   - **優先原則**：盡量以補充或新增的方式修改文件，避免改動既有內容
   - 如果需要改動既有文件的內容（例如：修改既有函數、改寫既有段落等），**必須先暫停執行**
   - 顯示完整的 diff 內容給使用者檢視：
     - 清楚標示哪些是原有內容（使用 `-` 或刪除標記）
     - 清楚標示哪些是新的內容（使用 `+` 或新增標記）
     - 說明修改的原因和影響
   - **只有獲得使用者明確同意後，才能進行修改**
   - 如果使用者拒絕修改，必須與使用者討論替代方案

4. **遇到任何問題都必須暫停並討論**
   - 如果在實作過程中遇到任何問題、不確定性或衝突，**必須立即暫停執行**
   - 與使用者討論問題、影響和解決方案
   - **只有獲得使用者明確同意後，才能繼續執行**

## 實作前回覆

開始實作前，請先回覆以下內容：

1. **預計修改/新增的檔案清單**
   - 列出所有會被修改的檔案
   - 列出所有會被新增的檔案
   - **使用範圍或多個 Task 時**：提供所有 Task 的檔案清單概覽，並說明將會依照 Phase 順序執行
   - **使用 `all` 時**：提供完整的檔案清單概覽，並說明將會分 Phase 執行

2. **驗收計畫（具體指令）**
   - 說明如何驗證功能正常運作
   - 提供可執行的測試指令或步驟
   - **使用範圍或多個 Task 時**：說明整體驗收計畫，以及每個 Phase 的檢查點
   - **使用 `all` 時**：說明整體驗收計畫，以及每個 Phase 的檢查點
 
## 更新流程

完成實作後，AI 必須：

1. **分析變更範圍**
   - 確認哪些文件需要更新
   - 確認每個文件需要更新的內容

2. **備份原文件**
   - 在更新前，先備份需要更新的文件 
   - 與「還原機制」中的備份合併管理

3. **更新文件內容**
   - 根據實作變更，同步更新相關文件
   - 保持文件格式和結構的一致性 

4. **記錄到 changelog**
   - 在 feature 目錄或專案根目錄建立/更新 changelog 文件
   - 檔案命名：`changelog_{FEATURE_NAME}_{YYYYMMDD_HHMMSS}.md`
   - 例如：`changelog_user-login_20240116_143022.md`

### Changelog 格式

changelog 文件應包含以下內容：

```markdown
# Changelog: {FEATURE_NAME}

執行時間：{timestamp}
調整類型：新增功能 / 調整功能
Feature Name：{FEATURE_NAME}

## 變更摘要

### 實作變更
- 新增的檔案：{檔案清單}
- 修改的檔案：{檔案清單}
- 刪除的檔案：{檔案清單}

### 文件更新

#### constitution.md
- 更新內容：{說明更新的內容}
- 更新原因：{為什麼需要更新}
- 備份位置：`./backups/{timestamp}_{FEATURE_NAME}/constitution.md`

#### spec.md
- 更新內容：
  - 新增使用者故事：{列出新增的故事}
  - 新增功能需求：{列出新增的需求}
  - 更新成功標準：{列出更新的標準}
- 更新原因：{為什麼需要更新}
- 備份位置：`./backups/{timestamp}_{FEATURE_NAME}/spec.md`

#### plan.md
- 更新內容：
  - 技術堆疊變更：{列出變更}
  - 專案結構變更：{列出變更}
  - 技術上下文變更：{列出變更}
- 更新原因：{為什麼需要更新}
- 備份位置：`./backups/{timestamp}_{FEATURE_NAME}/plan.md`

#### tasks.md
- 更新內容：
  - 新增任務：{列出新增的任務}
  - 更新任務：{列出更新的任務}
  - 更新依賴關係：{列出更新的依賴}
- 更新原因：{為什麼需要更新}
- 備份位置：`./backups/{timestamp}_{FEATURE_NAME}/tasks.md`

## 還原方式

如果需要還原文件更新：

### 還原文件

```bash
# 還原 constitution.md
cp ./backups/{timestamp}_{FEATURE_NAME}/constitution.md {原檔案路徑}

# 還原 spec.md
cp ./backups/{timestamp}_{FEATURE_NAME}/spec.md {原檔案路徑}

# 還原 plan.md
cp ./backups/{timestamp}_{FEATURE_NAME}/plan.md {原檔案路徑}

# 還原 tasks.md
cp ./backups/{timestamp}_{FEATURE_NAME}/tasks.md {原檔案路徑}
```

## 驗證

- [ ] 如果是前端的實作，請啟動並執行各項功能的E2E測試
- [ ] 實作變更已完成 
- [ ] Changelog 已記錄所有變更
- [ ] 檔案備份已建立
- [ ] 更新後的文件符合 Spec Kit 規範

## 還原機制

為了確保所有變更都可以還原，AI 必須在實作前建立檔案備份，並在實作後記錄變更。

**設計原則**：使用純檔案備份方式，不會進行任何 Git commit，確保不會影響 Git 歷史。

### 步驟 1：建立檔案備份（實作前）

在開始實作任何功能之前，AI 必須：

1. **確定將被修改的檔案清單**
   - 根據「實作前回覆」中的預計修改/新增檔案清單
   - 僅備份「將被修改」的檔案（新增的檔案不需要備份）

2. **建立備份目錄**
   - 在 `./backups/` 目錄下建立時間戳記子目錄
   - 備份目錄格式：`./backups/{YYYYMMDD_HHMMSS}_{FEATURE_NAME}/`
   - 範例：`./backups/20240116_143022_user-login/`

3. **備份檔案**
   - 對於每個將要被修改的檔案，建立備份副本
   - 備份檔案保留原始目錄結構
   - 範例：如果原檔案是 `src/components/Button.vue`
     - 備份到：`./backups/20240116_143022_user-login/src/components/Button.vue`
   
4. **記錄還原點資訊**
   - 在 `./implement-revert-point.txt` 記錄：
     ```
     執行時間：{timestamp}
     調整功能：{Feature Name}
     調整類型：新增功能 / 調整功能
     備份目錄：./backups/{timestamp}_{FEATURE_NAME}/
     備份檔案清單：
     - {檔案路徑 1}
     - {檔案路徑 2}
     ...
     ```

### 步驟 2：記錄變更（實作後）

在完成實作後，AI 必須：

#### 2.1 記錄到 diff.md

在 feature 目錄或專案根目錄建立/更新 `diff.md`，記錄以下內容：

```markdown
# Feature {FEATURE_NAME} 變更記錄

執行時間：{timestamp}
Feature Name：{FEATURE_NAME}
調整類型：新增功能 / 調整功能
備份目錄：./backups/{timestamp}_{FEATURE_NAME}/

## 變更摘要

### 新增的檔案
- {檔案路徑}
  - 說明：{檔案用途說明}

### 修改的檔案
- {檔案路徑}
  - 變更類型：新增/刪除/修改
  - 變更說明：{重點變更摘要}
  - 主要變更：
    - {具體變更點 1}
    - {具體變更點 2}
  - 備份位置：`./backups/{timestamp}_{FEATURE_NAME}/{檔案路徑}`

### 刪除的檔案
- {檔案路徑}
  - 說明：{刪除原因}
  - 備份位置：`./backups/{timestamp}_{FEATURE_NAME}/{檔案路徑}`

## 還原方式

### 步驟 1：刪除新增的檔案

```bash
# 刪除所有新增的檔案（如果不需要保留）
rm {新增檔案路徑1} {新增檔案路徑2}
```

### 步驟 2：恢復備份檔案

```bash
# 從備份目錄恢復修改的檔案
cp ./backups/{timestamp}_{FEATURE_NAME}/{檔案路徑} {原檔案路徑}

# 範例：恢復 src/components/Button.vue
cp ./backups/20240116_143022_user-login/src/components/Button.vue src/components/Button.vue
```

### 步驟 3：還原刪除的檔案（如果需要）

```bash
# 從備份目錄恢復刪除的檔案
cp ./backups/{timestamp}_{FEATURE_NAME}/{檔案路徑} {原檔案路徑}
```

### 快速還原腳本（選用）

如果備份了多個檔案，可以使用以下腳本一次性還原：

```bash
#!/bin/bash
BACKUP_DIR="./backups/{timestamp}_{FEATURE_NAME}"

# 恢復所有備份檔案
find "$BACKUP_DIR" -type f | while read backup_file; do
    # 計算相對路徑
    relative_path="${backup_file#$BACKUP_DIR/}"
    original_file="$relative_path"
    
    # 確保目錄存在
    mkdir -p "$(dirname "$original_file")"
    
    # 恢復檔案
    cp "$backup_file" "$original_file"
    echo "恢復：$original_file"
done

echo "還原完成！"
```

### 清理備份（還原後選用）

如果確認還原成功且不需要備份，可以刪除備份目錄：

```bash
rm -rf ./backups/{timestamp}_{FEATURE_NAME}/
```

## 還原點資訊

還原點檔案：`./implement-revert-point.txt`
- 備份目錄：`./backups/{timestamp}_{FEATURE_NAME}/`
- 備份檔案總數：{數量}

## 驗證還原

還原後，請執行以下命令驗證：
- `npm run build`（如果適用）
- 檢查功能是否恢復到執行前狀態
- 檢查 Git 狀態：`git status`（如果有 Git 儲存庫）
```

#### 2.2 記錄詳細變更（選用）

如果專案有 Git 儲存庫，可以記錄 `git diff` 輸出（僅作為參考，不會實際 commit）：

```markdown
## Git Diff 參考（僅記錄，不會 commit）

\`\`\`diff
{git diff 輸出內容}
\`\`\`

**注意**：此 diff 僅作為變更記錄參考，不會影響 Git 歷史。
```

#### 2.3 更新 ./implement-revert-point.txt

在檔案末尾追加：
- 完成時間戳記
- 變更檔案總數（新增、修改、刪除）
- diff.md 檔案位置

### 還原執行流程範例

1. **查看還原點資訊**
   ```bash
   cat ./implement-revert-point.txt
   ```

2. **查看變更記錄**
   ```bash
   cat diff.md
   ```

3. **執行還原**
   ```bash
   # 單一檔案還原
   cp ./backups/20240116_143022_user-login/src/components/Button.vue src/components/Button.vue
   
   # 或使用還原腳本（批量還原）
   bash restore.sh
   ```

4. **驗證還原**
   ```bash
   npm run build  # 確認專案可以正常編譯
   ```

## 實作後回覆

完成後，請回覆並且將以下內容記錄到兩個地方：
- **Update.md**：專案更新摘要
- **diff.md**：詳細變更記錄和還原資訊（見上方「還原機制」說明）

### Update.md 內容

1. **實際修改的檔案清單（含重點摘要）**
   - 列出所有實際修改的檔案
   - 針對每個檔案提供重點變更摘要

2. **驗收指令與預期結果**
   - 提供可執行的驗收指令
   - 說明預期的執行結果

3. **若失敗最可能的原因與修正方向**
   - 分析可能的失敗原因
   - 提供修正建議

### diff.md 內容

**重要**：必須按照「還原機制：步驟 2」的格式，詳細記錄所有變更和還原方式。

### changelog_{FEATURE_NAME}_{timestamp}.md 內容（僅 SDD 專案）

**重要**：此記錄**僅適用於 SDD 專案模式**。必須按照「文件更新機制：Changelog 格式」的格式，詳細記錄所有文件更新內容。

### 還原點確認

完成後，AI 必須告知使用者：

**共同資訊**（兩種模式都需要）：
- **還原點位置**：`./implement-revert-point.txt`
- **備份目錄**：`./backups/{timestamp}_{FEATURE_NAME}/`
- **變更記錄位置**：`diff.md`
- **還原方式**：查看 `diff.md` 中的「還原方式」章節