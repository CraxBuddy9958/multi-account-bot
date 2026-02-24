// run.js
// Puppeteer runner for your injectable userscripts.
// Expects ACCOUNTS_JSON env var (stringified JSON array).
// Node 18+ recommended (has global fetch). If not, node-fetch will be used dynamically.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ONE_HOUR_MS = 60 * 60 * 1000;        // runtime per account (change for testing)
const HEARTBEAT_MS = 60 * 1000;            // tiny activity to keep connection alive
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;     // consider the page stuck if idle for this long (5 min)
const WATCHDOG_INTERVAL_MS = 30 * 1000;    // check watchdog every 30s
const MAX_RESTARTS_PER_ACCOUNT = 5;        // how many reloads before we give up on account
const SCRIPTS_FOLDER = path.join(__dirname, 'userscripts');

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function ensureFetchAvailable() {
  if (typeof fetch !== 'undefined') return fetch;
  // dynamic import of node-fetch if global fetch not present
  try {
    const mod = await import('node-fetch');
    return mod.default;
  } catch (e) {
    console.warn('[runner] node-fetch dynamic import failed — outbound fetch may not work');
    throw e;
  }
}

/**
 * Expose __FETCH_PROXY to the page: server-side fetch (bypasses CORS)
 * returns text body.
 */
async function createFetchProxyFn() {
  const _fetch = await ensureFetchAvailable();
  return async function (url, opts = {}) {
    const res = await _fetch(url, { cache: 'no-cache', ...opts });
    if (!res.ok) throw new Error('proxy fetch failed: ' + res.status);
    return await res.text();
  };
}

/**
 * Read and combine injectable scripts from userscripts folder.
 * Files expected to be named *.injectable.js (but we just read specific list).
 */
function readCombinedScripts(listOfFiles) {
  let combined = '';
  for (const relative of listOfFiles) {
    const full = path.join(SCRIPTS_FOLDER, relative);
    if (fs.existsSync(full)) {
      combined += `\n/* ---- ${relative} ---- */\n` + fs.readFileSync(full, 'utf8') + '\n';
    } else {
      console.warn('[runner] missing script:', relative);
    }
  }
  return combined;
}

/**
 * Main per-account runner.
 * - opens a page
 * - exposes __FETCH_PROXY
 * - sets cookies
 * - injects scripts
 * - monitors logs / network / errors
 * - watchdog to reload if stuck
 */
async function runAccount(browser, account, combinedScriptContent) {
  console.log(`\n\n===== START ACCOUNT: ${account.name} =====`);
  let page;
  let restartCount = 0;
  let lastActivity = Date.now();

  // helper to update activity timestamp
  const touch = () => { lastActivity = Date.now(); };

  // create a function that starts/opens the page and wires events
  async function openAndWirePage() {
    page = await browser.newPage();

    // sync UA (optional): you can set a custom UA if needed for stealth
    // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...');

    // expose server-side fetch for CORS bypass
    const proxyFn = await createFetchProxyFn();
    await page.exposeFunction('__FETCH_PROXY', async (url, opts) => {
      touch();
      return proxyFn(url, opts);
    });

    // set cookies if provided
    if (Array.isArray(account.cookies) && account.cookies.length) {
      try {
        await page.setCookie(...account.cookies);
        console.log('[runner] cookies set for', account.name);
      } catch (e) {
        console.warn('[runner] setCookie failed:', e.message);
      }
    }

    // forward page console messages
    page.on('console', msg => {
      try {
        const text = msg.text();
        console.log(`[page:${account.name}] console:`, text);
        touch();
      } catch (e) { /* ignore */ }
    });

    page.on('pageerror', err => {
      console.error(`[page:${account.name}] PAGE ERROR:`, err && err.message ? err.message : err);
      touch();
    });

    page.on('requestfailed', req => {
      console.error(`[page:${account.name}] REQUEST FAILED: ${req.url()} -> ${req.failure && req.failure.errorText}`);
      touch();
    });

    page.on('response', res => {
      // small log to see successful responses (avoid spamming)
      const status = res.status();
      const url = res.url();
      if (status >= 400 || url.includes('raw.githubusercontent.com')) {
        console.log(`[page:${account.name}] RESPONSE ${status}: ${url}`);
      }
      touch();
    });

    // navigation listener
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
    const startUrl = account.startUrl || 'https://craxpro.io/forums/proxies-http-https-socks4-socks5/post-thread';
    try {
      await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      console.log(`[runner] Opened startUrl for ${account.name}: ${startUrl}`);
      touch();
    } catch (e) {
      console.warn('[runner] initial goto warning:', e.message);
      // continue — page may still be usable
    }

    // inject combined script
    try {
      await page.addScriptTag({ content: combinedScriptContent });
      console.log('[runner] Injected userscripts');
      touch();
    } catch (e) {
      console.error('[runner] script injection failed:', e.message);
      // try direct evaluate fallback
      try {
        await page.evaluate(combinedScriptContent);
        console.log('[runner] Injected userscripts via evaluate fallback');
        touch();
      } catch (ee) {
        console.error('[runner] evaluate fallback failed:', ee.message);
        throw ee;
      }
    }
  }

  // watchdog loop to detect idle and reload
  let watchdogIntervalHandle = null;
  function startWatchdog() {
    watchdogIntervalHandle = setInterval(async () => {
      try {
        const idle = Date.now() - lastActivity;
        if (idle > IDLE_TIMEOUT_MS) {
          restartCount++;
          console.warn(`[runner][watchdog] Idle for ${Math.round(idle/1000)}s. Restart #${restartCount} for ${account.name}`);
          try {
            // try a soft reload first
            if (page && !page.isClosed()) {
              await page.reload({ waitUntil: 'networkidle2', timeout: 60000 }).catch(e => {
                console.warn('[runner] reload failed:', e.message);
              });
              touch();
            } else {
              console.warn('[runner] page closed, re-opening');
              await closePageQuietly();
              await openAndWirePage();
              await injectAndStart();
            }
          } catch (e) {
            console.error('[runner] watchdog reload error:', e.message);
          }

          // if too many restarts, give up on this account
          if (restartCount >= MAX_RESTARTS_PER_ACCOUNT) {
            console.error(`[runner][watchdog] Reached max restarts (${MAX_RESTARTS_PER_ACCOUNT}). Aborting account ${account.name}.`);
            clearInterval(watchdogIntervalHandle);
            // close page and throw special signal
            try { await closePageQuietly(); } catch(e){}
            throw new Error('MAX_RESTARTS_REACHED');
          }
        }
      } catch (e) {
        // propagate the abort signal upward by re-throwing
        watchdogIntervalHandle && clearInterval(watchdogIntervalHandle);
        throw e;
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  // heartbeat to keep the connection alive
  let heartbeatHandle = null;
  function startHeartbeat() {
    heartbeatHandle = setInterval(async () => {
      try {
        if (page && !page.isClosed()) {
          await page.evaluate(() => { void document.title; });
        }
        touch();
      } catch (e) {
        console.warn('[runner] heartbeat failed', e.message);
      }
    }, HEARTBEAT_MS);
  }

  // overall flow per account
  try {
    await openAndWirePage();
    await injectAndStart();
    startWatchdog();
    startHeartbeat();

    console.log(`[runner] Account ${account.name} will run for ${Math.round(ONE_HOUR_MS/60000)} minutes...`);
    // Keep running for ONE_HOUR_MS or until watchdog throws 'MAX_RESTARTS_REACHED'
    const startTs = Date.now();
    while (Date.now() - startTs < ONE_HOUR_MS) {
      // we periodically log progress to terminal
      const passed = Math.round((Date.now() - startTs) / 60000);
      console.log(`[runner] ${account.name}: running (${passed} min elapsed) - lastActivity ${(Date.now()-lastActivity)/1000}s ago`);
      await sleep(60 * 1000); // log every 60s
    }

    // finished normally
    console.log(`[runner] Completed ${Math.round(ONE_HOUR_MS/60000)} minutes for ${account.name}`);
  } catch (err) {
    // If watcher aborts because of MAX_RESTARTS, err.message === 'MAX_RESTARTS_REACHED'
    console.error(`[runner] Account ${account.name} ended with error:`, err.message || err);
  } finally {
    try { heartbeatHandle && clearInterval(heartbeatHandle); } catch(e){}
    try { watchdogIntervalHandle && clearInterval(watchdogIntervalHandle); } catch(e){}
    await closePageQuietly();
    console.log(`===== END ACCOUNT: ${account.name} =====\n`);
  }
}

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
    console.error('Failed to parse ACCOUNTS_JSON:', e.message);
    process.exit(1);
  }

  // list of userscript filenames (relative to userscripts folder)
  const scriptFiles = [
    'replace_proxies.injectable.js',
    'auto_reload.injectable.js',
    'step1.injectable.js',
    'step2.injectable.js'
  ];

  const combined = readCombinedScripts(scriptFiles);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  });

  for (const account of accounts) {
    try {
      await runAccount(browser, account, combined);
    } catch (e) {
      // if runAccount throws because of MAX_RESTARTS, we continue to next account
      console.error('[runner] runAccount threw:', e && e.message ? e.message : e);
    }
  }

  await browser.close();
  console.log('[runner] All accounts processed. Exiting.');
}

main().catch(e => {
  console.error('[runner] fatal error:', e && e.stack ? e.stack : e);
  process.exit(1);
});
