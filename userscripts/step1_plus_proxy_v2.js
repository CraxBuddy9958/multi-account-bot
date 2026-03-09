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

    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                } else if (Date.now() - startTime > timeout) {
                    resolve(null);
                } else {
                    setTimeout(check, 200);
                }
            };
            check();
        });
    }

    // New: Wait for element with MutationObserver for dynamically loaded content
    function waitForElementWithObserver(selectors, timeout = 15000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            // First check if element already exists
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el) {
                    console.log('[step1] Found element immediately:', selector);
                    resolve(el);
                    return;
                }
            }
            
            // Set up MutationObserver to watch for dynamically added elements
            const observer = new MutationObserver((mutations) => {
                for (const selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        console.log('[step1] Found element via observer:', selector);
                        observer.disconnect();
                        resolve(el);
                        return;
                    }
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'contenteditable']
            });
            
            // Timeout check
            const timeoutCheck = setInterval(() => {
                for (const selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        console.log('[step1] Found element on timeout check:', selector);
                        clearInterval(timeoutCheck);
                        observer.disconnect();
                        resolve(el);
                        return;
                    }
                }
                
                if (Date.now() - startTime > timeout) {
                    clearInterval(timeoutCheck);
                    observer.disconnect();
                    console.log('[step1] Observer timeout - no element found');
                    resolve(null);
                }
            }, 500);
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
    // Element Finding - IMPROVED
    // ---------------------------
    async function findContentArea() {
        console.log('[step1] Starting findContentArea...');
        
        // PRIORITY selectors based on actual page structure
        // The actual element has classes: fr-element fr-view fr-element-scroll-visible
        const selectors = [
            // EXACT match for the page's content area (PRIORITY - try first)
            '.fr-element.fr-view.fr-element-scroll-visible',
            'div.fr-element.fr-view.fr-element-scroll-visible',
            '.fr-element.fr-view[contenteditable="true"]',
            'div.fr-element.fr-view[contenteditable="true"]',
            
            // Froala editor variations
            '.fr-element.fr-view',
            '.fr-wrapper .fr-element',
            '.fr-box .fr-element',
            '.fr-box.fr-basic .fr-element',
            'div.fr-element',
            
            // Any fr-element that is contenteditable
            '.fr-element[contenteditable="true"]',
            '.fr-view[contenteditable="true"]',
            
            // Redactor editor (another common XenForo editor)
            '.redactor-editor',
            '.redactor-box .redactor-editor',
            'div.redactor-editor',
            
            // Generic contenteditable with visibility check
            'div[contenteditable="true"].fr-element',
            'div[contenteditable="true"].fr-view',
            
            // XenForo specific
            '.js-editor',
            '.message-editorWrapper .fr-element',
            '.block-container .fr-element',
            'form .fr-element',
            
            // Textarea fallbacks
            'textarea[name="message"]',
            'textarea#message',
            'textarea.message',
            'textarea.editor',
            'textarea.js-editor',
            
            // Generic message areas
            '.messageContent',
            '.message-body',
            '.editorContent'
        ];

        // Try with MutationObserver for dynamically loaded content
        console.log('[step1] Trying selectors with MutationObserver...');
        let el = await waitForElementWithObserver(selectors, 15000);
        
        if (el) {
            console.log('[step1] Found content area via observer');
            return el;
        }

        // Try each selector individually with longer timeout
        console.log('[step1] Trying individual selectors with longer timeout...');
        for (const selector of selectors) {
            console.log(`[step1] Trying selector: ${selector}`);
            el = await waitForElement(selector, 3000);
            if (el) {
                console.log('[step1] Found content area:', selector);
                return el;
            }
        }

        // XPath fallbacks for XenForo - EXACT match for page structure
        const xpaths = [
            // Exact match for the fr-element with fr-view and contenteditable
            "//div[contains(@class, 'fr-element') and contains(@class, 'fr-view') and @contenteditable='true']",
            "//div[contains(@class, 'fr-element-scroll-visible')]",
            // Common XenForo editor XPaths
            "//div[contains(@class, 'fr-element')]",
            "//div[@contenteditable='true']",
            "//textarea[@name='message']",
            "//div[contains(@class, 'editor')]//div[@contenteditable='true']",
            "//form//div[contains(@class, 'fr-element')]",
            "//div[contains(@class, 'message-editorWrapper')]//div[@contenteditable='true']"
        ];
        
        console.log('[step1] Trying XPath selectors...');
        for (const xpath of xpaths) {
            const xpathEl = getElementByXPath(xpath);
            if (xpathEl) {
                console.log('[step1] Found content area via XPath:', xpath);
                return xpathEl;
            }
        }

        // Last resort: Find any visible contenteditable div (Froala editor)
        console.log('[step1] Trying visible contenteditable fallback...');
        const allEditables = document.querySelectorAll('[contenteditable="true"]');
        console.log('[step1] Found', allEditables.length, 'contenteditable elements');
        for (const editable of allEditables) {
            const rect = editable.getBoundingClientRect();
            console.log('[step1] Checking editable element:', editable.className, 'height:', rect.height, 'width:', rect.width);
            if (rect.height >= 50 && rect.width >= 100) {
                console.log('[step1] Found visible contenteditable:', editable.className);
                return editable;
            }
        }

        // Last resort: Find any visible textarea with decent size
        console.log('[step1] Trying textarea fallback...');
        const allTextareas = document.querySelectorAll('textarea');
        for (const ta of allTextareas) {
            const rect = ta.getBoundingClientRect();
            if (rect.height > 50 && rect.width > 100) {
                console.log('[step1] Found visible textarea');
                return ta;
            }
        }

        // Debug: Log all potential editor elements found
        console.log('[step1] DEBUG - Elements found on page:');
        console.log('[step1] .fr-element:', document.querySelectorAll('.fr-element').length);
        console.log('[step1] .fr-view:', document.querySelectorAll('.fr-view').length);
        console.log('[step1] .fr-element.fr-view:', document.querySelectorAll('.fr-element.fr-view').length);
        console.log('[step1] .fr-element-scroll-visible:', document.querySelectorAll('.fr-element-scroll-visible').length);
        console.log('[step1] [contenteditable]:', document.querySelectorAll('[contenteditable]').length);
        console.log('[step1] [contenteditable="true"]:', document.querySelectorAll('[contenteditable="true"]').length);
        console.log('[step1] textarea:', document.querySelectorAll('textarea').length);

        return null;
    }

    async function findTitleField() {
        const selectors = [
            'input[name="title"]',
            'input#title',
            'input[placeholder*="title" i]',
            '.titleInput input',
            'input.title',
            'input.js-title'
        ];

        for (const selector of selectors) {
            const el = await waitForElement(selector, 3000);
            if (el) return el;
        }

        const xpaths = [
            "//input[@name='title']",
            "//input[@id='title']",
            "//input[contains(@placeholder, 'title')]"
        ];
        
        for (const xpath of xpaths) {
            const el = getElementByXPath(xpath);
            if (el) return el;
        }

        return null;
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
            '.block-footer button[type="submit"]',
            'button.button--icon--reply',
            'button.button--primary'
        ];

        for (const selector of selectors) {
            const el = await waitForElement(selector, 3000);
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
    async function injectProxies(retries = 5, retryDelay = 3000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            console.log(`[step1] Attempt ${attempt}/${retries} to find content area...`);
            const targetElement = await findContentArea();

            if (!targetElement) {
                console.warn(`[step1] Content area not found (attempt ${attempt}/${retries})`);
                
                // Try refreshing the page elements by forcing a re-check
                if (attempt < retries) {
                    console.log(`[step1] Waiting ${retryDelay}ms before retry...`);
                    await sleep(retryDelay);
                    
                    // Increase retry delay for next attempt
                    retryDelay = Math.min(retryDelay * 1.5, 10000);
                }
                continue;
            }

            const proxies = await fetchProxies();
            if (!proxies || proxies.length === 0) {
                console.warn('[step1] No proxies returned');
                return false;
            }

            const proxyContent = proxies.join('\n');
            console.log(`[step1] Injecting ${proxies.length} proxies into element:`, targetElement.tagName, targetElement.className);

            // Focus the element first
            targetElement.focus();
            await sleep(100);

            // Set content based on element type
            if (targetElement.tagName === 'TEXTAREA') {
                targetElement.value = proxyContent;
                // Also try setting via prototype for React frameworks
                try {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                    if (nativeInputValueSetter) {
                        nativeInputValueSetter.call(targetElement, proxyContent);
                    }
                } catch (e) {
                    console.log('[step1] Native setter failed, continuing');
                }
            } else if (targetElement.isContentEditable || targetElement.getAttribute('contenteditable') === 'true') {
                // For Froala editor - need to clear existing content and set new content
                targetElement.innerHTML = '';
                await sleep(50);
                
                // Create paragraphs for each proxy line (Froala prefers <p> tags)
                const proxyHtml = proxies.map(p => `<p>${p}</p>`).join('');
                targetElement.innerHTML = proxyHtml;
                
                // Also set innerText as backup
                targetElement.innerText = proxyContent;
                
                console.log('[step1] Set content via innerHTML and innerText');
            } else {
                targetElement.innerHTML = proxies.map(p => `<div>${p}</div>`).join('');
            }

            // Trigger events - comprehensive list for various frameworks and Froala
            await sleep(50);
            targetElement.focus();
            await sleep(50);
            
            const events = ['focus', 'input', 'change', 'blur', 'keyup', 'keydown', 'keypress'];
            for (const eventType of events) {
                targetElement.dispatchEvent(new Event(eventType, { bubbles: true }));
            }
            
            // Dispatch InputEvent for React/modern frameworks
            try {
                targetElement.dispatchEvent(new InputEvent('input', { 
                    bubbles: true, 
                    cancelable: true,
                    data: proxyContent,
                    inputType: 'insertText'
                }));
            } catch (e) {
                console.log('[step1] InputEvent dispatch failed, continuing');
            }

            // For Froala, try to trigger froalaEditor events
            try {
                if (window.jQuery && jQuery(targetElement).data('froala.editor')) {
                    jQuery(targetElement).froalaEditor('html.set', proxyHtml || proxyContent);
                    console.log('[step1] Set content via Froala API');
                }
            } catch (e) {
                console.log('[step1] Froala API not available or failed');
            }

            console.log(`[step1] Successfully injected ${proxies.length} proxies`);
            return true;
        }

        console.error('[step1] Failed to inject proxies after all retries');
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
            '[data-prefix-id="69"]',
            'option[value="67"]',
            'option[data-prefix-class="HTTP/s"]'
        ];

        for (const selector of prefixSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                el.selected = true;
                el.click();
                console.log('[step1] Selected prefix via selector:', selector);
                return true;
            }
        }

        const prefixContainer = document.querySelector('.prefixContainer');
        if (prefixContainer) {
            const socks5Option = prefixContainer.querySelector('[data-prefix-class="HTTP/s"], option[value="67"]');
            if (socks5Option) {
                socks5Option.click();
                console.log('[step1] Selected HTTP/s via container');
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

        // Wait for page to fully load
        console.log('[step1] Waiting for page to load...');
        await sleep(3000);

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

    // Run on load with additional delay for dynamic content
    if (document.readyState === 'loading') {
        window.addEventListener('load', () => {
            setTimeout(execute, 1000);
        });
    } else {
        setTimeout(execute, 1000);
    }
})();
