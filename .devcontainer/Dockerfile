# 三套流程共用的單一 Dockerfile，用 build args 決定要裝哪個 agent
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ARG INSTALL_CLAUDE=true
ARG INSTALL_CODEX=true
ARG NODE_MAJOR=22
# 版本釘死：Anthropic 官方建議用 npm install -g ...@X.Y.Z 而非 devcontainer feature，
# 才能得到可重現的 build（feature 永遠裝 latest）。搭配 DISABLE_AUTOUPDATER=1。
# 要升版就改這兩行然後 rebuild container。
ARG CLAUDE_VERSION=2.1.283
ARG CODEX_VERSION=0.158.0

USER root

# git-core PPA：需要 git >= 2.48 才支援 worktree 相對路徑
RUN apt-get update \
 && apt-get install -y --no-install-recommends software-properties-common \
 && add-apt-repository -y ppa:git-core/ppa \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      git tmux jq ripgrep fd-find curl ca-certificates \
      iptables ipset iproute2 dnsutils aggregate \
 && curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
 && apt-get install -y nodejs \
 && corepack enable \
 && rm -rf /var/lib/apt/lists/*

RUN if [ "$INSTALL_CLAUDE" = "true" ]; then npm i -g "@anthropic-ai/claude-code@${CLAUDE_VERSION}"; fi \
 && if [ "$INSTALL_CODEX"  = "true" ]; then npm i -g "@openai/codex@${CODEX_VERSION}"; fi

# 預先建立 volume 掛載點並設好擁有者，否則 named volume 會是 root 擁有
RUN mkdir -p /home/vscode/.claude /home/vscode/.codex /home/vscode/.agents/skills \
 && chown -R vscode:vscode /home/vscode/.claude /home/vscode/.codex /home/vscode/.agents

# 防火牆腳本與白名單放在 image 內，agent 改不到（workspace 是可寫的）
COPY init-firewall.sh start-firewall.sh /usr/local/share/
COPY allowed-domains.txt /usr/local/share/allowed-domains.txt
RUN chmod 755 /usr/local/share/init-firewall.sh /usr/local/share/start-firewall.sh \
 && chmod 644 /usr/local/share/allowed-domains.txt

# 注意：sudo 收斂不在這裡做。devcontainer features 疊在這個 image 之上、
# 以 root 執行，common-utils 之類的會重新寫入 NOPASSWD:ALL，
# 把這裡做的收斂整個抵銷。所以收斂放在 post-create.sh 的最後一步。

USER vscode
