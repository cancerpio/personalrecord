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
    - Once the workflow completes, your site will be live at: `https://<your-username>.github.io/personalrecord/`
    - (e.g., `https://cancerpio.github.io/personalrecord/`)

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
