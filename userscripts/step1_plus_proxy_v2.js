// userscripts/step1_plus_proxy.injectable.js - Step 1: Post Thread
(function() {
    'use strict';

    // Only run on the post-thread page
    const TARGET_URL = "https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread";
    if (!window.location.href.startsWith(TARGET_URL)) {
        console.log('[step1] Skipping - not on post-thread page');
        return;
    }

    console.log('[step1] Running on post-thread page');

    // Flag to prevent multiple executions
    if (window.__step1Running) {
        console.log('[step1] Already running, skipping');
        return;
    }
    window.__step1Running = true;

    // ---------------------------
    // Configuration / Resources
    // ---------------------------
    var userContent = localStorage.getItem('userContent') || `No needed anymore`;

    if (!userContent.trim()) {
        try {
            var shouldContinue = confirm("User content is empty. Do you want to continue?");
            if (!shouldContinue) return;
        } catch (e) {
            console.warn('[step1] confirm not available; continuing');
        }
    }

    var lines = userContent.split('\n');
    var linesToTake = Math.min(100, lines.length);
    var contentToReplace = lines.slice(0, linesToTake).join('\n');
    userContent = lines.slice(linesToTake).join('\n');
    try {
        localStorage.setItem('userContent', userContent);
    } catch (e) {}

    // Random title selection
    var ranTitle = `RESIDENTIAL ULTRA FAST Paid Proxies THRILLING
UHQ PROXYLISTTOP SOCKS 5 FOR CRACKING
SOCKS 5PREMIUM UHQ PROXYLISTULTIMATE CRACKING
ELITE SOCKS 5 PROXIES
UHQ SOCKS 5 PROXIES
[VERIFIED] [PAID] [EXCLUSIVE] [LIGHTNING FAST]
[PAID] [EXCLUSIVE] [SUPERFAST]
UHQ SOCKS 5 PROXIES | ELITE QUALITY
Premium SOCKS 5 PROXIES
Premium SOCKS 5 PROXIES
UHQ SOCKS 5 PROXIES
UHQ SOCKS 5 PROXIES
UHQ SOCKS 5 PROXIES
UHQ PROXYLIST
TOP PROXIES FOR CRACKING SOCKS 5
TOP PROXIES SOCKS 5
Fresh Proxies | SOCKS 5
SOCKS 5| UHQ  Proxies
SOCKS 5UHQ PROXYLIST|BEST FOR CRACKING|
SOCKS 5UHQ PROXIES |ULTIMATE CRACKING
SOCKS 5ELITE PROXIES |PROXIES FOR CRACKING
SOCKS 5ELITE PROXIES |FOR CRACKING
ELITE PROXIES |PROXIES FOR CRACKING
Premium SOCKS 5 PROXIES
VERIFIEDPAID EXCLUSIVELIGHTNING FAST
SOCKS 5UHQEXCLUSIVE
EXCLUSIVEELITESUPER FAST
FASTPAIDELITEUHQ
LIGHTNING SOCKS 5 Proxies
Lightning Proxylist
Lightning Proxies
LIGHTNING SOCKS 5 Proxies
Residential | Super Fast | UHQ | SOCKS 5
UHQ | Lightning | Paid | SOCKS 5
ELITE QUALITY | SOCKS 5 PROXYLIST
FRESH NEW SOCKS 5 PROXYLIST VERIFIED
[LATEST][SOCKS 5][VERIFIED][PROXIES]
[NEW PAID PROXIES SOCKS 5]
Paid SOCKS 5 Proxies ACTIVE
ELITE PROXIES |PROXIES FOR CRACKING`;

    var titles = ranTitle.trim().split('\n');
    var title = titles[Math.floor(Math.random() * titles.length)].trim();

    // Proxy sources
    const proxyUrls = [
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
        "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/http.txt",
        "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
        "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
        "https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt"
    ];

    // ---------------------------
    // Utility Functions
    // ---------------------------
    function getElementByXPath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                } else if (Date.now() - startTime > timeout) {
                    resolve(null);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function fetchText(url) {
        // Try regular fetch first
        try {
            const r = await fetch(url, { cache: 'no-cache' });
            if (r.ok) return await r.text();
        } catch (e) {
            console.log('[step1] Regular fetch failed, trying __FETCH_PROXY');
        }

        // Fallback to Puppeteer's exposed function
        if (typeof window.__FETCH_PROXY === 'function') {
            try {
                return await window.__FETCH_PROXY(url);
            } catch (e) {
                console.error('[step1] __FETCH_PROXY failed:', e);
            }
        }

        // Try GM_xmlhttpRequest if available (Tampermonkey)
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: { "Cache-Control": "no-cache" },
                    onload: function(response) {
                        if (response.status >= 200 && response.status < 300) {
                            resolve(response.responseText);
                        } else {
                            reject(new Error("HTTP error! Status: " + response.status));
                        }
                    },
                    onerror: reject,
                    ontimeout: () => reject(new Error("timeout"))
                });
            });
        }

        throw new Error('No fetch method available');
    }

    // ---------------------------
    // Proxy Functions
    // ---------------------------
    async function fetchProxies() {
        const randomUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
        console.log(`[step1] Fetching proxies from: ${randomUrl}`);

        try {
            const text = await fetchText(randomUrl);
            const allProxies = text
                .split("\n")
                .map(line => line.trim())
                .filter(line => line && /^[0-9.]+:[0-9]+$/.test(line));

            if (allProxies.length === 0) throw new Error("No valid proxies found.");

            const storageKey = "proxyOffset_" + randomUrl;
            let offset = parseInt(localStorage.getItem(storageKey)) || 0;

            let proxies = allProxies.slice(offset, offset + 100);
            if (proxies.length < 100 && allProxies.length > 100) {
                const remaining = 100 - proxies.length;
                proxies = proxies.concat(allProxies.slice(0, remaining));
                offset = remaining;
            } else {
                offset += 100;
                if (offset >= allProxies.length) offset = 0;
            }

            localStorage.setItem(storageKey, offset);
            console.log(`[step1] Fetched ${proxies.length} proxies. New offset: ${offset}`);
            return proxies;
        } catch (err) {
            console.error("[step1] fetchProxies error:", err);
            return [];
        }
    }

    // ---------------------------
    // Element Finding
    // ---------------------------
    async function findContentArea() {
        const selectors = [
            '.fr-element.fr-view',
            '.fr-wrapper .fr-element',
            '[contenteditable="true"]',
            'textarea[name="message"]',
            'textarea#message',
            '.messageContent',
            '.message-body'
        ];

        for (const selector of selectors) {
            if (typeof selector === 'string') {
                const el = await waitForElement(selector, 2000);
                if (el) {
                    console.log('[step1] Found content area:', selector);
                    return el;
                }
            }
        }

        // XPath fallback
        const xpath = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/div/dl[1]/dd/div/div[2]/div/p[6]/strong/span";
        const el = getElementByXPath(xpath);
        if (el) {
            console.log('[step1] Found content area via XPath');
            return el;
        }

        // Last resort
        const allTextareas = document.querySelectorAll('textarea');
        for (const ta of allTextareas) {
            if (ta.offsetHeight > 100) return ta;
        }

        return null;
    }

    async function findTitleField() {
        const selectors = [
            'input[name="title"]',
            'input#title',
            'input[placeholder*="title" i]',
            '.titleInput input'
        ];

        for (const selector of selectors) {
            const el = await waitForElement(selector, 2000);
            if (el) return el;
        }

        const xpath = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/dl/dd/div[2]/textarea";
        return getElementByXPath(xpath);
    }

    async function findSubmitButton() {
        // Look for button by text content first (most reliable)
        const allButtons = document.querySelectorAll('button, input[type="submit"]');
        for (const btn of allButtons) {
            const text = (btn.textContent || btn.value || '').toLowerCase();
            if (text.includes('post thread') || text.includes('submit') || text.includes('post')) {
                // Make sure it's not a search button
                const onclick = btn.getAttribute('onclick') || '';
                const formaction = btn.getAttribute('formaction') || '';
                const id = btn.id || '';
                const classes = btn.className || '';
                
                if (!onclick.includes('search') && 
                    !formaction.includes('search') && 
                    !id.includes('search') &&
                    !classes.includes('search')) {
                    console.log('[step1] Found submit button by text:', text);
                    return btn;
                }
            }
        }

        // XenForo specific selectors
        const selectors = [
            '.formSubmitRow-controls button[type="submit"]',
            '.formSubmitRow button[type="submit"]',
            'form .formSubmitRow button[type="submit"]',
            '.button--primary[type="submit"]',
            '.button--cta[type="submit"]',
            '.block-footer button[type="submit"]'
        ];

        for (const selector of selectors) {
            const el = await waitForElement(selector, 2000);
            if (el) {
                console.log('[step1] Found submit button:', selector);
                return el;
            }
        }

        // Container-based search
        const formContainers = [
            '.formSubmitRow',
            '.formSubmitRow-controls',
            '.block-footer',
            '.form-button-group'
        ];
        
        for (const container of formContainers) {
            const cont = document.querySelector(container);
            if (cont) {
                const btn = cont.querySelector('button[type="submit"], input[type="submit"]');
                if (btn) {
                    console.log('[step1] Found submit button in container:', container);
                    return btn;
                }
            }
        }

        // Last resort: Find button inside the main form
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
            if (form.innerHTML.includes('message') || form.innerHTML.includes('title')) {
                const btn = form.querySelector('button[type="submit"], input[type="submit"]');
                if (btn) {
                    console.log('[step1] Found submit button in relevant form');
                    return btn;
                }
            }
        }

        console.warn('[step1] Submit button not found');
        return null;
    }

    // ---------------------------
    // IP Address Detection (Optional)
    // ---------------------------
    function detectIPAddress() {
        // Try multiple selectors to find the IP address element
        const selectors = [
            '#ip',
            '.info-value#ip',
            '.info-row #ip',
            'span[id="ip"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                const ip = el.textContent.trim();
                // Validate IP format
                if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
                    console.log('[step1] IP Address detected:', ip);
                    return ip;
                }
            }
        }

        // Fallback: search by label text
        const infoRows = document.querySelectorAll('.info-row');
        for (const row of infoRows) {
            const label = row.querySelector('.info-label');
            if (label && label.textContent.toLowerCase().includes('ip address')) {
                const valueEl = row.querySelector('.info-value, #ip');
                if (valueEl) {
                    const ip = valueEl.textContent.trim();
                    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
                        console.log('[step1] IP Address detected:', ip);
                        return ip;
                    }
                }
            }
        }

        return null;
    }

    // ---------------------------
    // Main Functions
    // ---------------------------
    async function injectProxies(retries = 5, retryDelay = 1000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const targetElement = await findContentArea();

            if (!targetElement) {
                console.warn(`[step1] Content area not found (attempt ${attempt}/${retries})`);
                await sleep(retryDelay);
                continue;
            }

            const proxies = await fetchProxies();
            if (!proxies || proxies.length === 0) {
                console.warn('[step1] No proxies returned');
                return false;
            }

            // Set content
            if (targetElement.tagName === 'TEXTAREA') {
                targetElement.value = proxies.join('\n');
            } else if (targetElement.isContentEditable || targetElement.getAttribute('contenteditable') === 'true') {
                targetElement.innerText = proxies.join('\n');
            } else {
                targetElement.innerHTML = proxies.map(p => `<div>${p}</div>`).join('');
            }

            // Trigger events
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            targetElement.dispatchEvent(new Event('change', { bubbles: true }));
            targetElement.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

            console.log(`[step1] Injected ${proxies.length} proxies`);
            return true;
        }

        console.error('[step1] Failed to inject proxies');
        return false;
    }

    async function fillTitle() {
        const el = await findTitleField();
        if (el) {
            el.value = title;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[step1] Title set');
            return true;
        }
        console.warn('[step1] Title field not found');
        return false;
    }

    async function clickSubmit() {
        const el = await findSubmitButton();
        if (el) {
            console.log('[step1] Clicking submit button:', el.outerHTML.substring(0, 100));
            el.click();
            console.log('[step1] Submit clicked');
            return true;
        }
        console.warn('[step1] Submit button not found');
        return false;
    }

    async function selectPrefix() {
        const prefixSelectors = [
            'option[value="69"]',
            'option[data-prefix-class="socks5"]',
            '[data-prefix-id="69"]'
        ];

        for (const selector of prefixSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                el.selected = true;
                el.click();
                console.log('[step1] Selected SOCKS5 prefix');
                return true;
            }
        }

        const prefixContainer = document.querySelector('.prefixContainer');
        if (prefixContainer) {
            const socks5Option = prefixContainer.querySelector('[data-prefix-class="socks5"], option[value="69"]');
            if (socks5Option) {
                socks5Option.click();
                console.log('[step1] Selected SOCKS5 via container');
                return true;
            }
        }

        const xpath = "/html/body/div[7]/div/div[1]/a";
        const el = getElementByXPath(xpath);
        if (el) {
            el.click();
            console.log('[step1] Clicked prefix via XPath');
            return true;
        }

        console.warn('[step1] Could not select prefix');
        return false;
    }

    // ---------------------------
    // Execute
    // ---------------------------
    async function execute() {
        console.log('[step1] Starting execution');

        // Optional: Detect and log IP address if found
        detectIPAddress();

        await sleep(2000);

        await selectPrefix();
        await sleep(500);

        const injectionOk = await injectProxies();
        if (!injectionOk) {
            console.error('[step1] Proxy injection failed - aborting');
            window.__step1Running = false;
            return;
        }

        await sleep(500);
        await fillTitle();

        await sleep(500);
        
        // Update localStorage BEFORE clicking submit and waiting
        try {
            userContent = lines.slice(100).join('\n');
            localStorage.setItem('userContent', userContent);
            console.log('[step1] Updated localStorage before submit');
        } catch (e) {
            console.error('[step1] Failed to update localStorage:', e);
        }

        const submitClicked = await clickSubmit();

        if (submitClicked) {
            // Wait 15 seconds after clicking submit
            console.log('[step1] Waiting 15 seconds for submission to complete...');
            await sleep(15000);
            console.log('[step1] 15 second wait complete');
        }

        console.log('[step1] Execution complete');
        window.__step1Running = false;
    }

    // Run on load
    if (document.readyState === 'loading') {
        window.addEventListener('load', execute);
    } else {
        execute();
    }
})();