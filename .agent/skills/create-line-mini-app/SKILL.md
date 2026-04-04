---
name: create-line-mini-app (v1.0)
description: Create a fully configured Vue 3 + Vite + TypeScript project for LINE Mini App, with Liquid Glass UI system and LIFF SDK pre-integrated.
---

# Create LINE Mini App Skill

This skill is designed to standardize the initialization process for new LINE Mini App projects. It sets up a Vue 3 environment, configures Vite with proxies, installs necessary dependencies (LIFF, Pinia, Router), and applies the signature "Liquid Glass" UI design system.

## Prerequisites
- Node.js 18+ installed.
- npm or pnpm available.
- A LINE Developer Console channel created (for LIFF ID).

## Workflow Steps

### Step 1: Initialize Project Scaffolding
Use `npm create vite@latest` to generate the base structure.
- **Framework**: Vue
- **Variant**: TypeScript

```bash
npm create vite@latest frontend -- --template vue-ts
cd frontend
npm install
```

### Step 2: Install Core Dependencies
Install essential libraries for a modern LINE Mini App.

```bash
# Core
npm install @line/liff pinia vue-router lucide-vue-next
# Dev Tools (Tailwind + Types)
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### Step 3: Configure Vite (Proxy & Alias)
Update `vite.config.ts` to support path aliases (`@/`) and local development proxy.

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Local Backend (Firebase/Python)
        changeOrigin: true
      }
    }
  }
})
```

### Step 4: Inject "Liquid Glass" UI System
Create `src/assets/main.css` (or `index.css`) with the following signature styles. 
Ensure to verify `src/main.ts` imports this CSS file.

**Key CSS Variables:**
```css
:root {
  --color-primary: #10b981; /* Emerald 500 */
  --color-bg-gradient-start: #e0f2fe; /* Light Blue */
  --color-bg-gradient-end: #f0fdf4; /* Light Green */
  --glass-bg: rgba(255, 255, 255, 0.65);
  --glass-border: 1px solid rgba(255, 255, 255, 0.4);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  --radius-lg: 24px;
  --radius-md: 16px;
}

body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end));
  min-height: 100vh;
  color: #1f2937;
}

/* Glass Components */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--radius-lg);
}

.glass-input {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  outline: none;
}
```

### Step 5: Setup LIFF Initialization (Store)

#### 🚨 CRITICAL: Supported Entry Points (設計前提)

**本 skill 的設計目標支援以下組合：**
- **手機（iPhone / Android）**：從 LINE 聊天室點 `miniapp.line.me/xxx` 連結，在 LINE WebView 內執行
- **桌機**：直接在瀏覽器開 Endpoint URL（GitHub Pages、Verda 等）

**不支援、且無法用 code 修復的場景：**
> **iPhone Safari 直接輸入 Endpoint URL** 會造成無限 loop。
> iOS 裝了 LINE app 後，LINE 的 OAuth URL 會被 iOS Universal Link 機制攔截，強制切換到 LINE app 處理，再開一個全新的 Safari context 回來。新 context 清掉 sessionStorage，所有防迴圈機制失效。這是 iOS 系統層級行為，JavaScript 無法繞過。

**注意：** `miniapp.line.me` 和 `liff.line.me` 在桌機瀏覽器只會顯示 QR code，這是 LINE Mini App 的設計規格，不是 bug。

---

Create `src/stores/liff.ts` using Pinia to manage LIFF state.

```typescript
import { defineStore } from 'pinia';
import liff from '@line/liff';

export const useLiffStore = defineStore('liff', {
  state: () => ({
    liffId: import.meta.env.VITE_LIFF_ID || '',
    isInit: false,
    isLoggedIn: false,
    profile: null as any,
    error: null as string | null,
    _initPromise: null as Promise<void> | null
  }),
  actions: {
    async init() {
      if (this.isInit) return;

      // Concurrency Lock: Prevent multiple components from calling liff.init() simultaneously.
      // Without this, concurrent calls share the same ?code= param and the second call
      // gets HTTP 400 "invalid authorization code" from LINE API.
      if (this._initPromise) return this._initPromise;

      this._initPromise = (async () => {
        if (!this.liffId) return;
        try {
          await liff.init({ liffId: this.liffId });
          this.isInit = true;

          if (liff.isLoggedIn()) {
            this.isLoggedIn = true;
            this.profile = await liff.getProfile();
          } else {
            // LINE WebView: LIFF handles auth automatically before reaching here.
            // Desktop browser: triggers OAuth in the same tab, no issues.
            // ⚠️ iPhone Safari (external browser): NOT a supported entry point.
            //    Users on iPhone should always open the app from within LINE.
            liff.login();
          }
        } catch (err: any) {
          console.error('LIFF Init Failed', err);
          this.error = err.message;
        } finally {
          this._initPromise = null;
        }
      })();

      return this._initPromise;
    }
  }
});
```

> **🔥 CRITICAL SECURITY & AUTHENTICATION NOTE FOR MINI APPS:**
> LINE Mini App channels often do not have the `openid` scope granted by default (especially for unverified channels outside of Japan). Without `openid`, `liff.getIDToken()` will strictly return `null`.
> **Solution:** Do NOT use `liff.getIDToken()`. Use **`liff.getAccessToken()`** instead.

#### Authentication Implementation Code

**1. Frontend API Service (`src/services/api.ts`)**
```typescript
import liff from '@line/liff';

export const fetchWithLiff = async (endpoint: string, options: RequestInit = {}) => {
  const token = liff.getAccessToken(); // Use Access Token!
  if (!token) throw new Error("LIFF Access Token not found");

  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  return fetch(`/api/v1${endpoint}`, { ...options, headers });
};
```

**2. Backend Express Middleware (`backend/src/middleware/liffAuth.ts`)**
```typescript
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export const liffAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
    }
    const token = authHeader.split(' ')[1];

    try {
        // Step 1: Verify Channel ID to prevent token spoofing from other apps
        const verifyRes = await axios.get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`);
        if (verifyRes.data.client_id !== process.env.LINE_CLIENT_ID) {
            return res.status(401).json({ error: 'Channel ID mismatch' });
        }

        // Step 2: Extract real User Profile
        const profileRes = await axios.get('https://api.line.me/v2/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Inject userId into request for downstream controllers
        req.user = { userId: profileRes.data.userId };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid LINE Access Token' });
    }
};
```

### Step 6: Design Custom Navigation UI (Critical Constraint)
**IMPORTANT LINE Mini App Context**: When embedded within LINE, the app runs in a "LIFF Browser" overlay. This environment **removes all native browser navigation toolbars** (like iOS Safari's bottom bar with Back/Forward/Tabs). The only native control provided by LINE is a top Header that usually contains a close or share button.
- **Problem: Double Header**: If you build a persistent Top Navbar in your Web App for typical SPA navigation, it will stack directly under the LINE native Header, creating a bulky "Double Header" that wastes vertical screen space and looks unprofessional.
- **Solution (Plan B Architecture)**: Implement a dynamic navigation system:
  1.  **Bottom Tab Bar**: Use this for top-level root navigation (e.g., Home, Search, Profile).
  2.  **Dynamic Top Navbar**: Create a custom Top Navbar with a `< Back` button, but **ONLY render it on deep sub-pages** (e.g., `v-if="!isRootPage"`). On root pages, hide it completely so the content sits flush under the LINE native Header.
  3.  **Vue Router History Edge-Case**: When the user clicks `< Back`, use `router.back()`. However, beware of direct deep-linking or page refreshes on sub-pages where `window.history.length === 1`. In those cases, provide a fallback (e.g., `router.push('/')`) to prevent the user from getting trapped.

### Step 7: Wire Up main.ts (Initialization Order is Critical)

**LIFF must initialize BEFORE Vue Router is mounted.**

桌機走 OAuth 流程時，LINE 會把 auth code 放在 URL query string（`?code=xxx&liff.state=...`）。如果 Router 先跑，它的 redirect（`/ → /dashboard`）會覆寫 URL，把這些參數洗掉，LIFF 就拿不到 auth code，導致認證失敗並再次觸發登入。

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useLiffStore } from './stores/liff'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const liffStore = useLiffStore()

// Init LIFF first, then mount router
liffStore.init().finally(async () => {
  app.use(router)
  await router.isReady() // Wait for initial redirect (e.g. / → /dashboard) before mounting
  app.mount('#app')
})
```

### Step 8: Final Verification
- Create a `.env` file with `VITE_LIFF_ID=YOUR_LIFF_ID`.
- Run `npm run dev` and verify the page loads with the gradient background.
- **Test on iPhone by opening the app from a LINE chat message** (not by typing the URL in Safari).

### Step 9: Security & Common Channel Migration Gotchas

**⚠️ 1. The Provider UserID Isolation Trap**
A common scenario is developers creating a new Mini App Channel under a DIFFERENT "Provider" in the LINE Console.
- **Rule**: `userId` (e.g. `U1234abcd...`) is scoped by **Provider**, not by user phone or email. 
- **Consequence**: If you switch to a new Provider, the exact same LINE user will be assigned a completely new `userId`. Any existing records saved in a backend database (like Firestore/MongoDB) keyed by the old `userId` will appear "missing" when they log in via the new Mini App.

**⚠️ 2. The Backend API 401 Unauthorized Trap**
If you update your frontend's `.env` with a new `VITE_LIFF_ID` (Channel ID), you MUST also update your backend server's environment variables.
- **Rule**: The backend auth middleware (`liffAuthMiddleware`) verifies that the access token's `client_id` matches the backend's `LINE_CLIENT_ID` env variable.
- **Consequence**: If you forget to update the backend's `LINE_CLIENT_ID`, the backend will reject the new frontend's valid token with a `401 Unauthorized` error (Channel ID mismatch), causing API calls to silently fail and components to render empty data.
