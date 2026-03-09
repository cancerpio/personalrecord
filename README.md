# Personalrecord
 - A training programming website for various types of training, including powerlifting, weightlifting, and aerobic exercise.

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
