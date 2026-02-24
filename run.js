const fs = require('fs');
const puppeteer = require('puppeteer');

const ONE_HOUR = 60 * 60 * 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAccount(browser, account, scriptContent) {
  console.log("Running:", account.name);

  const page = await browser.newPage();

  await page.setCookie(...account.cookies);
  await page.goto(account.startUrl, { waitUntil: 'networkidle2' });

  await page.evaluate(scriptContent);

  await sleep(ONE_HOUR);

  await page.close();
}

async function main() {
  const accounts = JSON.parse(process.env.ACCOUNTS_JSON);

  const scriptContent = fs.readFileSync('./userscripts/step1.user.js', 'utf8');

  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: true
  });

  for (const account of accounts) {
    await runAccount(browser, account, scriptContent);
  }

  await browser.close();
}

main();
