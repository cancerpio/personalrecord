# Personalrecord
 - A training programming website for various types of training, including powerlifting, weightlifting, and aerobic exercise.

## 開發

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build
```

## Agent 沙箱（devcontainer）

讓 Claude Code / Codex 在隔離容器內全權限執行、不問授權，可平行開多個 agent。

**放 agent 進去之前先 `git push`** ——容器內 `.git` 是可寫的，沒推上去的 commit 有風險。

```bash
# 起容器 + 進去
npx @devcontainers/cli up   --workspace-folder . --config .devcontainer/devcontainer.json
npx @devcontainers/cli exec --workspace-folder . --config .devcontainer/devcontainer.json bash

# 容器內
claude            # 第一次要登入
codex login       # 第一次要登入
verify-sandbox    # 每次都要跑！全 PASS 才往下做（單檔唯讀 mount 會靜默脫鉤）
agent-wt new feat-a claude @prompts/TEMPLATE.md

# 回主機收成
agent-wt diff feat-a && git merge agent/feat-a && agent-wt rm feat-a
```

首次在**新機器**上使用需要兩個前置步驟（git >= 2.48、superpowers 連結），
新 repo 需要一次 bootstrap。完整說明、擋得住什麼、已知的洞：
**[docs/agent-sandbox.md](docs/agent-sandbox.md)**

## GitHub Actions CI/CD Deployment

This project is configured to deploy automatically to GitHub Pages using GitHub Actions.

### Setup Instructions

1.  **Push the repository to GitHub**:
    Ensure your code is pushed to your GitHub repository (e.g., `https://github.com/cancerpio/personalrecord`).

2.  **Configure GitHub Pages**:
    - Go to your repository on GitHub.
    - Navigate to **Settings** > **Pages**.
    - Under **Build and deployment**, set **Source** to **GitHub Actions** (Beta).

3.  **Trigger Deployment**:
    - A deployment workflow will automatically run whenever you push changes to `main`, `master`, or `mini-app` branches.
    - You can monitor the progress in the **Actions** tab.

4.  **Access Your Site**:
    - Current Production URL: **[https://cancerpio.github.io/personalrecord/](https://cancerpio.github.io/personalrecord/)**

### Troubleshooting: "Branch is not allowed to deploy"

If your deployment fails with `Branch "mini-app" is not allowed to deploy to github-pages due to environment protection rules`, follow these steps:

1.  Go to your GitHub Repository **Settings**.
2.  Select **Environments** from the sidebar.
3.  Click on **github-pages**.
4.  Under **Deployment branches**, click **Manage rules** (or similar) and add your branch name (e.g., `mini-app`) to the allowed list, or choose **No restriction**.

### Important Configuration Note

- **Base Path**: The `vite.config.js` file has `base: '/personalrecord/'` configured. This assumes your repository name is `personalrecord`. If you rename your repository or deploy to a custom domain root, you must update this setting.

## Development Setup

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```
