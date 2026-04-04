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
            if (this.isInit) return;

            // Concurrency lock: prevent multiple components from calling liff.init() simultaneously.
            // Without this, concurrent calls share the same ?code= param and the second call
            // gets HTTP 400 "invalid authorization code" from LINE API.
            if (this._initPromise) {
                return this._initPromise;
            }

            this._initPromise = (async () => {
                try {
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
                        // LINE WebView: LIFF handles auth automatically before reaching here.
                        // Desktop browser: triggers OAuth in the same tab, no issues.
                        // ⚠️ iPhone Safari (external browser): NOT a supported entry point.
                        //    iOS Universal Links will intercept LINE's OAuth URL and open the LINE app,
                        //    creating a new Safari context that breaks the auth flow. Users on iPhone
                        //    should always open the app from within LINE (miniapp.line.me link in chat).
                        liff.login();
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
