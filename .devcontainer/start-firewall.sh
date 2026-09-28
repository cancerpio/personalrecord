#!/usr/bin/env bash
# postStartCommand 用：依 ENABLE_FIREWALL 決定啟動防火牆或明確跳過。
# 放在 image 內，agent 改不到。
set -uo pipefail

if [ "${ENABLE_FIREWALL:-1}" = "1" ]; then
  sudo /usr/local/share/init-firewall.sh
else
  cat >&2 <<'MSG'
[firewall] ENABLE_FIREWALL=0 —— 防火牆未啟動。
           agent 啟動守衛會擋下 cc / cx / agent-wt。
           若確定要在無防火牆狀態下跑（例如第一次登入排錯），
           在 devcontainer.json 的 containerEnv 一併設 ALLOW_NO_FIREWALL=1。
MSG
fi
