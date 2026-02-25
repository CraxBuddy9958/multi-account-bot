// scheduler.js - 25-hour cycle scheduler
const { spawn } = require('child_process');
const fs = require('fs');

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FIVE_HOURS_MS = 25 * 60 * 60 * 1000;

function log(message) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const logMsg = `[${timestamp} IST] ${message}`;
  console.log(logMsg);
  fs.appendFileSync('scheduler.log', logMsg + '\n');
}

function runBot() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting bot for 1 hour...');
    
    const bot = spawn('node', ['run.js'], {
      stdio: 'inherit',
      env: process.env
    });

    bot.on('close', (code) => {
      if (code === 0) {
        log('✅ Bot completed successfully');
        resolve();
      } else {
        log(`❌ Bot exited with code ${code}`);
        reject(new Error(`Exit code ${code}`));
      }
    });

    bot.on('error', (err) => {
      log(`💥 Failed to start bot: ${err.message}`);
      reject(err);
    });
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('📅 25-Hour Cycle Scheduler Started');
  log('⏰ First run starting immediately...');
  
  // Optional: Wait until specific IST time for first run
  // Uncomment below to start at specific time (e.g., 10:20 PM IST)
  /*
  const now = new Date();
  const targetHour = 22; // 10 PM
  const targetMin = 20;
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const target = new Date(istNow);
  target.setHours(targetHour, targetMin, 0, 0);
  
  if (target <= istNow) {
    target.setDate(target.getDate() + 1);
  }
  
  const waitMs = target - istNow;
  log(`⏳ Waiting until ${target.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} IST`);
  await sleep(waitMs);
  */
  
  while (true) {
    try {
      await runBot();
    } catch (error) {
      log(`⚠️ Error: ${error.message}`);
      log('🔄 Retrying in 5 minutes...');
      await sleep(5 * 60 * 1000);
      continue;
    }
    
    log('😴 Bot finished. Sleeping for 25 hours...');
    log(`⏰ Next run at: ${new Date(Date.now() + TWENTY_FIVE_HOURS_MS).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
    
    await sleep(TWENTY_FIVE_HOURS_MS);
  }
}

main().catch(error => {
  log(`💥 Fatal error: ${error.message}`);
  process.exit(1);
});
