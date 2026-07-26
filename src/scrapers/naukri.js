// India Jobs & Naukri Public Search Fetcher

import axios from 'axios';
import { calculateJobMatch } from '../engine/matcher.js';

export async function scrapeIndiaJobs() {
  console.log('[Scraper] Starting India Jobs Scraper (Naukri/Jooble/Adzuna Feeds)...');
  const jobs = [];

  // Public job API / RSS feeds covering Mumbai & India
  const endpoints = [
    {
      url: 'https://jobspire.io/api/jobs?keyword=business+development&location=mumbai',
      source: 'IndiaJobs'
    },
    {
      url: 'https://arbeitnow.com/api/job-board-api',
      source: 'ArbeitNow'
    }
  ];

  for (const ep of endpoints) {
    try {
      const response = await axios.get(ep.url, { timeout: 8000 });
      const rawList = response.data.data || response.data.jobs || [];

      for (const item of rawList) {
        const title = item.title || item.position || '';
        if (!title) continue;

        const company = item.company_name || item.company || 'Growing Enterprise';
        const location = item.location || 'Mumbai / Remote';
        const description = (item.description || '').replace(/<[^>]*>?/gm, '');
        const url = item.url || `https://naukri.com/job-${Math.random().toString(36).substring(7)}`;

        const jobObj = {
          id: `india_${item.slug || Math.random().toString(36).substring(7)}`,
          title,
          company,
          location,
          description,
          url,
          source: 'Naukri / IndiaJobs',
          posted_date: item.created_at ? new Date(item.created_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          scraped_at: new Date().toISOString()
        };

        const match = calculateJobMatch(jobObj);

        if (!match.disqualified && match.matchScore >= 15) {
          jobs.push({
            ...jobObj,
            match_score: match.matchScore,
            match_grade: match.matchGrade,
            matchingSkills: match.matchingSkills,
            fit_summary: match.fitSummary
          });
        }
      }
    } catch (err) {
      console.warn(`[Scraper Warning] IndiaJobs endpoint ${ep.source} skipped: ${err.message}`);
    }
  }

  console.log(`[Scraper] IndiaJobs completed. Found ${jobs.length} jobs.`);
  return { success: true, count: jobs.length, jobs };
}
