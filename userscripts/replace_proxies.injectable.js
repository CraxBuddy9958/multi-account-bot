
// userscripts/replace_proxies.injectable.js
// Modified from your original Replace XPath script to remove GM_xmlhttpRequest.
// It will try window.fetch() first, then fallback to window.__FETCH_PROXY(url) if fetch fails.

(function () {
  'use strict';

  const proxyUrls = [
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
    "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/http.txt",
    "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
    "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
    "https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt"
  ];

  const targetXPath = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/div/dl[1]/dd/div/div[2]/div/p[6]/strong/span";

  function getElementByXPath(xpath) {
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  }

  // Try fetch in-page. If it errors due to CORS/other, fallback to window.__FETCH_PROXY(url)
  async function fetchText(url) {
    // First try regular fetch
    try {
      const resp = await fetch(url, { cache: "no-cache" });
      if (!resp.ok) throw new Error('fetch failed: ' + resp.status);
      return await resp.text();
    } catch (e) {
      // If a Puppeteer injector provided a server-side fetch bridge, use it
      if (typeof window.__FETCH_PROXY === 'function') {
        try {
          const text = await window.__FETCH_PROXY(url);
          return text;
        } catch (e2) {
          console.error('[replace_proxies] __FETCH_PROXY failed', e2);
          throw e2;
        }
      }
      // otherwise rethrow original error
      throw e;
    }
  }

  async function fetchProxiesFromRandomSource() {
    const randomUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
    console.log(`[replace_proxies] fetching from ${randomUrl}`);

    try {
      const text = await fetchText(randomUrl);
      const allProxies = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && /^[0-9.]+:[0-9]+$/.test(line));
      if (allProxies.length === 0) throw new Error('no proxies parsed');
      return { url: randomUrl, proxies: allProxies };
    } catch (err) {
      console.error('[replace_proxies] error fetching proxies:', err);
      return { url: null, proxies: ["Error loading proxies"] };
    }
  }

  async function getNextProxies() {
    const { url, proxies } = await fetchProxiesFromRandomSource();

    if (!url) return proxies;

    const storageKey = "proxyOffset_" + url;
    let offset = parseInt(localStorage.getItem(storageKey) || '0', 10) || 0;

    let result = proxies.slice(offset, offset + 100);
    if (result.length < 100 && proxies.length > 100) {
      const remaining = 100 - result.length;
      result = result.concat(proxies.slice(0, remaining));
      offset = remaining;
    } else {
      offset += 100;
      if (offset >= proxies.length) offset = 0;
    }

    localStorage.setItem(storageKey, offset);
    console.log(`[replace_proxies] returning ${result.length} proxies (offset now ${offset})`);
    return result;
  }

  function waitForXPath(xpath, callback, interval = 1000, timeout = 20000) {
    const start = Date.now();
    const timer = setInterval(() => {
      const el = getElementByXPath(xpath);
      if (el) {
        clearInterval(timer);
        callback(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
        console.error('[replace_proxies] Timeout waiting for XPath element');
      }
    }, interval);
  }

  async function replaceXPathText(targetElement) {
    const proxies = await getNextProxies();

    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.fontFamily = "monospace";
    pre.style.fontSize = "13px";
    pre.style.lineHeight = "1.4";
    pre.style.background = "#f7f7f7";
    pre.style.padding = "10px";
    pre.style.borderRadius = "6px";
    pre.textContent = proxies.join("\n");

    targetElement.innerHTML = "";
    targetElement.appendChild(pre);

    console.log("[replace_proxies] Replaced XPath text with proxy list.");
  }

  function startAutoRefresh(targetElement, interval = 60000) {
    replaceXPathText(targetElement).catch(e => console.error(e));
    setInterval(() => {
      replaceXPathText(targetElement).catch(e => console.error(e));
    }, interval);
  }

  window.addEventListener("load", () => {
    console.log("[replace_proxies] script loaded, waiting for target element...");
    waitForXPath(targetXPath, (targetElement) => {
      startAutoRefresh(targetElement, 60000);
    }, 1000, 30000);
  });

})();
