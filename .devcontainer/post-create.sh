#!/usr/bin/env bash
# 容器建立後執行一次。
# 最後一步會收斂 sudo —— 必須是最後，因為：
#   1. devcontainer features 疊在 Dockerfile 之上、以 root 執行，會把 NOPASSWD:ALL 寫回來，
#      所以收斂不能放在 Dockerfile。
#   2. 收斂之後這個腳本自己也不能再用 sudo 做別的事。
set -euo pipefail

SP=/opt/superpowers
RULES_FILE="${PWD}/AGENTS.md"
MARK="# >>> agent-sandbox-kit >>>"

# ---------- git ----------
# devcontainer CLI（devcontainer up / exec）不會像 VS Code 的
# Dev Containers 擴充那樣複製主機 .gitconfig，所以 identity 一定要自己設，
# 否則 agent 完全無法 commit。
git config --global user.name  "${GIT_USER_NAME:-agent}"
git config --global user.email "${GIT_USER_EMAIL:-agent@localhost}"
git config --global --add safe.directory '*'
# 第二層保險：即使有人不透過 agent-wt、直接下 git worktree add，也走相對路徑。
git config --global worktree.useRelativePaths true

# 相對路徑 worktree 需要 repo 先在「主機」上 bootstrap 過。
#
# 為什麼不是設 worktree.useRelativePaths：那只寫 [worktree] 區段，是普通設定。
# 真正需要的是這兩個，而它們是 `worktree add --relative-paths` 執行當下才寫的：
#   core.repositoryformatversion = 1   （git 規定：宣告任何 extensions.* 就必須是 1）
#   extensions.relativeworktrees = true
# 而 .git/config 在容器內是唯讀掛載（防止 agent 用 core.hooksPath 繞過
# .git/hooks 的唯讀保護），寫不進去 → worktree add 失敗 → agent-wt 不能用。
# 所以那一次性的寫入必須在主機上先做掉。
if [ "$(git config --get core.repositoryformatversion)" != "1" ] \
   || [ "$(git config --get extensions.relativeworktrees)" != "true" ]; then
  cat >&2 <<'MSG'
[post-create] 這個 repo 還沒 bootstrap，agent-wt 會失敗。
              請在「主機」上執行一次（之後永久有效）：
                git worktree add --relative-paths -b _bootstrap .worktrees/_bootstrap
                git worktree remove .worktrees/_bootstrap && git branch -d _bootstrap
MSG
fi

# ---------- superpowers ----------
if [ ! -d "$SP/skills" ]; then
  echo "[post-create] WARN: $SP/skills 不存在。" >&2
  echo "              請確認主機 ~/.agent-skills/superpowers 已 clone 客製化 superpowers。" >&2
fi

# ---------- Codex ----------
if command -v codex >/dev/null; then
  mkdir -p "$HOME/.codex" "$HOME/.agents/skills"
  if ! grep -q 'sandbox_mode' "$HOME/.codex/config.toml" 2>/dev/null; then
    cat >> "$HOME/.codex/config.toml" <<'TOML'
# 容器本身就是隔離邊界，不再疊 Codex 內層 sandbox
sandbox_mode    = "danger-full-access"
approval_policy = "never"
TOML
  fi
  ln -sfn "$SP/skills" "$HOME/.agents/skills/superpowers"   # Codex 原生 skill 探索路徑
fi

# ---------- shell 啟動守衛 ----------
# 用 function 而非 alias，才能在啟動前檢查防火牆狀態。
# 這是防呆，不是安全控制（agent 仍可直接呼叫 claude / codex）。
for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  [ -f "$rc" ] || continue
  grep -qF "$MARK" "$rc" && continue
  cat >> "$rc" <<'RC'
# >>> agent-sandbox-kit >>>
_agent_guard() {
  [ -f /run/firewall-ok ] && return 0
  [ "${ALLOW_NO_FIREWALL:-0}" = "1" ] && return 0
  echo "防火牆未就緒，拒絕啟動 agent。檢查：sudo /usr/local/share/init-firewall.sh" >&2
  return 1
}
cc() {
  _agent_guard || return 1
  local extra=()
  [ -d /opt/superpowers/.claude-plugin ] && extra+=(--plugin-dir /opt/superpowers)
  # 用 $AGENT_RULES（唯讀的根目錄副本），不是 ./AGENTS.md——在 worktree 裡
  # 後者是可寫的 checkout，agent 改得動自己的規則。
  [ -r "${AGENT_RULES:-}" ] && extra+=(--append-system-prompt "$(cat "$AGENT_RULES")")
  claude --dangerously-skip-permissions "${extra[@]}" "$@"
}
cx() {
  _agent_guard || return 1
  codex --dangerously-bypass-approvals-and-sandbox "$@"
}
# <<< agent-sandbox-kit <<<
RC
done

echo "[post-create] 完成。用 cc / cx 啟動 agent，用 agent-wt 開平行 worktree。"

# ---------- 最後一步：收斂 sudo ----------
# 目標：agent 只能執行防火牆腳本，且不能帶參數（帶參數就能指向自己寫的全放行清單）。
# sudoers 裡命令後面的 "" 表示「只允許不帶任何參數」。
# 注意兩個路徑之間不可有逗號，否則會被當成兩個獨立命令，參數限制就失效。
if [ "${AGENT_SUDO:-false}" != "true" ]; then
  sudo bash -s <<'ROOT'
set -euo pipefail
rm -f /etc/sudoers.d/*                      # 清掉 features 可能寫回來的 NOPASSWD:ALL
gpasswd -d vscode sudo   2>/dev/null || true
gpasswd -d vscode wheel  2>/dev/null || true
printf '%s\n' 'vscode ALL=(root) NOPASSWD: /usr/local/share/init-firewall.sh ""' \
  > /etc/sudoers.d/vscode-firewall
chmod 0440 /etc/sudoers.d/vscode-firewall
visudo -c -q                                # 語法錯誤會鎖死 sudo，先驗證
ROOT
  echo "[post-create] sudo 已收斂：僅允許 init-firewall.sh（不帶參數）。"
else
  echo "[post-create] AGENT_SUDO=true：agent 保有完整 sudo，可自行關閉防火牆。" >&2
fi
