// ============================================
// 25-HOUR CYCLE SCHEDULER - EASY TIME CONFIG
// ============================================

// ⚡⚡⚡ EDIT THESE 2 LINES TO CHANGE START TIME ⚡⚡⚡
const START_HOUR_IST = 23;      // 0-23 (22 = 10 PM)
const START_MINUTE_IST = 22;    // 0-59 (33 = 33 minutes)

// ============================================
// DON'T TOUCH BELOW THIS LINE
// ============================================

const { spawn } = require('child_process');
const fs = require('fs');

const ONE_HOUR_MS = 60 * 60 * 1000;
const CYCLE_HOURS_MS = 24 * 60 * 60 * 1000;  // Changed to 24 hours for daily

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
  log('📅 24-Hour Daily Scheduler');
  log(`⚡ Configured start time: ${START_HOUR_IST}:${START_MINUTE_IST.toString().padStart(2, '0')} IST`);
  
  // Get current time in IST
  const now = new Date();
  const istOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', 
                       hour12: false, day: '2-digit', month: '2-digit', year: 'numeric' };
  const istStr = now.toLocaleString('en-IN', istOptions);
  
  // Calculate target time
  const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const targetIST = new Date(nowIST);
  targetIST.setHours(START_HOUR_IST, START_MINUTE_IST, 0, 0);
  
  // If target time already passed today, move to tomorrow
  if (targetIST <= nowIST) {
    targetIST.setDate(targetIST.getDate() + 1);
  }
  
  const waitMs = targetIST - nowIST;
  const waitHours = Math.floor(waitMs / (1000 * 60 * 60));
  const waitMinutes = Math.floor((waitMs % (1000 * 60 * 60)) / (1000 * 60));
  
  log(`⏳ First run in ${waitHours}h ${waitMinutes}m`);
  log(`📅 First run at: ${targetIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  
  await sleep(waitMs);
  
  // Main loop
  while (true) {
    await runBot();
    
    const nextRun = new Date(Date.now() + CYCLE_HOURS_MS);
    log(`😴 Sleeping 24 hours until next run`);
    log(`⏰ Next run: ${nextRun.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
    
    await sleep(CYCLE_HOURS_MS);
  }
}

main().catch(error => {
  log(`💥 Fatal error: ${error.message}`);
  process.exit(1);
});
