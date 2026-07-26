// WeWorkRemotely Job Scraper Module

import axios from 'axios';
import * as cheerio from 'cheerio';
import { calculateJobMatch } from '../engine/matcher.js';

export async function scrapeWeWorkRemotely() {
  console.log('[Scraper] Starting WeWorkRemotely Scraper...');
  const jobs = [];

  const feeds = [
    { url: 'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss', source: 'WeWorkRemotely (Sales & Marketing)' },
    { url: 'https://weworkremotely.com/categories/remote-customer-support-jobs.rss', source: 'WeWorkRemotely (Customer Support/BD)' }
  ];

  for (const feed of feeds) {
    try {
      const response = await axios.get(feed.url, { timeout: 8000 });
      const $ = cheerio.load(response.data, { xmlMode: true });

      $('item').each((_, el) => {
        const title = $(el).find('title').text().trim();
        const rawLink = $(el).find('link').text().trim() || $(el).find('guid').text().trim();
        const description = $(el).find('description').text().replace(/<[^>]*>?/gm, '').trim();
        const pubDate = $(el).find('pubDate').text().trim();

        if (title && rawLink) {
          // Format "Company is hiring a Title" or "Title at Company"
          let company = 'Remote Company';
          let cleanTitle = title;

          if (title.includes(' is hiring ')) {
            const parts = title.split(' is hiring ');
            company = parts[0].trim();
            cleanTitle = parts[1].trim();
          } else if (title.includes(' at ')) {
            const parts = title.split(' at ');
            cleanTitle = parts[0].trim();
            company = parts[1].trim();
          }

          const jobId = `wwr_${Math.abs(hashString(rawLink))}`;

          const jobObj = {
            id: jobId,
            title: cleanTitle,
            company,
            location: 'Remote / Anywhere',
            description,
            url: rawLink,
            source: 'WeWorkRemotely',
            posted_date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
      });
    } catch (err) {
      console.warn(`[Scraper Warning] WeWorkRemotely feed failed: ${err.message}`);
    }
  }

  console.log(`[Scraper] WeWorkRemotely completed. Found ${jobs.length} jobs.`);
  return { success: true, count: jobs.length, jobs };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
