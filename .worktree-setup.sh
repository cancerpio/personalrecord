#!/usr/bin/env bash
# agent-wt 建立新 worktree 後，在該 worktree 內執行一次。
# 每個 worktree 是獨立的 checkout，需要自己的 node_modules。
set -euo pipefail
echo "[worktree-setup] npm ci"
npm ci --no-audit --no-fund
