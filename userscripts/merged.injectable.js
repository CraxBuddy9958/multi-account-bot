// userscripts/merged.injectable.js
// Merged Step 1 + Proxy Replacer (works in Tampermonkey or when injected by Puppeteer)
// Targets: https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread and threads
// NOTE: In cloud (Puppeteer) ensure run.js exposes window.__FETCH_PROXY(url) for CORS bypass.

(function () {
  'use strict';

  console.log('[MERGED] script start');

  /* ---------- Config ---------- */
  const TARGET_POST_URL = 'https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread';
  const THREAD_MATCH = /https?:\/\/craxpro\.to\/threads\//;

  // proxy sources
  const PROXY_URLS = [
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
    "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/http.txt",
    "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
    "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
    "https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt"
  ];

  const PROXY_TARGET_XPATH = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/div/dl[1]/dd/div/div[2]/div/p[6]/strong/span";
  const CREATE_BTN_XPATH = "/html/body/div[7]/div/div[1]/a";
  const TITLE_TEXTAREA_XPATH = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/dl/dd/div[2]/textarea";
  const SUBMIT_BTN_XPATH = "/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/dl/dd/div/div[2]/button";

  /* ---------- Helpers ---------- */
  function byXPath(xpath) {
    try {
      return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch (e) {
      console.error('[MERGED] XPath eval failed', xpath, e);
      return null;
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function waitForXPath(xpath, timeout = 20000, interval = 800) {
    const start = Date.now();
    while ((Date.now() - start) < timeout) {
      const el = byXPath(xpath);
      if (el) return el;
      await sleep(interval);
    }
    console.warn('[MERGED] waitForXPath timeout:', xpath);
    return null;
  }

  /* ---------- Fetch wrappers ---------- */
  // If GM_xmlhttpRequest exists (Tampermonkey), prefer it; otherwise try fetch(),
  // and if fetch fails due to CORS, call window.__FETCH_PROXY(url) (exposed by Puppeteer runner).
  function gmFetchText(url) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers: { 'Cache-Control': 'no-cache' },
          onload(res) {
            if (res.status >= 200 && res.status < 300) resolve(res.responseText);
            else reject(new Error('GM_http status ' + res.status));
          },
          onerror(err) { reject(err); },
          ontimeout() { reject(new Error('GM_http timeout')); }
        });
        return;
      }

      // no GM_ available — use fetch with fallback
      (async () => {
        try {
          const r = await fetch(url, { cache: 'no-cache' });
          if (!r.ok) throw new Error('fetch status ' + r.status);
          const txt = await r.text();
          resolve(txt);
          return;
        } catch (err) {
          // fallback to puppeteer exposed fetch proxy
          if (typeof window.__FETCH_PROXY === 'function') {
            try {
              const text = await window.__FETCH_PROXY(url);
              resolve(text);
              return;
            } catch (err2) {
              reject(err2);
              return;
            }
          }
          reject(err);
        }
      })();
    });
  }

  async function fetchProxiesFromRandomSource() {
    const url = PROXY_URLS[Math.floor(Math.random() * PROXY_URLS.length)];
    console.log('[MERGED] fetching proxies from', url);
    try {
      const text = await gmFetchText(url);
      const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const proxies = lines.filter(l => /^[0-9.]+:[0-9]+$/.test(l));
      if (!proxies.length) throw new Error('no proxies parsed');
      return { url, proxies };
    } catch (e) {
      console.error('[MERGED] fetchProxies error:', e);
      return { url: null, proxies: [] };
    }
  }

  async function getNextProxies() {
    const { url, proxies } = await fetchProxiesFromRandomSource();
    if (!url) return [];

    const key = 'proxyOffset_' + url;
    let offset = parseInt(localStorage.getItem(key) || '0', 10) || 0;

    let result = proxies.slice(offset, offset + 100);
    if (result.length < 100 && proxies.length > 100) {
      const remain = 100 - result.length;
      result = result.concat(proxies.slice(0, remain));
      offset = remain;
    } else {
      offset += 100;
      if (offset >= proxies.length) offset = 0;
    }

    try { localStorage.setItem(key, String(offset)); } catch (e) { console.warn('[MERGED] setItem failed', e); }
    console.log('[MERGED] returning proxies, offset ->', offset);
    return result;
  }

  /* ---------- UI/DOM actions ---------- */
  function clickXPath(xpath) {
    const el = byXPath(xpath);
    if (el) { el.click(); console.log('[MERGED] clicked', xpath); return true; }
    console.warn('[MERGED] click target not found', xpath);
    return false;
  }

  function replacePrefixContainer() {
    const container = document.querySelector('.prefixContainer');
    if (!container) return false;
    const newContent = `<div class="prefixContainer"> ... (shortened for readability) ... </div>`;
    container.outerHTML = newContent;
    console.log('[MERGED] replaced prefixContainer');
    return true;
  }

  function replaceTitleWithRandom() {
    // simple random title (you can expand this list)
    const list = [
      'INSTANT SOCKS5 PROXIES',
      'UHQ SOCKS5 PROXYLIST',
      'PREMIUM SOCKS5 PROXIES - UPDATED',
      'FAST SOCKS5 PROXIES - HOURLY'
    ];
    const t = list[Math.floor(Math.random() * list.length)] + ' ' + Date.now();
    const el = byXPath(TITLE_TEXTAREA_XPATH);
    if (!el) { console.warn('[MERGED] title textarea not found'); return false; }
    if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
      el.value = t;
    } else {
      el.innerText = t;
    }
    console.log('[MERGED] replaced title textarea');
    return true;
  }

  async function replaceXPathWithProxies(retries = 5, retryDelay = 800) {
    for (let i = 1; i <= retries; ++i) {
      const target = byXPath(PROXY_TARGET_XPATH);
      if (!target) {
        console.warn(`[MERGED] target xpath missing attempt ${i}/${retries}. retrying in ${retryDelay}ms`);
        await sleep(retryDelay);
        continue;
      }

      const proxies = await getNextProxies();
      if (!proxies || proxies.length === 0) {
        console.warn('[MERGED] no proxies to inject');
        return false;
      }

      // clear and append proxies as <div> lines for stable rendering
      target.innerHTML = '';
      for (const p of proxies) {
        const d = document.createElement('div');
        d.textContent = p;
        target.appendChild(d);
      }

      console.log('[MERGED] injected', proxies.length, 'proxies into target.');
      return true;
    }

    console.error('[MERGED] failed to find target xpath after retries');
    return false;
  }

  /* ---------- userContent handling (localStorage) ---------- */
  function popUsedLinesUpTo100() {
    try {
      let uc = localStorage.getItem('userContent') || '';
      if (!uc.trim()) return;
      const lines = uc.split(/\r?\n/);
      const rest = lines.slice(100);
      localStorage.setItem('userContent', rest.join('\n'));
      console.log('[MERGED] updated userContent (sliced 100)');
    } catch (e) {
      console.warn('[MERGED] updating userContent failed', e);
    }
  }

  /* ---------- main flow ---------- */
  async function mainFlow() {
    console.log('[MERGED] mainFlow on', location.href);

    if (location.href === TARGET_POST_URL) {
      console.log('[MERGED] on post-thread start sequence');

      // wait for load
      if (document.readyState !== 'complete') {
        await new Promise(r => window.addEventListener('load', r));
      }

      // click create button
      if (!clickXPath(CREATE_BTN_XPATH)) {
        console.warn('[MERGED] create button click failed - continuing');
      }
      await sleep(1800);

      // replace prefix container
      replacePrefixContainer();

      // inject proxies (critical)
      const ok = await replaceXPathWithProxies();
      if (!ok) {
        console.error('[MERGED] Proxy injection failed — aborting submit.');
        return;
      }

      // replace title, submit
      replaceTitleWithRandom();
      await sleep(400);
      clickXPath(SUBMIT_BTN_XPATH);
      console.log('[MERGED] attempted submit');

      // maintain localStorage usage
      popUsedLinesUpTo100();

      return;
    }

    // For thread pages - you can add thread-specific logic if needed
    if (THREAD_MATCH.test(location.href)) {
      console.log('[MERGED] on a thread page — no auto action in merged script (keep for future)');
    }
  }

  // Start
  try {
    mainFlow().catch(e => console.error('[MERGED] runtime error', e));
  } catch (e) {
    console.error('[MERGED] outer error', e);
  }

})();
