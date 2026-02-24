// ==UserScript==
// @name         Replace XPath Text with Scraped Proxies (Proper Line Breaks)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Fetch proxies and replace text of a specific XPath element with formatted proxies, each on a new line.
// @author       Atif
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    // 🌐 Proxy source URLs (HTTPS only)
    const proxyUrls = [
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
        "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/http.txt",
        "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
        "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
        "https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt"
    ];

    // 🎯 Change this to your exact target element XPath
    const targetXPath = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/div/dl[1]/dd/div/div[2]/div/p[6]/strong/span";

    // 🔍 Helper: get element by XPath
    function getElementByXPath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    // 🌐 Helper: fetch proxies with GM_xmlhttpRequest
    function fetchProxiesGM(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: { "Cache-Control": "no-cache" },
                onload: function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error("HTTP error! Status: " + response.status));
                    }
                },
                onerror: function (err) {
                    reject(err);
                }
            });
        });
    }

    // ⚙️ Fetch proxies from random source and return next 100
    async function fetchProxies() {
        const randomUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
        console.log(`Fetching proxies from: ${randomUrl}`);

        try {
            const text = await fetchProxiesGM(randomUrl);
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
            console.log(`Fetched ${proxies.length} proxies. Offset now: ${offset}`);
            return proxies;
        } catch (error) {
            console.error("Error fetching proxies:", error);
            return ["Error loading proxies"];
        }
    }

    // ⏳ Wait until XPath element appears
    function waitForXPath(xpath, callback, interval = 1000, timeout = 20000) {
        const start = Date.now();
        const timer = setInterval(() => {
            const el = getElementByXPath(xpath);
            if (el) {
                clearInterval(timer);
                callback(el);
            } else if (Date.now() - start > timeout) {
                clearInterval(timer);
                console.error("Timeout: Target element not found for XPath.");
            }
        }, interval);
    }

    // 🧾 Replace text with properly formatted proxy list (with line breaks)
    async function replaceXPathText(targetElement) {
        const proxies = await fetchProxies();

        // Use a <pre> block for proper formatting
        const pre = document.createElement("pre");
        pre.style.whiteSpace = "pre-wrap";
        pre.style.fontFamily = "monospace";
        pre.style.fontSize = "13px";
        pre.style.lineHeight = "1.4";
        pre.style.background = "#f7f7f7";
        pre.style.padding = "10px";
        pre.style.borderRadius = "6px";
        pre.textContent = proxies.join("\n");

        // Clear old content and add formatted proxy list
        targetElement.innerHTML = "";
        targetElement.appendChild(pre);

        console.log("✅ Replaced text with properly formatted proxy list.");
    }

    // 🔁 Auto-refresh every 60 seconds
    function startAutoRefresh(targetElement, interval = 60000) {
        setInterval(() => {
            replaceXPathText(targetElement);
        }, interval);
    }

    // 🚀 Run after page load
    window.addEventListener("load", () => {
        console.log("Tampermonkey script loaded. Waiting for target element...");
        waitForXPath(targetXPath, (targetElement) => {
            replaceXPathText(targetElement);
            startAutoRefresh(targetElement, 60000); // refresh every 1 minute
        });
    });

})();
