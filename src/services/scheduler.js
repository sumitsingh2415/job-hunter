// Automated Cron Scheduler Service

import cron from 'node-cron';
import { runAllScrapers } from '../scrapers/aggregator.js';

let isScrapeRunning = false;

export function startScheduler(cronExpression = '0 9,18 * * *') {
  console.log(`[Scheduler Service] Scheduled automated job scraper with schedule: "${cronExpression}"`);

  const task = cron.schedule(cronExpression, async () => {
    if (isScrapeRunning) {
      console.log('[Scheduler Service] Previous scrape still in progress, skipping scheduled trigger.');
      return;
    }

    isScrapeRunning = true;
    try {
      console.log('[Scheduler Service] Cron triggered automated scrape job.');
      await runAllScrapers();
    } catch (err) {
      console.error('[Scheduler Service Error] Cron task failed:', err.message);
    } finally {
      isScrapeRunning = false;
    }
  });

  return task;
}

export function isJobRunning() {
  return isScrapeRunning;
}
