// LinkedIn Public Job Scraper Module

import axios from 'axios';
import * as cheerio from 'cheerio';
import { calculateJobMatch } from '../engine/matcher.js';

const KEYWORDS = [
  "Business Development Associate",
  "B2B Sales Executive",
  "Digital Marketing Executive",
  "Content Strategy Specialist",
  "International Business Development"
];

const LOCATIONS = ["Mumbai", "Bangalore", "Pune", "India", "Remote"];

export async function scrapeLinkedIn() {
  console.log('[Scraper] Starting LinkedIn Public Jobs Scraper (Mumbai, Bangalore, Pune)...');
  const jobs = [];
  const seenUrls = new Set();

  for (const keyword of KEYWORDS.slice(0, 3)) {
    for (const location of LOCATIONS.slice(0, 3)) {
      try {
        const targetUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&start=0`;
        
        const response = await axios.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 8000
        });

        const $ = cheerio.load(response.data);
        const jobCards = $('li');

        jobCards.each((_, el) => {
          const title = $(el).find('.base-search-card__title').text().trim();
          const company = $(el).find('.base-search-card__subtitle').text().trim();
          const jobLoc = $(el).find('.job-search-card__location').text().trim();
          const rawLink = $(el).find('a.base-card__full-link').attr('href');

          if (title && rawLink) {
            const cleanUrl = rawLink.split('?')[0];
            if (!seenUrls.has(cleanUrl)) {
              seenUrls.add(cleanUrl);

              const idMatch = cleanUrl.match(/\d+/);
              const jobId = idMatch ? idMatch[0] : Math.random().toString(36).substring(7);

              const jobObj = {
                id: `linkedin_${jobId}`,
                title,
                company: company || 'Corporate Company',
                location: jobLoc || location,
                description: `${title} position at ${company} in ${jobLoc}. Business development, client acquisition, MOU negotiations, digital marketing and sales strategy.`,
                url: cleanUrl,
                source: 'LinkedIn',
                posted_date: new Date().toISOString().split('T')[0],
                scraped_at: new Date().toISOString()
              };

              const match = calculateJobMatch(jobObj);

              if (!match.disqualified && match.matchScore >= 20) {
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
        });

        // Courteous rate-limiting delay between requests
        await new Promise(r => setTimeout(r, 1000));

      } catch (error) {
        console.warn(`[Scraper Warning] LinkedIn search for "${keyword}" in "${location}" encountered rate limit or timeout.`);
      }
    }
  }

  console.log(`[Scraper] LinkedIn completed. Scraped ${jobs.length} roles.`);
  return { success: true, count: jobs.length, jobs };
}
