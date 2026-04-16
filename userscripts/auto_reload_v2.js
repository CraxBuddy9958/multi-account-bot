// userscripts/auto_reload.injectable.js - URL Monitor & Auto-Redirect
(function() {
    'use strict';

    console.log('[auto_reload] Initializing...');

    // Configuration
    const CHECK_INTERVAL = 10000;      // Check every 10 seconds
    const STUCK_THRESHOLD = 4 * 60 * 1000;  // 4 minutes in ms
    const REDIRECT_URL = "https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread";

    // State tracking
    let lastUrl = window.location.href;
    let lastUrlChangeTime = Date.now();
    let checkCount = 0;

    // ---------------------------
    // Helper Functions
    // ---------------------------
    function getCurrentTime() {
        return new Date().toLocaleTimeString();
    }

    function formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    // ---------------------------
    // Main Check Function
    // ---------------------------
    function checkAndAct() {
        checkCount++;
        const currentUrl = window.location.href;
        const currentTime = Date.now();
        const timeOnSamePage = currentTime - lastUrlChangeTime;

        console.log(`[auto_reload] Check #${checkCount} at ${getCurrentTime()}`);
        console.log(`[auto_reload] Current URL: ${currentUrl}`);
        console.log(`[auto_reload] Time on same page: ${formatDuration(timeOnSamePage)}`);

        // Check if URL changed
        if (currentUrl !== lastUrl) {
            console.log(`[auto_reload] URL changed! ${lastUrl} -> ${currentUrl}`);
            lastUrl = currentUrl;
            lastUrlChangeTime = currentTime;
            return;
        }

        // Check for error messages
        try {
            const pageText = document.body && document.body.innerText;
            if (pageText && pageText.includes("Oops! We ran into some problems. Try again!")) {
                console.log("[auto_reload] Error message detected - reloading page");
                location.reload();
                return;
            }
            if (pageText && pageText.includes("Something went wrong")) {
                console.log("[auto_reload] 'Something went wrong' detected - reloading page");
                location.reload();
                return;
            }
        } catch (e) {
            console.error("[auto_reload] Error checking page text:", e);
        }

        // Check if stuck on same page for too long
        if (timeOnSamePage >= STUCK_THRESHOLD) {
            console.log(`[auto_reload] STUCK for ${formatDuration(timeOnSamePage)} - redirecting to post-thread`);
            console.log(`[auto_reload] Redirecting to: ${REDIRECT_URL}`);

            // Reset tracking before redirect
            lastUrlChangeTime = currentTime;

            // Perform redirect
            window.location.href = REDIRECT_URL;
            return;
        }

        console.log(`[auto_reload] Page OK - will redirect in ${formatDuration(STUCK_THRESHOLD - timeOnSamePage)} if stuck`);
    }

    // ---------------------------
    // Initialize
    // ---------------------------

    // Run first check immediately
    checkAndAct();

    // Set up interval to check every 10 seconds
    setInterval(checkAndAct, CHECK_INTERVAL);

    // Also listen for URL changes via history API (for SPAs)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        originalPushState.apply(history, args);
        console.log('[auto_reload] pushState detected');
        lastUrl = window.location.href;
        lastUrlChangeTime = Date.now();
    };

    history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        console.log('[auto_reload] replaceState detected');
        lastUrl = window.location.href;
        lastUrlChangeTime = Date.now();
    };

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', () => {
        console.log('[auto_reload] popstate detected');
        lastUrl = window.location.href;
        lastUrlChangeTime = Date.now();
    });

    console.log(`[auto_reload] Started - checking every ${CHECK_INTERVAL/1000}s, stuck threshold: ${STUCK_THRESHOLD/60000}min`);
})();
