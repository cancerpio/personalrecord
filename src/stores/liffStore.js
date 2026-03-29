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

                    // 啟用 LINE SDK 官方的 withLoginOnExternalBrowser，它內建了防無限迴圈的機制
                    await liff.init({ 
                        liffId: this.liffId,
                        withLoginOnExternalBrowser: true
                    });
                    this.isInit = true;

                    if (liff.isLoggedIn()) {
                        this.isLoggedIn = true;
                        this.profile = await liff.getProfile();
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
