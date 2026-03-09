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
Create `src/stores/liff.ts` using Pinia to manage LIFF state.

```typescript
import { defineStore } from 'pinia';
import liff from '@line/liff';

export const useLiffStore = defineStore('liff', {
  state: () => ({
    liffId: import.meta.env.VITE_LIFF_ID || '',
    isLoggedIn: false,
    profile: null as any
  }),
  actions: {
    async init() {
      if (!this.liffId) return;
      try {
        await liff.init({ liffId: this.liffId });
        if (liff.isLoggedIn()) {
          this.isLoggedIn = true;
          this.profile = await liff.getProfile();
        } else {
             // For Mini App, auto login usually happens inside LINE
             // For external browser, might need liff.login()
        }
      } catch (err) {
        console.error('LIFF Init Failed', err);
      }
    }
  }
});
```

### Step 6: Design Custom Navigation UI (Critical Constraint)
**IMPORTANT LINE Mini App Context**: When embedded within LINE, the app runs in a "LIFF Browser" overlay. This environment **removes all native browser navigation toolbars** (like iOS Safari's bottom bar with Back/Forward/Tabs). The only native control provided by LINE is a top Header that usually contains a close or share button.
- **Problem: Double Header**: If you build a persistent Top Navbar in your Web App for typical SPA navigation, it will stack directly under the LINE native Header, creating a bulky "Double Header" that wastes vertical screen space and looks unprofessional.
- **Solution (Plan B Architecture)**: Implement a dynamic navigation system:
  1.  **Bottom Tab Bar**: Use this for top-level root navigation (e.g., Home, Search, Profile).
  2.  **Dynamic Top Navbar**: Create a custom Top Navbar with a `< Back` button, but **ONLY render it on deep sub-pages** (e.g., `v-if="!isRootPage"`). On root pages, hide it completely so the content sits flush under the LINE native Header.
  3.  **Vue Router History Edge-Case**: When the user clicks `< Back`, use `router.back()`. However, beware of direct deep-linking or page refreshes on sub-pages where `window.history.length === 1`. In those cases, provide a fallback (e.g., `router.push('/')`) to prevent the user from getting trapped.

### Step 7: Final Verification
- Ensure `src/main.ts` setups Pinia and Router.
- Create a `.env` file with `VITE_LIFF_ID=YOUR_LIFF_ID`.
- Run `npm run dev` and verify the page loads with the gradient background.
