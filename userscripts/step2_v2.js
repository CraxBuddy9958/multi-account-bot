// userscripts/step2.injectable.js - Step 2: Save Thread URL & Redirect
(function() {
    'use strict';

    // Only run on thread pages (URLs like https://craxpro.to/threads/...)
    const THREADS_PATTERN = /https:\/\/craxpro\.to\/threads\//;
    if (!THREADS_PATTERN.test(window.location.href)) {
        console.log('[step2] Skipping - not on threads page');
        return;
    }

    console.log('[step2] Running on threads page:', window.location.href);

    // Flag to prevent multiple executions
    if (window.__step2Running) {
        console.log('[step2] Already running, skipping');
        return;
    }
    window.__step2Running = true;

    const currentLink = window.location.href;
    const FIREBASE_URL = "https://craxlinks-bb690-default-rtdb.firebaseio.com/links.json";

    // ---------------------------
    // Firebase Functions
    // ---------------------------
    async function fetchWithFallback(url, options = {}) {
        // Try regular fetch first
        try {
            const r = await fetch(url, options);
            return r;
        } catch (e) {
            console.log('[step2] Regular fetch failed, trying __FETCH_PROXY');
        }

        // Fallback to Puppeteer's exposed function
        if (typeof window.__FETCH_PROXY === 'function') {
            try {
                const text = await window.__FETCH_PROXY(url);
                return {
                    ok: true,
                    text: async () => text,
                    json: async () => JSON.parse(text)
                };
            } catch (e) {
                console.error('[step2] __FETCH_PROXY failed:', e);
            }
        }

        throw new Error('No fetch method available');
    }

    function saveLinkToFirebase(link) {
        console.log('[step2] Saving link to Firebase:', link);

        // First GET existing data
        fetchWithFallback(FIREBASE_URL)
            .then(res => res.text())
            .then(existing => {
                let finalText = "";

                if (existing && existing !== "null") {
                    try {
                        existing = JSON.parse(existing);
                        finalText = existing + "\n" + link;
                    } catch (e) {
                        finalText = link;
                    }
                } else {
                    finalText = link;
                }

                // PUT updated data
                return fetchWithFallback(FIREBASE_URL, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(finalText)
                });
            })
            .then(() => {
                console.log("[step2] Saved to Firebase:", link);
            })
            .catch(err => {
                console.error("[step2] Firebase Error:", err);
            });
    }

    // ---------------------------
    // Execute
    // ---------------------------
    function execute() {
        // Save link immediately
        try {
            saveLinkToFirebase(currentLink);
        } catch (e) {
            console.error('[step2] Error saving link:', e);
        }

        // Redirect after 80 seconds
        console.log('[step2] Will redirect in 80 seconds...');
        setTimeout(() => {
            console.log("[step2] Redirecting to post-thread...");
            window.location.href = "https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread";
        }, 80000);
    }

    // Run immediately
    execute();
})();
