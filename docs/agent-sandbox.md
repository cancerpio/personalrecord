# Agent 沙箱（devcontainer）

讓 Claude Code 和 Codex 在隔離的容器裡**全權限執行、不問授權**，並且可以同時開多個
agent 平行做事。容器是邊界，所以兩個 agent 都以 bypass 模式跑。

適用對象：**你自己信任的 repo**。不要拿它跑來路不明的程式碼（理由見最後一節）。

---

## 第一次設定

### 每台機器做一次

```bash
# 1. git 需要 >= 2.48（相對路徑 worktree）
brew install git && git --version

# 2. 讓容器讀得到 superpowers skills（容器內唯讀掛載）
mkdir -p ~/.agent-skills
ln -sfn ~/.claude/plugins/cache/claude-plugins-official/superpowers/<版本> \
        ~/.agent-skills/superpowers
```

superpowers 升版後那個版本號目錄會換，重跑一次 `ln -sfn` 指到新版即可。

### 每個 repo 做一次（bootstrap）

```bash
git worktree add --relative-paths -b _bootstrap .worktrees/_bootstrap
git worktree remove .worktrees/_bootstrap && git branch -d _bootstrap
```

**這一步不能省。** 它會把 `.git/config` 升級成：

```ini
[core]
    repositoryformatversion = 1
[extensions]
    relativeworktrees = true
```

容器內 `.git/config` 是唯讀掛載的（防止 agent 用 `core.hooksPath` 繞過 `.git/hooks`
的保護），所以這個寫入必須在主機先做掉，否則 `agent-wt new` 會失敗於
`could not write config file .git/config`。

`personalrecord` 已經 bootstrap 過了，不用再做。

---

## 每次要用

```bash
# 1. 起容器（第一次會 build，之後很快）
npx @devcontainers/cli up   --workspace-folder . --config .devcontainer/devcontainer.json

# 2. 進去
npx @devcontainers/cli exec --workspace-folder . --config .devcontainer/devcontainer.json bash

# 3. 容器內第一次要登入（登入狀態存在 volume，rebuild 才需要重登）
claude          # 瀏覽器回調失敗時，把畫面上的代碼貼回終端機
codex login

# 4. 確認沙箱真的關緊了
verify-sandbox  # 全部 PASS 才往下做

# 5. 開 agent
agent-wt new feat-a claude @prompts/feat-a.md
agent-wt new feat-b codex  @prompts/feat-b.md
agent-wt attach          # tmux 切視窗：Ctrl-b n / Ctrl-b w
```

也可以不用 worktree，直接在容器內跑 `cc`（Claude）或 `cx`（Codex）。

## 收成（在主機上做）

```bash
agent-wt diff feat-a       # 變更統計 + agent 留下的商業問題
git merge agent/feat-a
agent-wt rm feat-a         # 移除 worktree，分支保留
git push
```

---

## 重要：放 agent 進去之前先 push

專案目錄在容器內是**可寫的**（設計如此，agent 要能改程式碼），而 `.git` 也在裡面。
也就是說 agent 有能力砍掉 repo 歷史。`AGENTS.md` 禁止它這樣做，但那是文字約束不是機制。

**沒 push 的 commit 被砍掉就是沒了。** 先 push 再放 agent 進來，最壞情況就只是重新 clone。

---

## 這個沙箱擋得住什麼

| | 狀態 |
|---|---|
| 誤碰專案外的檔案（`~/.ssh`、其他 repo） | ✅ 容器邊界 |
| 弄壞開發環境（nvm、全域 CLI） | ✅ 容器邊界 |
| 一直要按授權 | ✅ 兩個 agent 都 bypass，容器當邊界 |
| 把東西往外送 | ⚠️ 出站白名單，但**IP 粒度**且**無紀錄** |
| 改到會在主機執行的檔案 | ✅ `.git/config`、`.git/hooks`、`.devcontainer/`、`AGENTS.md`、`.mcp.json`、`.claude/` 唯讀掛載 |
| `git push` | ✅ 容器內沒有憑證（沒掛 `~/.ssh`、無 credential helper） |
| 砍掉 `.git` 歷史 | ❌ 設計如此，靠「先 push」 |

### 已知的洞

- **單檔唯讀 mount 會脫鉤，而且是靜默的。** 這是最需要注意的一個。
  `.git/config`、`AGENTS.md`、`.mcp.json` 是**單一檔案**的 bind mount。
  git（還有很多工具）改檔案的方式是「寫 `.lock` 再 rename 蓋過去」，
  也就是**換掉一個新的 inode**。一旦主機那側把檔案換掉，容器裡的 mount 就脫鉤，
  那個檔案**變回可寫**，而且沒有任何錯誤訊息。

  實測過：`.git/config` 在一輪操作後就從 mount 清單消失，容器內 append 成功，
  內容直接寫到主機的檔案上。

  目錄的 bind mount（`.git/hooks`、`.claude/`、`.devcontainer/`）**沒有這個問題**，
  因為目錄不會被 rename 換掉。

  **所以 `verify-sandbox` 必須每次進容器都跑**，不是只跑第一次。它抓得到這個狀況
  （`FAIL .git/config 不可寫`）。修法是重建容器：

  ```bash
  docker rm -f $(docker ps -aq --filter label=devcontainer.local_folder=$PWD)
  npx @devcontainers/cli up --workspace-folder . --config .devcontainer/devcontainer.json
  ```

- **白名單是 IP 粒度。** `init-firewall.sh` 啟動時把網域解析成 IP 放進 ipset，
  同一個 IP 上的其他網域（SNI 共用）擋不住。
- **沒有出站紀錄。** 事後查不出 agent 連過哪裡。要補的話在 `init-firewall.sh`
  最後那條 REJECT 之前加 `-j LOG`。
- **worktree 裡的 `AGENTS.md` 對 Codex 是可寫的。** Claude 這邊已處理（`cc` 讀的是
  `$AGENT_RULES`，指向唯讀的根目錄副本），但 Codex 原生從 cwd 讀 `AGENTS.md`，
  而 worktree 裡那份是可寫的 checkout。
- **憑證可被讀取。** bypass 模式下，惡意專案可以讀到容器內 `~/.claude`、`~/.codex`
  的登入憑證並外洩。這是 Anthropic 官方文件明列的限制，也是「只用於信任的 repo」的原因。

---

## 這個專案的特定設定

### Firestore / firebase MCP 在容器內不可用

`.mcp.json` 裡的 `firebase mcp --dir backend` 在容器內**不會運作**——沒有安裝
firebase CLI，也沒有給憑證。這是刻意的：把正式環境的 Firestore 讀取權放進一個
全權限 agent 的沙箱，正好是「把東西往外送」那條風險。

要用正式資料佐證判斷時，讓 agent 把問題寫進 `.agent/QUESTIONS.md`，你在主機上查。

### node_modules 是 named volume

容器內的 `node_modules` 是獨立的 volume，不是主機那份。因為主機是 macOS，
`npm install` 裝出來的原生 binary 是 darwin-arm64，掛進 Linux 容器會炸：

```
Cannot find module '@rolldown/binding-linux-arm64-gnu'
```

`project-setup.sh` 會在容器建立時跑 `npm ci` 填充它。主機那份完全不受影響，
兩邊可以同時跑。升級依賴後要 rebuild container（或在容器內自己 `npm ci`）。

`agent-wt` 建新 worktree 時會跑 `.worktree-setup.sh`，在那個 worktree 裡也 `npm ci`
一份（約 3 秒）。

### dev server 與平行 agent

每個 worktree 有自己的 `.agent.env`，裡面是依名稱算出的固定 `PORT`：

```bash
source .agent.env
npm run dev -- --host 0.0.0.0 --port $PORT
```

`forwardPorts` 開了 5173（單一 agent 的預設）。平行跑多個時用各自的 `$PORT`，
需要從主機看畫面的話另外 forward。

### LIFF 實機測試要在主機做

LINE 的 LIFF 需要 HTTPS 對外通道，容器內沒有設。要用手機實測就在主機跑 dev server。
容器內能做的是單元測試（`npm test`）與 build（`npm run build`），兩者都不需要對外連線。

### 版本釘死

`.devcontainer/Dockerfile` 裡釘死了兩個 agent 的版本，並關掉自動更新：

```dockerfile
ARG CLAUDE_VERSION=2.1.283
ARG CODEX_VERSION=0.158.0
```

要升版就改這兩行然後 rebuild container。

---

## 檔案

| 路徑 | 作用 |
|---|---|
| `.devcontainer/devcontainer.json` | mount、能力、環境變數、生命週期指令 |
| `.devcontainer/Dockerfile` | base image、工具、兩個 agent（版本釘死） |
| `.devcontainer/init-firewall.sh` | 出站白名單。**fail-closed**：任何一步失敗就全封鎖 |
| `.devcontainer/start-firewall.sh` | `postStartCommand` 用，依 `ENABLE_FIREWALL` 決定啟動或跳過 |
| `.devcontainer/allowed-domains.txt` | 白名單網域（在 image 內，agent 改不到） |
| `.devcontainer/project-setup.sh` | 本專案專屬：chown `node_modules` volume 並 `npm ci`。**必須跑在 `post-create.sh` 之前**（後者最後會收斂 sudo） |
| `.devcontainer/post-create.sh` | git identity、superpowers、`cc`/`cx` 函式、**最後收斂 sudo** |
| `scripts/agent-wt` | worktree + tmux 平行 agent 啟動器 |
| `scripts/verify-sandbox` | 邊界檢查，每次進容器先跑 |
| `AGENTS.md` | agent 的行為規則（容器內唯讀） |
| `.worktree-setup.sh` | 新 worktree 建立後跑 `npm ci` |

### 兩個容易誤解的設計

**沒有 `CLAUDE.md`。** 如果建了，主機上的 Claude Code session 也會載入 `AGENTS.md`，
而那份講的是「你在容器內、權限全開」——在主機上是錯的。容器內改由 `cc` 函式以
`--append-system-prompt` 注入。

**sudo 收斂在 `post-create.sh` 而不是 `Dockerfile`。** devcontainer features 疊在
image 之上、以 root 執行，會把 `NOPASSWD:ALL` 寫回來。所以收斂必須是最後一步。
收斂後 agent 只能執行防火牆腳本**且不能帶參數**（帶參數就能指向自己寫的全放行清單）。
