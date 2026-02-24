// run.js
// Puppeteer runner for injectable userscripts with cookie normalization.
// Expects ACCOUNTS_JSON env var (stringified JSON array).
// Node 18+ recommended for global fetch support.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

//
// Config
//
const ONE_HOUR_MS = 60 * 60 * 1000;        // runtime per account (change to 60*1000 for quick testing)
const HEARTBEAT_MS = 60 * 1000;            // keepalive heartbeat interval
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;     // consider page idle after this (5 min)
const WATCHDOG_INTERVAL_MS = 30 * 1000;    // watchdog check interval
const MAX_RESTARTS_PER_ACCOUNT = 5;        // max reload attempts per account
const SCRIPTS_FOLDER = path.join(__dirname, 'userscripts');

//
// Helpers
//
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function ensureFetchAvailable() {
  if (typeof fetch !== 'undefined') return fetch;
  // dynamic import node-fetch for older Node versions
  try {
    const mod = await import('node-fetch');
    return mod.default;
  } catch (e) {
    console.warn('[runner] node-fetch import failed; fetch not available');
    throw e;
  }
}

async function createFetchProxyFn() {
  const _fetch = await ensureFetchAvailable();
  return async function (url, opts = {}) {
    const res = await _fetch(url, { cache: 'no-cache', ...opts });
    if (!res.ok) throw new Error('proxy fetch failed: ' + res.status);
    return await res.text();
  };
}

function readCombinedScripts(listOfFiles) {
  let combined = '';
  for (const rel of listOfFiles) {
    const full = path.join(SCRIPTS_FOLDER, rel);
    if (fs.existsSync(full)) {
      combined += `\n/* ---- ${rel} ---- */\n` + fs.readFileSync(full, 'utf8') + '\n';
    } else {
      console.warn('[runner] missing script file:', rel);
    }
  }
  return combined;
}

function normalizeCookieForPuppeteer(c) {
  // c: cookie object exported from Cookie Editor
  const cookie = {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    httpOnly: !!c.httpOnly,
    secure: !!c.secure
  };

  // expirationDate (Cookie Editor) => Puppeteer 'expires' (seconds since epoch)
  if (c.expirationDate && !c.session) {
    // some exports use expirationDate as float seconds; Puppeteer accepts number (seconds)
    cookie.expires = Math.floor(Number(c.expirationDate));
  }

  // sameSite normalization
  if (c.sameSite) {
    const s = String(c.sameSite).toLowerCase();
    if (s === 'lax' || s === 'strict' || s === 'none') cookie.sameSite = s;
  }

  return cookie;
}

//
// Per-account runner
//
async function runAccount(browser, account, combinedScriptContent) {
  console.log(`\n\n===== START ACCOUNT: ${account.name} =====`);
  let page = null;
  let restartCount = 0;
  let lastActivity = Date.now();

  const touch = () => { lastActivity = Date.now(); };

  async function openAndWirePage() {
    page = await browser.newPage();

    // Optional: set a real UA and viewport for better stealth
    // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    // await page.setViewport({ width: 1366, height: 768 });

    // expose __FETCH_PROXY using server-side fetch
    const proxyFn = await createFetchProxyFn();
    await page.exposeFunction('__FETCH_PROXY', async (url, opts) => {
      touch();
      return proxyFn(url, opts);
    });

    // set cookies (if any)
    if (Array.isArray(account.cookies) && account.cookies.length) {
      try {
        const normalized = account.cookies.map(normalizeCookieForPuppeteer);
        await page.setCookie(...normalized);
        console.log('[runner] cookies set for', account.name);
      } catch (e) {
        console.warn('[runner] setCookie failed for', account.name, e && e.message ? e.message : e);
      }
    }

    // forward page console -> node console
    page.on('console', msg => {
      try {
        console.log(`[page:${account.name}] console:`, msg.text());
        touch();
      } catch (e) {}
    });

    page.on('pageerror', err => {
      console.error(`[page:${account.name}] PAGE ERROR:`, err && err.message ? err.message : err);
      touch();
    });

    page.on('requestfailed', req => {
      try {
        console.error(`[page:${account.name}] REQUEST FAILED: ${req.url()} -> ${req.failure && req.failure.errorText}`);
      } catch (e) {}
      touch();
    });

    page.on('response', res => {
      try {
        const status = res.status();
        const url = res.url();
        // only print if error or interesting domain to avoid huge logs
        if (status >= 400 || url.includes('raw.githubusercontent.com')) {
          console.log(`[page:${account.name}] RESPONSE ${status}: ${url}`);
        }
      } catch (e) {}
      touch();
    });

    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        console.log(`[page:${account.name}] Navigated to: ${frame.url()}`);
        touch();
      }
    });

    return page;
  }

  async function closePageQuietly() {
    try { if (page && !page.isClosed()) await page.close(); } catch (e) {}
    page = null;
  }

  async function injectAndStart() {
    const startUrl = account.startUrl || 'https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread';
    try {
      await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      console.log(`[runner] Opened startUrl for ${account.name}: ${startUrl}`);
      touch();
    } catch (e) {
      console.warn('[runner] initial goto warning (continuing):', e && e.message ? e.message : e);
      // continue anyway; page might partially load
    }

    // inject combined userscripts
    try {
      await page.addScriptTag({ content: combinedScriptContent });
      console.log('[runner] Injected userscripts');
      touch();
    } catch (e) {
      console.error('[runner] script injection failed:', e && e.message ? e.message : e);
      // fallback evaluate
      try {
        await page.evaluate(combinedScriptContent);
        console.log('[runner] Injected via evaluate fallback');
        touch();
      } catch (ee) {
        console.error('[runner] evaluate fallback failed:', ee && ee.message ? ee.message : ee);
        throw ee;
      }
    }
  }

  // watchdog: reload or re-open page if idle
  let watchdogHandle = null;
  function startWatchdog() {
    watchdogHandle = setInterval(async () => {
      try {
        const idle = Date.now() - lastActivity;
        if (idle > IDLE_TIMEOUT_MS) {
          restartCount++;
          console.warn(`[runner][watchdog] ${account.name} idle ${Math.round(idle/1000)}s. Restart #${restartCount}`);
          try {
            if (page && !page.isClosed()) {
              await page.reload({ waitUntil: 'networkidle2', timeout: 60000 }).catch(e => {
                console.warn('[runner] reload failed:', e && e.message ? e.message : e);
              });
              touch();
            } else {
              await closePageQuietly();
              await openAndWirePage();
              await injectAndStart();
              touch();
            }
          } catch (e) {
            console.error('[runner] watchdog reload error:', e && e.message ? e.message : e);
          }

          if (restartCount >= MAX_RESTARTS_PER_ACCOUNT) {
            console.error(`[runner][watchdog] Max restarts reached (${MAX_RESTARTS_PER_ACCOUNT}) for ${account.name}. Aborting account.`);
            clearInterval(watchdogHandle);
            // ensure page closed and throw a signal to outer flow
            try { await closePageQuietly(); } catch(_) {}
            throw new Error('MAX_RESTARTS_REACHED');
          }
        }
      } catch (err) {
        // propagate abort
        clearInterval(watchdogHandle);
        throw err;
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  // heartbeat to keep connection alive
  let heartbeatHandle = null;
  function startHeartbeat() {
    heartbeatHandle = setInterval(async () => {
      try {
        if (page && !page.isClosed()) await page.evaluate(() => { void document.title; });
        touch();
      } catch (e) {
        console.warn('[runner] heartbeat failed', e && e.message ? e.message : e);
      }
    }, HEARTBEAT_MS);
  }

  // main per-account flow
  try {
    await openAndWirePage();
    await injectAndStart();
    startWatchdog();
    startHeartbeat();

    console.log(`[runner] Account ${account.name} will run for ${Math.round(ONE_HOUR_MS/60000)} minutes...`);
    const startTs = Date.now();

    while (Date.now() - startTs < ONE_HOUR_MS) {
      const elapsedMin = Math.floor((Date.now() - startTs) / 60000);
      console.log(`[runner] ${account.name}: running (${elapsedMin} min elapsed) - lastActivity ${Math.round((Date.now()-lastActivity)/1000)}s ago`);
      await sleep(60 * 1000); // log every minute
    }

    console.log(`[runner] Completed ${Math.round(ONE_HOUR_MS/60000)} minutes for ${account.name}`);
  } catch (err) {
    console.error(`[runner] Account ${account.name} ended with error:`, err && err.message ? err.message : err);
  } finally {
    try { heartbeatHandle && clearInterval(heartbeatHandle); } catch(_) {}
    try { watchdogHandle && clearInterval(watchdogHandle); } catch(_) {}
    await closePageQuietly();
    console.log(`===== END ACCOUNT: ${account.name} =====\n`);
  }
}

//
// Main
//
async function main() {
  if (!process.env.ACCOUNTS_JSON) {
    console.error('ACCOUNTS_JSON env missing. Create a secret with your accounts JSON (see README). Exiting.');
    process.exit(1);
  }

  let accounts;
  try {
    accounts = JSON.parse(process.env.ACCOUNTS_JSON);
    if (!Array.isArray(accounts)) throw new Error('ACCOUNTS_JSON must be an array');
  } catch (e) {
    console.error('Failed to parse ACCOUNTS_JSON:', e && e.message ? e.message : e);
    process.exit(1);
  }

  // List of userscript filenames placed in userscripts/
  const scriptFiles = [
    'step1_plus_proxy.injectable.js', // your combined Step1 + proxy
    'auto_reload.injectable.js',
    'step2.injectable.js'
  ];

  const combined = readCombinedScripts(scriptFiles);
  if (!combined) console.warn('[runner] combined script is empty — check userscripts folder');

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });

  for (const account of accounts) {
    try {
      await runAccount(browser, account, combined);
    } catch (e) {
      console.error('[runner] runAccount threw:', e && e.message ? e.message : e);
      // continue with next account even on errors
    }
  }

  await browser.close();
  console.log('[runner] All accounts processed. Exiting.');
}

main().catch(e => {
  console.error('[runner] fatal error:', e && e.stack ? e.stack : e);
  process.exit(1);
});
