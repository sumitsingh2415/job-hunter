// RemoteOK Job Scraper & API Fetcher

import axios from 'axios';
import { calculateJobMatch } from '../engine/matcher.js';

export async function scrapeRemoteOK() {
  console.log('[Scraper] Starting RemoteOK Job Fetcher...');
  const jobs = [];

  try {
    const response = await axios.get('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (Array.isArray(response.data)) {
      // First element in RemoteOK API response is legal disclaimer object, skip it
      const rawJobs = response.data.slice(1);

      for (const item of rawJobs) {
        if (!item.position || !item.url) continue;

        const title = item.position || '';
        const company = item.company || 'Remote Company';
        const location = item.location || 'Remote / Worldwide';
        const description = (item.description || '').replace(/<[^>]*>?/gm, ''); // strip HTML tags
        const url = item.url || `https://remoteok.com/remote-jobs/${item.id}`;
        const posted_date = item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const jobObj = {
          id: `remoteok_${item.id || Math.random().toString(36).substring(7)}`,
          title,
          company,
          location,
          description,
          url,
          source: 'RemoteOK',
          posted_date,
          scraped_at: new Date().toISOString()
        };

        const match = calculateJobMatch(jobObj);
        
        // Save jobs with a match score > 15 (filter out completely non-matching dev roles)
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

    console.log(`[Scraper] RemoteOK completed. Found ${jobs.length} relevant positions.`);
    return { success: true, count: jobs.length, jobs };
  } catch (error) {
    console.error('[Scraper Error] RemoteOK failed:', error.message);
    return { success: false, count: 0, jobs: [], error: error.message };
  }
}
