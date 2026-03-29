import { defineStore } from 'pinia';
import liff from '@line/liff';

export const useLiffStore = defineStore('liff', {
    state: () => ({
        liffId: import.meta.env.VITE_LIFF_ID || '',
        isInit: false,
        isLoggedIn: false,
        profile: null,
        error: null,
        _initPromise: null // Promise lock for concurrency
    }),
    actions: {
        async initLiff() {
            if (this.isInit) return; // Already initialized
            
            // Если инициализация уже началась, ждем ее окончания (防止併發重複呼叫)
            if (this._initPromise) {
                return this._initPromise;
            }

            this._initPromise = (async () => {
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
                        // To prevent iOS Safari "Open in LINE" infinite loop and Hash URL loss,
                        // we MUST provide a clean redirectUri without trailing hash.
                        const cleanRedirectUri = window.location.origin + window.location.pathname;
                        console.log('[LIFF Store] Redirecting to:', cleanRedirectUri);
                        liff.login({ redirectUri: cleanRedirectUri });
                    }
                } catch (error) {
                    console.error('LIFF initialization failed', error);
                    this.error = error.message;
                } finally {
                    this._initPromise = null;
                }
            })();

            return this._initPromise;
        }
    }
});
