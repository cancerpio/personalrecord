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
            if (this._initPromise) {
                return this._initPromise;
            }

            this._initPromise = (async () => {
                try {
                    // MOCK mode: skip real LIFF initialization
                    if (import.meta.env.VITE_MOCK_LIFF_TOKEN === 'true') {
                        console.warn('[LIFF] Running in MOCK mode. Real LIFF initialization bypassed.');
                        this.isInit = true;
                        this.isLoggedIn = true;
                        this.profile = { userId: 'U_mock_user_123', displayName: 'Mock User' };
                        return;
                    }

                    if (!this.liffId) {
                        throw new Error('VITE_LIFF_ID is not defined in .env');
                    }

                    // Step 1: Init WITHOUT withLoginOnExternalBrowser.
                    // withLoginOnExternalBrowser uses sessionStorage for its anti-loop flag, but on iOS Safari
                    // the LINE app intercepts the OAuth URL via universal link and may open a fresh Safari
                    // context, wiping sessionStorage. We implement the anti-loop manually with localStorage.
                    console.log('[LIFF] Calling liff.init()...');
                    await liff.init({ liffId: this.liffId });
                    this.isInit = true;
                    console.log('[LIFF] liff.isInClient():', liff.isInClient(), '| liff.isLoggedIn():', liff.isLoggedIn());

                    // Step 2: Already authenticated — LIFF token persists in its own localStorage entries
                    if (liff.isLoggedIn()) {
                        localStorage.removeItem('PR_LIFF_LOGIN_ATTEMPTING');
                        this.isLoggedIn = true;
                        this.profile = await liff.getProfile();
                        console.log('[LIFF] Authenticated as:', this.profile?.displayName);
                        return;
                    }

                    // Step 3: Inside LINE WebView but not logged in — unexpected, surface error instead of looping
                    if (liff.isInClient()) {
                        console.warn('[LIFF] Inside LINE client but not logged in — unexpected.');
                        this.error = 'Authentication failed inside LINE client.';
                        return;
                    }

                    // Step 4: External browser (Safari). Check localStorage anti-loop flag before redirecting.
                    const LOGIN_ATTEMPT_KEY = 'PR_LIFF_LOGIN_ATTEMPTING';
                    const LOGIN_ATTEMPT_TTL_MS = 3 * 60 * 1000; // 3 minutes

                    const rawFlag = localStorage.getItem(LOGIN_ATTEMPT_KEY);
                    if (rawFlag) {
                        let flagData = null;
                        try { flagData = JSON.parse(rawFlag); } catch { localStorage.removeItem(LOGIN_ATTEMPT_KEY); }

                        if (flagData?.ts && (Date.now() - flagData.ts) < LOGIN_ATTEMPT_TTL_MS) {
                            // Recent login attempt but still not logged in — block re-login to break the loop
                            console.error('[LIFF] Login attempted recently but still not logged in. Blocking loop.');
                            this.error = 'Login failed or was cancelled. Please try again.';
                            localStorage.removeItem(LOGIN_ATTEMPT_KEY); // Clear so user can retry on next load
                            return;
                        } else {
                            // Stale flag — clear and allow fresh attempt
                            console.log('[LIFF] Stale login flag cleared.');
                            localStorage.removeItem(LOGIN_ATTEMPT_KEY);
                        }
                    }

                    // Step 5: Write flag BEFORE redirect so it survives the iOS context switch
                    localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify({ ts: Date.now() }));
                    console.log('[LIFF] Anti-loop flag written. Calling liff.login()...');
                    liff.login();
                    // Page will redirect to LINE OAuth — execution stops here

                } catch (error) {
                    console.error('[LIFF] initLiff() failed:', error);
                    this.error = error.message;
                } finally {
                    this._initPromise = null;
                }
            })();

            return this._initPromise;
        }
    }
});
