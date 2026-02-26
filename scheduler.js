// ============================================
// CUSTOM LAUNCH TIME + 25-HOUR CYCLE SCHEDULER
// ============================================

// ⚡⚡⚡ SET YOUR LAUNCH TIME HERE (IST) ⚡⚡⚡
const LAUNCH_HOUR_IST = 23;      // 23 = 11 PM
const LAUNCH_MINUTE_IST = 36;    // 27 minutes = 11:27 PM IST

// ============================================
// DON'T TOUCH BELOW THIS LINE
// ============================================

const { spawn } = require('child_process');
const fs = require('fs');

const ONE_HOUR_MS = 60 * 60 * 1000;
const CYCLE_HOURS_MS = 25 * 60 * 60 * 1000;  // 25 hours

function log(message) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const logMsg = `[${timestamp} IST] ${message}`;
  console.log(logMsg);
  fs.appendFileSync('/tmp/scheduler.log', logMsg + '\n');
}

function runBot() {
  return new Promise((resolve) => {
    log('🚀 Starting bot for 1 hour...');
    
    const bot = spawn('node', ['run.js'], {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    // Safety kill after 65 minutes
    const safetyTimeout = setTimeout(() => {
      log('⏰ Safety timeout - killing bot');
      bot.kill('SIGTERM');
    }, 65 * 60 * 1000);

    bot.on('close', (code) => {
      clearTimeout(safetyTimeout);
      log(`✅ Bot finished (code ${code})`);
      resolve();
    });
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTimeUntilLaunch() {
  const now = new Date();
  
  // Get current time in IST
  const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  // Create target time for today in IST
  const targetIST = new Date(nowIST);
  targetIST.setHours(LAUNCH_HOUR_IST, LAUNCH_MINUTE_IST, 0, 0);
  
  // If target time already passed today, schedule for tomorrow
  if (targetIST <= nowIST) {
    targetIST.setDate(targetIST.getDate() + 1);
  }
  
  // Calculate wait time in milliseconds
  const waitMs = targetIST.getTime() - nowIST.getTime();
  
  return { waitMs, targetIST };
}

async function main() {
  log('📅 25-Hour Cycle Scheduler');
  log(`⚡ Launch time set: ${LAUNCH_HOUR_IST}:${LAUNCH_MINUTE_IST.toString().padStart(2, '0')} IST`);
  
  // Calculate time until first launch
  const { waitMs, targetIST } = getTimeUntilLaunch();
  const waitHours = Math.floor(waitMs / (1000 * 60 * 60));
  const waitMinutes = Math.floor((waitMs % (1000 * 60 * 60)) / (1000 * 60));
  
  log(`⏳ First launch in ${waitHours}h ${waitMinutes}m`);
  log(`📅 Launch time: ${targetIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  
  // Wait until launch time
  await sleep(waitMs);
  
  // Main loop - run, then wait 25 hours
  while (true) {
    await runBot();
    
    const nextRun = new Date(Date.now() + CYCLE_HOURS_MS);
    log(`😴 Sleeping 25 hours...`);
    log(`⏰ Next run at: ${nextRun.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
    
    await sleep(CYCLE_HOURS_MS);
  }
}

main().catch(error => {
  log(`💥 Fatal error: ${error.message}`);
  process.exit(1);
});
