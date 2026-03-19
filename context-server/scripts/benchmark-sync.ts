import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// We need to bypass the database initialization for the benchmark since we are purely
// testing the file I/O operations of the load/dump context ledger commands.
// Actually, it's easier to mock the db module.

// A simple script to benchmark the sync file reading vs async file reading.
// We'll run an event loop timer and see how much it gets delayed.

const testDir = path.join(process.cwd(), '.aigit');
const testFile = path.join(testDir, 'ledger.json');

// Generate ~50MB ledger.json
function generateMockLedger() {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const largeString = 'a'.repeat(1024 * 10); // 10KB string
  const items = Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    content: largeString,
  }));

  const data = {
    projects: [],
    agents: [],
    sessions: [],
    tasks: items,
    decisions: [],
    memories: [],
    healingEvents: []
  };

  fs.writeFileSync(testFile, JSON.stringify(data));
}

async function measureEventLoopDelay(fn: () => Promise<void> | void) {
  let maxDelay = 0;
  let running = true;

  const timer = setInterval(() => {
    const start = performance.now();
    setImmediate(() => {
      const delay = performance.now() - start;
      if (delay > maxDelay) {
        maxDelay = delay;
      }
    });
  }, 1);

  const startTime = performance.now();
  await fn();
  const duration = performance.now() - startTime;

  running = false;
  clearInterval(timer);

  return { duration, maxDelay };
}

async function runBenchmark() {
  console.log('Generating mock ledger.json (~50MB)...');
  generateMockLedger();

  console.log('Running benchmark...');


  const resultsSync = await measureEventLoopDelay(() => {
    const ledgerData = fs.readFileSync(testFile, 'utf8');
    JSON.parse(ledgerData);
  });

  console.log(`Synchronous read (baseline):`);
  console.log(`  Duration: ${resultsSync.duration.toFixed(2)}ms`);
  console.log(`  Max Event Loop Delay: ${resultsSync.maxDelay.toFixed(2)}ms`);

  const resultsAsync = await measureEventLoopDelay(async () => {
    const ledgerData = await fs.promises.readFile(testFile, 'utf8');
    JSON.parse(ledgerData);
  });

  console.log(`Asynchronous read (target):`);
  console.log(`  Duration: ${resultsAsync.duration.toFixed(2)}ms`);
  console.log(`  Max Event Loop Delay: ${resultsAsync.maxDelay.toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
