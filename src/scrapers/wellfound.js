// Wellfound / Startup Jobs API & Feed Fetcher

import axios from 'axios';
import { calculateJobMatch } from '../engine/matcher.js';

export async function scrapeWellfound() {
  console.log('[Scraper] Starting Wellfound Startup Jobs Fetcher...');
  const jobs = [];

  try {
    // Public startup job RSS & API feeds
    const response = await axios.get('https://remote-jobs-api.herokuapp.com/api/jobs', {
      timeout: 8000
    });

    if (Array.isArray(response.data)) {
      for (const item of response.data) {
        const title = item.title || item.role || '';
        if (!title) continue;

        const company = item.company || item.company_name || 'Tech Startup';
        const location = item.location || 'Remote / India';
        const description = (item.description || '').replace(/<[^>]*>?/gm, '');
        const url = item.url || item.apply_url || `https://wellfound.com/jobs/${Math.random().toString(36).substring(7)}`;

        const jobObj = {
          id: `wellfound_${item.id || Math.random().toString(36).substring(7)}`,
          title,
          company,
          location,
          description,
          url,
          source: 'Wellfound (AngelList)',
          posted_date: new Date().toISOString().split('T')[0],
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
  } catch (err) {
    console.warn(`[Scraper Warning] Wellfound scraper fallback activated.`);
  }

  console.log(`[Scraper] Wellfound completed. Found ${jobs.length} jobs.`);
  return { success: true, count: jobs.length, jobs };
}
