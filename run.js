// run.js - URL-Based Script Injection with Auto Re-injection
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

// Load script files
function loadScript(filename) {
    const fullPath = path.join(SCRIPTS_FOLDER, filename);
    if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf8');
    }
    console.warn(`[runner] Script not found: ${fullPath}`);
    return null;
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

async function runAccount(browser, account) {
    console.log(`\n===== START ACCOUNT: ${account.name} =====`);
    let page;
    let lastActivity = Date.now();
    let restartCount = 0;
    let lastInjectedUrl = '';

    const touch = () => lastActivity = Date.now();

    // Load scripts
    const step1Script = loadScript('step1_plus_proxy_v2.js');
    const step2Script = loadScript('step2_v2.js');
    const autoReloadScript = loadScript('auto_reload_v2.js');

    async function openPage() {
        page = await browser.newPage();

        // Stealth settings
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1366, height: 768 });

        // Expose fetch proxy function
        await page.exposeFunction('__FETCH_PROXY', async (url) => {
            try {
                const result = await page.evaluate(async (fetchUrl) => {
                    try {
                        const res = await fetch(fetchUrl, {
                            cache: 'no-cache',
                            headers: {
                                'Accept': 'text/plain,*/*',
                                'Accept-Language': 'en-US,en;q=0.9'
                            }
                        });
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        return { success: true, text: await res.text() };
                    } catch (e) {
                        return { success: false, error: e.message };
                    }
                }, url);

                if (result.success) {
                    return result.text;
                } else {
                    throw new Error(result.error);
                }
            } catch (e) {
                console.error('[runner] __FETCH_PROXY error:', e.message);
                throw e;
            }
        });

        // Stealth evasions
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US','en'] });
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) =>
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters);
        });

        // Set cookies
        if (Array.isArray(account.cookies) && account.cookies.length) {
            const normalized = account.cookies.map(normalizeCookieForPuppeteer);
            await page.setCookie(...normalized);
            console.log('[runner] Cookies set');
        }

        // Logging
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.error(`[page:${account.name}]`, text);
            } else {
                console.log(`[page:${account.name}]`, text);
            }
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

        page.on('framenavigated', async (frame) => {
            if (frame === page.mainFrame()) {
                const url = frame.url();
                console.log(`[page:${account.name}] Navigated to:`, url);
                touch();

                // Re-inject scripts based on new URL
                await injectScriptsForUrl(url);
            }
        });
    }

    // Inject appropriate scripts based on URL
    async function injectScriptsForUrl(url) {
        // Always inject auto_reload
        if (autoReloadScript) {
            try {
                await page.addScriptTag({ content: autoReloadScript });
                console.log('[runner] Injected auto_reload');
            } catch (e) {
                console.error('[runner] Failed to inject auto_reload:', e.message);
            }
        }

        // Inject step1 only on post-thread page
        const isPostThread = url === "https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread" ||
                             url.startsWith("https://craxpro.to/forums/proxies-http-https-socks4-socks5/post-thread");

        if (isPostThread && step1Script) {
            console.log('[runner] URL is post-thread, injecting step1');
            try {
                await sleep(1500); // Wait for page to settle
                await page.addScriptTag({ content: step1Script });
                console.log('[runner] Injected step1');
                lastInjectedUrl = url;
            } catch (e) {
                console.error('[runner] Failed to inject step1:', e.message);
            }
            return;
        }

        // Inject step2 only on threads pages
        const isThreadsPage = /https:\/\/craxpro\.to\/threads\//.test(url);

        if (isThreadsPage && step2Script) {
            console.log('[runner] URL is threads page, injecting step2');
            try {
                await sleep(1000);
                await page.addScriptTag({ content: step2Script });
                console.log('[runner] Injected step2');
                lastInjectedUrl = url;
            } catch (e) {
                console.error('[runner] Failed to inject step2:', e.message);
            }
            return;
        }

        console.log('[runner] No specific script for this URL, only auto_reload injected');
    }

    async function initialNavigation() {
        const startUrl = account.startUrl;
        console.log('[runner] Navigating to:', startUrl);

        await page.goto(startUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        console.log('[runner] Initial page loaded');

        // Scripts will be injected by the framenavigated event
    }

    const watchdog = setInterval(async () => {
        const idle = Date.now() - lastActivity;
        if (idle > IDLE_TIMEOUT_MS) {
            restartCount++;
            console.log(`[watchdog] Restart ${restartCount}`);
            try {
                await page.reload({ waitUntil: 'networkidle2' });
                // Scripts will be re-injected by framenavigated
            } catch (e) {
                console.error('[watchdog] Reload failed:', e.message);
            }
            touch();

            if (restartCount >= MAX_RESTARTS_PER_ACCOUNT) {
                console.log('[watchdog] Max restarts reached');
                clearInterval(watchdog);
            }
        }
    }, WATCHDOG_INTERVAL_MS);

    const heartbeat = setInterval(async () => {
        if (page && !page.isClosed()) {
            try {
                await page.evaluate(() => document.title);
                touch();
            } catch (e) {
                console.error('[heartbeat] Error:', e.message);
            }
        }
    }, HEARTBEAT_MS);

    try {
        await openPage();
        await initialNavigation();

        const startTime = Date.now();
        console.log('[runner] Running for 60 minutes...');

        while (Date.now() - startTime < ONE_HOUR_MS) {
            const elapsed = Math.floor((Date.now() - startTime) / 60000);
            console.log(`[runner] Alive - ${elapsed} min | Last URL: ${lastInjectedUrl || 'none'}`);
            await sleep(60000);
        }

    } catch (e) {
        console.error('[runner] ERROR:', e.message);
    } finally {
        clearInterval(watchdog);
        clearInterval(heartbeat);
        try {
            await page.close();
        } catch (e) {}
        console.log(`===== END ACCOUNT: ${account.name} =====`);
    }
}

async function main() {
    // Load accounts
    let accounts;
    if (process.env.ACCOUNTS_JSON) {
        accounts = JSON.parse(process.env.ACCOUNTS_JSON);
    } else if (fs.existsSync('./accounts.json')) {
        console.log('[runner] Loading accounts from accounts.json');
        accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
    } else {
        console.error('ACCOUNTS_JSON missing and accounts.json not found');
        process.exit(1);
    }

    console.log(`[runner] Starting with ${accounts.length} account(s)`);

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    });

    for (const account of accounts) {
        await runAccount(browser, account);
    }

    await browser.close();
    console.log('[runner] All accounts done.');
}

main().catch(e => {
    console.error('[runner] FATAL ERROR:', e);
    process.exit(1);
});
