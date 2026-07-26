// Master Job Aggregator & Multi-Platform Trigger

import { scrapeLinkedIn } from './linkedin.js';
import { scrapeRemoteOK } from './remoteok.js';
import { scrapeIndiaJobs } from './naukri.js';
import { scrapeWeWorkRemotely } from './weworkremotely.js';
import { scrapeIndeedJooble } from './indeed.js';
import { scrapeWellfound } from './wellfound.js';
import { saveJob, logScrapeEvent } from '../db/database.js';
import { dispatchHighMatchAlert } from '../notifier/emailNotifier.js';
import { sendTelegramAlert } from '../notifier/telegramNotifier.js';

export async function runAllScrapers() {
  console.log('====================================================');
  console.log(`[Job Hunter Engine] Multi-Platform Scrape Job Started at ${new Date().toLocaleString()}`);
  console.log('====================================================');

  let totalJobsFound = 0;
  let newHighMatches = [];

  const results = await Promise.allSettled([
    scrapeLinkedIn(),
    scrapeIndeedJooble(),
    scrapeRemoteOK(),
    scrapeWeWorkRemotely(),
    scrapeIndiaJobs(),
    scrapeWellfound()
  ]);

  for (const res of results) {
    if (res.status === 'fulfilled' && res.value.success) {
      const sourceName = res.value.jobs[0]?.source || 'Scraper';
      const count = res.value.count;
      totalJobsFound += count;

      for (const job of res.value.jobs) {
        saveJob(job);

        // Check if job is a high match (>= 70%)
        if (job.match_score >= 70) {
          newHighMatches.push(job);
        }
      }

      logScrapeEvent(sourceName, count, 'SUCCESS', `Scraped ${count} relevant jobs.`);
    } else if (res.status === 'rejected') {
      console.error('[Aggregator Error]', res.reason);
      logScrapeEvent('Unknown', 0, 'FAILED', res.reason?.message || 'Scraper error');
    }
  }

  // Deduplicate high matches by URL or ID
  const uniqueHighMatches = Array.from(
    new Map(newHighMatches.map(j => [j.url, j])).values()
  );

  console.log(`[Job Hunter Engine] Scrape Finished. ${totalJobsFound} jobs processed. ${uniqueHighMatches.length} high matches (>=70%).`);

  // Dispatch Notifications if high matches are found
  if (uniqueHighMatches.length > 0) {
    try {
      await dispatchHighMatchAlert(uniqueHighMatches);
      await sendTelegramAlert(uniqueHighMatches);
    } catch (notifErr) {
      console.warn('[Notifier Error] Failed to send notifications:', notifErr.message);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalJobsFound,
    highMatchCount: uniqueHighMatches.length,
    highMatches: uniqueHighMatches
  };
}
