// userscripts/step1_plus_proxy.injectable.js
(function() {
  'use strict';

  // ---------- userContent handling (keeps original behavior) ----------
  var userContent = localStorage.getItem('userContent') || `No needed anymore`;
  if (!userContent.trim()) {
    try {
      var shouldContinue = confirm("User content is empty. Do you want to continue?");
      if (!shouldContinue) return;
    } catch (e) {
      // in headless mode, confirm might not work — continue anyway
      console.warn('[combined] confirm not available; continuing');
    }
  }
  var lines = userContent.split('\n');
  var linesToTake = Math.min(100, lines.length);
  var contentToReplace = lines.slice(0, linesToTake).join('\n');
  userContent = lines.slice(linesToTake).join('\n');
  try { localStorage.setItem('userContent', userContent); } catch(e){}

  // ---------- titles ----------
  var ranTitle = `RESIDENTIAL ULTRA FAST Paid Proxies THRILLING
UHQ PROXYLISTTOP SOCKS 5 FOR CRACKING
PREMIUM SOCKS5 FRESH DAILY
HQ PRIVATE PROXIES WORKING 100%
ELITE SOCKS4 & SOCKS5 LIST
`;
  var titles = ranTitle.trim().split('\n');
  var title = titles[Math.floor(Math.random() * titles.length)];

  // ---------- proxy sources ----------
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

  // New: fetch wrapper — try in-page fetch, else call window.__FETCH_PROXY (provided by runner)
  async function fetchTextWithFallback(url) {
    // try regular fetch first
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error('status ' + r.status);
      return await r.text();
    } catch (e) {
      // if injected environment exposes __FETCH_PROXY, use it
      if (typeof window.__FETCH_PROXY === 'function') {
        try {
          return await window.__FETCH_PROXY(url);
        } catch (e2) {
          console.error('[combined] __FETCH_PROXY failed', e2);
          throw e2;
        }
      }
      // otherwise, propagate original error
      console.error('[combined] fetch failed', e);
      throw e;
    }
  }

  async function fetchProxies() {
    const randomUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
    console.log(`[combined] fetching proxies from ${randomUrl}`);
    try {
      const text = await fetchTextWithFallback(randomUrl);
      const allProxies = text.split("\n").map(l => l.trim()).filter(l => l && /^[0-9.]+:[0-9]+$/.test(l));
      if (allProxies.length === 0) throw new Error('no proxies parsed');
      const storageKey = "proxyOffset_" + randomUrl;
      let offset = parseInt(localStorage.getItem(storageKey) || '0', 10) || 0;
      let proxies = allProxies.slice(offset, offset + 100);
      if (proxies.length < 100 && allProxies.length > 100) {
        const remaining = 100 - proxies.length;
        proxies = proxies.concat(allProxies.slice(0, remaining));
        offset = remaining;
      } else {
        offset += 100;
        if (offset >= allProxies.length) offset = 0;
      }
      try { localStorage.setItem(storageKey, offset); } catch(e){}
      return proxies;
    } catch (err) {
      console.error('[combined] fetchProxies error', err);
      return [];
    }
  }

  async function replaceXPathWithProxies(retries = 5, retryDelay = 800) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const targetElement = getElementByXPath(targetXPath);
      if (!targetElement) {
        console.warn(`[combined] target element not found (attempt ${attempt}/${retries}).`);
        await new Promise(r => setTimeout(r, retryDelay));
        continue;
      }
      const proxies = await fetchProxies();
      if (!proxies || proxies.length === 0) {
        console.warn('[combined] no proxies returned');
        return false;
      }
      targetElement.innerHTML = '';
      proxies.forEach(p => {
        const div = document.createElement('div');
        div.textContent = p;
        targetElement.appendChild(div);
      });
      console.log(`[combined] injected ${proxies.length} proxies`);
      return true;
    }
    console.error('[combined] element never found after retries');
    return false;
  }

  function clickByXPath(xpath) {
    const el = getElementByXPath(xpath);
    if (el) { el.click(); console.log('[combined] clicked', xpath); return true; }
    console.warn('[combined] click target not found:', xpath);
    return false;
  }

  function replacePrefixContainer() {
    const container = document.querySelector('.prefixContainer');
    if (!container) return false;
    const newContent = `<div class="prefixContainer"> ... </div>`; // keep full markup as needed
    container.outerHTML = newContent;
    console.log('[combined] replaced prefixContainer');
    return true;
  }

  function replaceTitleTextarea() {
    const titleXPath = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/dl/dd/div[2]/textarea";
    const el = getElementByXPath(titleXPath);
    if (!el) { console.warn('[combined] title textarea not found'); return false; }
    el.value = title;
    console.log('[combined] title set');
    return true;
  }

  if (window.location.href === "https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread") {
    console.log('[combined] post-thread flow starting');
    window.addEventListener('load', function() {
      clickByXPath("/html/body/div[7]/div/div[1]/a");
      setTimeout(async function() {
        replacePrefixContainer();
        const ok = await replaceXPathWithProxies();
        if (!ok) {
          console.error('[combined] proxies injection failed — aborting submit');
          return;
        }
        replaceTitleTextarea();
        clickByXPath("/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/dl/dd/div/div[2]/button");
        // keep userContent slice if desired
        try {
          userContent = lines.slice(100).join('\n');
          localStorage.setItem('userContent', userContent);
        } catch (e) {}
      }, 2000);
    });
  }

})();
