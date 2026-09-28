#!/usr/bin/env bash
# personalrecord 專屬的容器初始化。必須跑在 post-create.sh 之前——
# 那支腳本的最後一步會收斂 sudo，之後就不能 chown 了。
set -euo pipefail

# node_modules 是 named volume（見 devcontainer.json）。原因：主機是 macOS，
# 裝出來的原生 binary 是 darwin-arm64，直接掛進 Linux 容器會炸
# （rolldown 的 binding 找不到）。容器要有自己的一份。
# volume 預設是 root 擁有，先交還給 vscode。
if [ -d node_modules ]; then
  sudo chown "$(id -u):$(id -g)" node_modules
fi

echo "[project-setup] npm ci"
npm ci --no-audit --no-fund
