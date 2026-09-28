# Agent 沙箱（devcontainer）

讓 Claude Code 和 Codex 在隔離容器裡**全權限執行、不問授權**，並可用 git worktree
平行開多個。容器是邊界，所以兩個 agent 都以 bypass 模式跑。

**只用於你自己信任的 repo。** 不可信的第三方程式碼請用 VM 或 cloud session。

---

## 用法

### 每台機器一次

```bash
brew install git        # 需要 >= 2.48（worktree 相對路徑）

# 讓容器讀得到 superpowers skills（容器內唯讀掛載）
mkdir -p ~/.agent-skills
ln -sfn ~/.claude/plugins/cache/claude-plugins-official/superpowers/<版本> \
        ~/.agent-skills/superpowers
```

superpowers 升版後那個版本號目錄會換，重跑一次 `ln -sfn` 指到新版。

### 每次要用

```bash
# 起容器（第一次會 build，之後幾秒）
npx @devcontainers/cli up   --workspace-folder .

# 進去
npx @devcontainers/cli exec --workspace-folder . bash

# 容器內
claude            # 第一次要登入（瀏覽器回調失敗時把代碼貼回終端機）
codex login       # 第一次要登入
verify-sandbox    # 每次都跑，全 PASS 才往下做

cc                # 啟動 Claude
cx                # 啟動 Codex
```

`cc` / `cx` 會在防火牆未就緒時拒絕啟動。

### 平行開多個 agent

```bash
agent-wt new feat-a claude @docs/some-prompt.md
agent-wt new feat-b codex  "把 X 重構成 Y"
tmux attach -t agents        # 切視窗：Ctrl-b n / Ctrl-b w
```

每個 worktree 有自己的分支 `agent/<name>`、自己的 `node_modules`、
以及 `.agent.env` 裡一個不重複的 `PORT`。

**為什麼要 worktree**：沒有的話 agent 和你共用同一個 checkout，
它一切分支你編輯器裡的檔案就整批被換掉。

收成與清理都用原生 git（在主機或容器內都可以）：

```bash
git worktree list
git diff main...agent/feat-a
git merge agent/feat-a
git worktree remove .worktrees/feat-a && git branch -d agent/feat-a
git push
```

---

## 放 agent 進去之前先 push

專案目錄在容器內是可寫的（agent 要能改程式碼），`.git` 也在裡面。
`AGENTS.md` 禁止它砍歷史，但那是文字約束不是機制。

**沒 push 的 commit 被砍掉就是沒了。** 先 push，最壞情況就只是重新 clone。

---

## 擋得住什麼

| | |
|---|---|
| 誤碰專案外的檔案（`~/.ssh`、其他 repo） | ✅ 容器邊界 |
| 弄壞開發環境（nvm、全域 CLI） | ✅ 容器邊界 |
| 一直要按授權 | ✅ 兩個 agent 都 bypass |
| 把東西往外送 | ⚠️ 出站白名單，但 **IP 粒度**且**無紀錄** |
| 改到會在主機執行的檔案 | ✅ `.devcontainer/`、`.git/hooks/`、`.claude/`、`AGENTS.md`、`.mcp.json` 唯讀 |
| `git push` | ✅ 容器內沒有憑證 |
| 關掉防火牆 | ✅ sudo 收斂成只能跑防火牆腳本且不能帶參數 |
| VS Code IPC 逃逸 | ✅ 走 CLI，容器內沒有編輯器 process |
| 砍掉 `.git` 歷史 | ❌ 設計如此，靠「先 push」 |

### 已知的洞

**單檔唯讀 mount 會靜默脫鉤。** `AGENTS.md`、`.mcp.json` 是單一檔案的 bind mount。
工具改檔案常用「寫 `.lock` 再 rename」，換的是 inode；主機那側一旦換掉檔案，
容器裡的 mount 就脫鉤、檔案變回可寫，**沒有任何錯誤訊息**。

目錄的 mount 沒這問題（實測過），所以 `.git/config` 刻意**不**掛——
它被 git 頻繁重寫，掛了也留不住，而且會擋掉 `worktree add`。
它的威脅（`core.hooksPath` 把 hooks 導向可寫目錄）改由 `verify-sandbox` 直接檢查。

最常觸發它的情境很日常：**你在主機上編輯 `AGENTS.md` 或 `.mcp.json`，
它自己的唯讀保護就掉了**（開發這份設定時實測到，一次就中）。

**所以 `verify-sandbox` 要每次進容器都跑。** FAIL 的修法是重建容器：

```bash
docker rm -f $(docker ps -aq --filter label=devcontainer.local_folder=$PWD)
npx @devcontainers/cli up --workspace-folder .
```

**其他**

- 白名單是 IP 粒度：同一個 IP 上的其他網域（SNI 共用）擋不住。
- 沒有出站紀錄，事後查不出連過哪裡。要補就在 `init-firewall.sh` 最後那條 REJECT
  之前加 `-j LOG`。
- 憑證可被讀取：bypass 模式下惡意專案可讀到容器內 `~/.claude`、`~/.codex` 的登入憑證。
  這是 Anthropic 官方明列的限制，也是「只用於信任的 repo」的理由。
- **緊急關閉防火牆**：sudo 已收斂，容器內辦不到。從主機下
  `docker exec -it -u root <容器> bash`。

---

## 這個專案的特定設定

**Firestore / firebase MCP 在容器內不可用。** `.mcp.json` 裡的 `firebase mcp` 沒有
憑證也沒裝 CLI，這是刻意的：把正式 Firestore 的讀取權放進全權限 agent 的沙箱，
正好是「把東西往外送」那條風險。要查資料讓 agent 寫進 `.agent/QUESTIONS.md`，
你在主機查。

**`node_modules` 是 named volume。** 主機是 macOS，`npm install` 裝出來的原生
binary 是 darwin-arm64，掛進 Linux 容器會炸（`Cannot find module
'@rolldown/binding-linux-arm64-gnu'`）。`post-create.sh` 會在容器內 `npm ci`
填充它，主機那份不受影響。升級依賴後要 rebuild container。

**LIFF 實機測試留在主機。** 需要 HTTPS 對外通道，容器沒設。容器內能做的是
`npm test` 和 `npm run build`，兩者都不需要對外連線。

**dev server**：`npm run dev -- --host 0.0.0.0 --port $PORT`（`$PORT` 來自
`.agent.env`）。`forwardPorts` 開了 5173 給單一 agent 用。

**版本釘死**在 `Dockerfile` 的 `CLAUDE_VERSION` / `CODEX_VERSION`，
搭配 `DISABLE_AUTOUPDATER=1`。升版改那兩行再 rebuild。

---

## 檔案

| 路徑 | 行數 | 作用 |
|---|---|---|
| `.devcontainer/devcontainer.json` | 86 | mount、能力、環境變數、生命週期 |
| `.devcontainer/Dockerfile` | 61 | base image、工具、兩個 agent（版本釘死）、`cc`/`cx` |
| `.devcontainer/init-firewall.sh` | 84 | 出站白名單。**fail-closed**：任何一步失敗就全封鎖 |
| `.devcontainer/allowed-domains.txt` | 28 | 白名單網域（在 image 內，agent 改不到） |
| `.devcontainer/post-create.sh` | 45 | git identity、Codex 設定、`npm ci`、**最後收斂 sudo** |
| `scripts/agent-wt` | 84 | `agent-wt new`：worktree + 依賴 + PORT + tmux |
| `scripts/verify-sandbox` | 61 | 邊界檢查，21 項 |
| `AGENTS.md` | 65 | agent 的行為規則（容器內唯讀） |

### 三個容易誤解的設計

**沒有 `CLAUDE.md`。** 建了的話主機上的 Claude session 也會載入 `AGENTS.md`，
而那份講的是「你在容器內、權限全開」——在主機上是錯的。容器內改由 `cc` 以
`--append-system-prompt` 注入，來源是 `$AGENT_RULES`（唯讀的根目錄副本，
不是 worktree 裡那份可寫的 checkout）。

**`cc` / `cx` 是 image 內的執行檔，不是 shell alias。** 因為 `agent-wt` 產生的
runner 是非互動 bash，不會 source `/etc/bash.bashrc`，函式放那裡用不到；
而且烤進 image 後 agent 改不掉。

**sudo 收斂在 `post-create.sh` 而不是 `Dockerfile`。** devcontainer features 疊在
image 之上、以 root 執行，會把 `NOPASSWD:ALL` 寫回來。所以收斂必須是最後一步。
