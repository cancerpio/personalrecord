#!/usr/bin/env bash
# 容器建立後執行一次。
#
# 最後一步收斂 sudo，而且必須是最後：devcontainer features 疊在 Dockerfile 之上、
# 以 root 執行，會把 NOPASSWD:ALL 寫回來；而收斂之後這支腳本自己也不能再用 sudo。
set -euo pipefail

# ---- git ----
# devcontainer CLI 不像 VS Code 的擴充那樣複製主機 .gitconfig，identity 要自己設，
# 否則 agent 完全無法 commit。
git config --global user.name  "${GIT_USER_NAME:-agent}"
git config --global user.email "${GIT_USER_EMAIL:-agent@localhost}"
git config --global --add safe.directory '*'
# 讓主機端也能操作容器建出來的 worktree（見 docs/agent-sandbox.md）
git config --global worktree.useRelativePaths true

# ---- Codex ----
# 容器就是隔離邊界，不再疊 Codex 的內層沙箱。
# 這段不能寫在 Dockerfile：$CODEX_HOME 是 named volume，會蓋掉 image 裡的內容。
if ! grep -qs sandbox_mode "${CODEX_HOME}/config.toml"; then
  mkdir -p "$CODEX_HOME"
  printf 'sandbox_mode    = "danger-full-access"\napproval_policy = "never"\n' \
    >> "${CODEX_HOME}/config.toml"
fi

# ---- 本專案：node_modules ----
# 它是 named volume。主機是 macOS，npm 裝出來的原生 binary 是 darwin-arm64，
# 直接掛進 Linux 容器會找不到 binding。volume 預設 root 擁有，先交還。
sudo chown "$(id -u):$(id -g)" node_modules
npm ci --no-audit --no-fund

# ---- 最後：收斂 sudo ----
# sudoers 裡命令後面的 "" 表示「只允許不帶任何參數」。不釘死參數的話，agent 可以
# 指向自己寫的全放行清單重建防火牆，收斂就形同無效。
sudo bash -s <<'ROOT'
set -euo pipefail
rm -f /etc/sudoers.d/*                 # 清掉 features 寫回來的 NOPASSWD:ALL
gpasswd -d vscode sudo 2>/dev/null || true
printf '%s\n' 'vscode ALL=(root) NOPASSWD: /usr/local/share/init-firewall.sh ""' \
  > /etc/sudoers.d/agent-firewall
chmod 0440 /etc/sudoers.d/agent-firewall
visudo -c -q                           # 語法錯誤會鎖死 sudo，先驗證
ROOT

echo "[post-create] 完成。cc = Claude、cx = Codex、agent-wt new <name> 開平行 agent。"
