// userscripts/step1.injectable.js
(function () {
    'use strict';

    console.log("[STEP1] Script injected.");

    function logError(msg) {
        console.error("[STEP1 ERROR] " + msg);
    }

    function getByXPath(xpath) {
        try {
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
            logError("XPath evaluation failed: " + xpath);
            return null;
        }
    }

    function clickByXPath(xpath) {
        const el = getByXPath(xpath);
        if (!el) {
            logError("Element not found for click: " + xpath);
            return false;
        }
        el.click();
        console.log("[STEP1] Clicked:", xpath);
        return true;
    }

    function replaceContent(xpath, content) {
        const el = getByXPath(xpath);
        if (!el) {
            logError("Element not found for replace: " + xpath);
            return false;
        }

        if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
            el.value = content;
        } else {
            el.innerHTML = content.replace(/\n/g, "<br>");
        }

        console.log("[STEP1] Content replaced.");
        return true;
    }

    async function waitForElement(xpath, timeout = 20000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = getByXPath(xpath);
            if (el) return el;
            await new Promise(r => setTimeout(r, 1000));
        }
        logError("Timeout waiting for element: " + xpath);
        return null;
    }

    async function main() {
        console.log("[STEP1] Current URL:", location.href);

        if (!location.href.includes("post-thread")) {
            console.log("[STEP1] Not on target page. Skipping.");
            return;
        }

        await new Promise(r => window.addEventListener('load', r));

        console.log("[STEP1] Page loaded.");

        // Wait for create thread button
        const createBtnXPath = "/html/body/div[7]/div/div[1]/a";
        const createBtn = await waitForElement(createBtnXPath);

        if (!createBtn) return;

        createBtn.click();
        console.log("[STEP1] Create button clicked.");

        await new Promise(r => setTimeout(r, 3000));

        const textareaXPath = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/dl/dd/div[2]/textarea";
        const submitBtnXPath = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/dl/dd/div/div[2]/button";

        const textarea = await waitForElement(textareaXPath);
        if (!textarea) return;

        const title = "AUTO TITLE " + Date.now();
        replaceContent(textareaXPath, title);

        const submitBtn = await waitForElement(submitBtnXPath);
        if (!submitBtn) return;

        submitBtn.click();
        console.log("[STEP1] Submit clicked.");

        // Monitor navigation
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                console.log("[STEP1] Page changed to:", location.href);
                lastUrl = location.href;
            }
        }, 2000);

        console.log("[STEP1] Finished execution.");
    }

    main().catch(e => logError(e.message));

})();
