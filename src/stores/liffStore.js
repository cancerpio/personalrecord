import { defineStore } from 'pinia';
import liff from '@line/liff';

export const useLiffStore = defineStore('liff', {
    state: () => ({
        liffId: import.meta.env.VITE_LIFF_ID || '',
        isInit: false,
        isLoggedIn: false,
        profile: null,
        error: null
    }),
    actions: {
        async initLiff() {
            if (this.isInit) return; // Already initialized

            try {
                // If mock token is explicitly enabled, we skip real liff initialization
                if (import.meta.env.VITE_MOCK_LIFF_TOKEN === 'true') {
                    console.warn('[LIFF Store] Running in MOCK mode. Real LIFF initialization bypassed.');
                    this.isInit = true;
                    this.isLoggedIn = true;
                    this.profile = { userId: 'U_mock_user_123', displayName: 'Mock User' };
                    return;
                }

                if (!this.liffId) {
                    throw new Error('VITE_LIFF_ID is not defined in .env');
                }

                await liff.init({ liffId: this.liffId });
                this.isInit = true;

                if (liff.isLoggedIn()) {
                    this.isLoggedIn = true;
                    this.profile = await liff.getProfile();
                } else {
                    // Automatically redirect to login if we are not in LINE Client
                    liff.login();
                }
            } catch (error) {
                console.error('LIFF initialization failed', error);
                this.error = error.message;
            }
        }
    }
});
