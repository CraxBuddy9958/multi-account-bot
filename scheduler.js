// ============================================
// 25-HOUR CYCLE SCHEDULER - EASY TIME CONFIG
// ============================================

// ⚡⚡⚡ EDIT THESE 2 LINES TO CHANGE START TIME ⚡⚡⚡
const START_HOUR_IST = 22;      // 0-23 (22 = 10 PM)
const START_MINUTE_IST = 20;    // 0-59 (20 = 20 minutes)

// ============================================
// DON'T TOUCH BELOW THIS LINE
// ============================================

const { spawn } = require('child_process');
const fs = require('fs');

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FIVE_HOURS_MS = 25 * 60 * 60 * 1000;

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

async function main() {
  log('📅 25-Hour Cycle Scheduler');
  log(`⚡ Configured start time: ${START_HOUR_IST}:${START_MINUTE_IST.toString().padStart(2, '0')} PM IST`);
  
  // Calculate first run time in IST
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  let target = new Date(istTime);
  target.setHours(START_HOUR_IST, START_MINUTE_IST, 0, 0);
  
  // If target time already passed today, move to tomorrow
  if (target <= istTime) {
    target.setDate(target.getDate() + 1);
  }
  
  const waitMs = target.getTime() - istTime.getTime();
  const waitHours = Math.floor(waitMs / (1000 * 60 * 60));
  const waitMinutes = Math.floor((waitMs % (1000 * 60 * 60)) / (1000 * 60));
  
  log(`⏳ First run in ${waitHours}h ${waitMinutes}m`);
  log(`📅 First run at: ${target.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  
  await sleep(waitMs);
  
  // Main loop
  while (true) {
    await runBot();
    
    const nextRun = new Date(Date.now() + TWENTY_FIVE_HOURS_MS);
    log(`😴 Sleeping 25 hours`);
    log(`⏰ Next run: ${nextRun.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
    
    await sleep(TWENTY_FIVE_HOURS_MS);
  }
}

main().catch(error => {
  log(`💥 Fatal error: ${error.message}`);
  process.exit(1);
});
