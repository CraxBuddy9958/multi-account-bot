// run.js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const ONE_HOUR_MS = 60 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const WATCHDOG_INTERVAL_MS = 30 * 1000;
const MAX_RESTARTS_PER_ACCOUNT = 5;
const SCRIPTS_FOLDER = path.join(__dirname, 'userscripts');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function readCombinedScripts(files) {
  let combined = '';
  for (const rel of files) {
    const full = path.join(SCRIPTS_FOLDER, rel);
    if (fs.existsSync(full)) {
      combined += `\n/* ---- ${rel} ---- */\n` + fs.readFileSync(full, 'utf8') + '\n';
    }
  }
  return combined;
}

function normalizeCookieForPuppeteer(c) {
  const cookie = {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    httpOnly: !!c.httpOnly,
    secure: !!c.secure
  };

  if (c.expirationDate && !c.session) {
    cookie.expires = Math.floor(Number(c.expirationDate));
  }

  if (c.sameSite) {
    const s = String(c.sameSite).toLowerCase();
    if (['lax','strict','none'].includes(s)) cookie.sameSite = s;
  }

  return cookie;
}

async function runAccount(browser, account, combinedScriptContent) {
  console.log(`\n===== START ACCOUNT: ${account.name} =====`);
  let page;
  let lastActivity = Date.now();
  let restartCount = 0;

  const touch = () => lastActivity = Date.now();

  async function openPage() {
    page = await browser.newPage();

    // ===== STEALTH HARDENING =====
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1366, height: 768 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      window.chrome = { runtime: {} };

      Object.defineProperty(navigator, 'plugins', {
        get: () => [1,2,3,4,5]
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US','en']
      });

      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    });

    // ===== COOKIES =====
    if (Array.isArray(account.cookies) && account.cookies.length) {
      const normalized = account.cookies.map(normalizeCookieForPuppeteer);
      await page.setCookie(...normalized);
      console.log('[runner] cookies set');
    }

    // ===== LOGGING =====
    page.on('console', msg => {
      console.log(`[page:${account.name}]`, msg.text());
      touch();
    });

    page.on('pageerror', err => {
      console.error(`[page:${account.name}] PAGE ERROR:`, err.message);
      touch();
    });

    page.on('requestfailed', req => {
      console.error(`[page:${account.name}] REQUEST FAILED:`, req.url());
      touch();
    });

    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        console.log(`[page:${account.name}] Navigated to: ${frame.url()}`);
        touch();
      }
    });
  }

  async function injectScripts() {
    const startUrl = account.startUrl;
    await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('[runner] Opened startUrl');

    await page.addScriptTag({ content: combinedScriptContent });
    console.log('[runner] Injected userscripts');
  }

  const watchdog = setInterval(async () => {
    const idle = Date.now() - lastActivity;
    if (idle > IDLE_TIMEOUT_MS) {
      restartCount++;
      console.log(`[watchdog] Restart ${restartCount}`);
      await page.reload({ waitUntil: 'networkidle2' });
      touch();

      if (restartCount >= MAX_RESTARTS_PER_ACCOUNT) {
        console.log('[watchdog] Max restarts reached');
        clearInterval(watchdog);
      }
    }
  }, WATCHDOG_INTERVAL_MS);

  const heartbeat = setInterval(async () => {
    if (page && !page.isClosed()) {
      await page.evaluate(() => document.title);
      touch();
    }
  }, HEARTBEAT_MS);

  try {
    await openPage();
    await injectScripts();

    const startTime = Date.now();
    console.log('[runner] Running 60 minutes...');

    while (Date.now() - startTime < ONE_HOUR_MS) {
      console.log(`[runner] alive - ${Math.floor((Date.now()-startTime)/60000)} min`);
      await sleep(60000);
    }

  } catch (e) {
    console.error('[runner] ERROR:', e.message);
  } finally {
    clearInterval(watchdog);
    clearInterval(heartbeat);
    await page.close();
    console.log(`===== END ACCOUNT: ${account.name} =====`);
  }
}

async function main() {
  if (!process.env.ACCOUNTS_JSON) {
    console.error('ACCOUNTS_JSON missing');
    process.exit(1);
  }

  const accounts = JSON.parse(process.env.ACCOUNTS_JSON);

  const combined = readCombinedScripts([
    'step1_plus_proxy.injectable.js',
    'auto_reload.injectable.js',
    'step2.injectable.js'
  ]);

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  for (const account of accounts) {
    await runAccount(browser, account, combined);
  }

  await browser.close();
  console.log('[runner] All accounts done.');
}

main();
