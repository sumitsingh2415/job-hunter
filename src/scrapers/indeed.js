// Jooble & Indeed Public API Scraper for India Jobs

import axios from 'axios';
import { calculateJobMatch } from '../engine/matcher.js';

export async function scrapeIndeedJooble() {
  console.log('[Scraper] Starting Indeed & Jooble India Jobs Fetcher...');
  const jobs = [];

  const searchQueries = [
    { keyword: 'Business Development', location: 'Mumbai' },
    { keyword: 'Business Development', location: 'Bengaluru' },
    { keyword: 'B2B Sales', location: 'Mumbai' },
    { keyword: 'Digital Marketing', location: 'Mumbai' },
    { keyword: 'Digital Marketing', location: 'Bengaluru' }
  ];

  for (const q of searchQueries) {
    try {
      // Public Jooble Jobs API
      const url = `https://jooble.org/api/2b07119f-7df9-42b7-a3a8-48b47e221379`;
      const response = await axios.post(url, {
        keywords: q.keyword,
        location: q.location,
        page: 1
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000
      });

      if (response.data && Array.isArray(response.data.jobs)) {
        for (const item of response.data.jobs) {
          const title = item.title || '';
          const company = item.company || 'Enterprise Company';
          const location = item.location || q.location;
          const description = (item.snippet || item.type || '').replace(/<[^>]*>?/gm, '');
          const link = item.link || '';

          if (!title || !link) continue;

          const jobObj = {
            id: `jooble_${item.id || Math.random().toString(36).substring(7)}`,
            title,
            company,
            location,
            description,
            url: link,
            source: 'Indeed / Jooble',
            posted_date: item.updated ? new Date(item.updated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
      }

      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.warn(`[Scraper Warning] Jooble search for "${q.keyword}" in "${q.location}" skipped.`);
    }
  }

  console.log(`[Scraper] Indeed & Jooble India completed. Found ${jobs.length} jobs.`);
  return { success: true, count: jobs.length, jobs };
}
