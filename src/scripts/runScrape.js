// Scraper Runner & Test Script

import { runAllScrapers } from '../scrapers/aggregator.js';
import { getJobs, getStats } from '../db/database.js';

async function main() {
  console.log('Testing Job Hunter Aggregator & Matcher Engine...');
  const result = await runAllScrapers();
  console.log('Scrape result:', result);

  const stats = getStats();
  console.log('Current DB Stats:', stats);

  const topJobs = getJobs({ minScore: 50, limit: 10 });
  console.log(`Top ${topJobs.length} Matched Jobs:`);
  topJobs.forEach(job => {
    console.log(`- [${job.match_score}%] ${job.title} @ ${job.company} (${job.location})`);
    console.log(`  Summary: ${job.fit_summary}`);
    console.log(`  Skills: ${job.matchingSkills.join(', ')}`);
    console.log(`  URL: ${job.url}\n`);
  });
}

main().catch(console.error);
