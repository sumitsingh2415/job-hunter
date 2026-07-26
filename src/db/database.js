// SQLite Database Management Module with Applied Timestamp Tracking

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../data/job_hunter.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for high performance
db.pragma('journal_mode = WAL');

// Initialize database tables
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT,
      location TEXT,
      description TEXT,
      url TEXT UNIQUE,
      source TEXT,
      posted_date TEXT,
      scraped_at TEXT,
      match_score INTEGER DEFAULT 0,
      match_grade TEXT,
      matching_skills TEXT,
      fit_summary TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT,
      applied_at TEXT,
      saved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS scrape_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      source TEXT,
      jobs_found INTEGER DEFAULT 0,
      status TEXT,
      message TEXT
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      channel TEXT,
      sent_at TEXT,
      status TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );
  `);

  // Ensure applied_at and saved_at columns exist if table was previously created
  try { db.exec(`ALTER TABLE jobs ADD COLUMN applied_at TEXT;`); } catch (e) {}
  try { db.exec(`ALTER TABLE jobs ADD COLUMN saved_at TEXT;`); } catch (e) {}
}

export function saveJob(jobData) {
  const stmt = db.prepare(`
    INSERT INTO jobs (
      id, title, company, location, description, url, source,
      posted_date, scraped_at, match_score, match_grade,
      matching_skills, fit_summary, status
    ) VALUES (
      @id, @title, @company, @location, @description, @url, @source,
      @posted_date, @scraped_at, @match_score, @match_grade,
      @matching_skills, @fit_summary, @status
    )
    ON CONFLICT(id) DO UPDATE SET
      match_score = excluded.match_score,
      match_grade = excluded.match_grade,
      matching_skills = excluded.matching_skills,
      fit_summary = excluded.fit_summary,
      scraped_at = excluded.scraped_at
  `);

  return stmt.run({
    ...jobData,
    matching_skills: JSON.stringify(jobData.matchingSkills || []),
    status: jobData.status || 'new'
  });
}

export function getJobs(options = {}) {
  let query = `SELECT * FROM jobs WHERE 1=1`;
  const params = [];

  if (options.minScore) {
    query += ` AND match_score >= ?`;
    params.push(options.minScore);
  }

  if (options.status) {
    query += ` AND status = ?`;
    params.push(options.status);
  }

  if (options.search) {
    query += ` AND (title LIKE ? OR company LIKE ? OR description LIKE ?)`;
    const term = `%${options.search}%`;
    params.push(term, term, term);
  }

  if (options.location) {
    query += ` AND location LIKE ?`;
    params.push(`%${options.location}%`);
  }

  query += ` ORDER BY match_score DESC, scraped_at DESC`;

  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }

  const rows = db.prepare(query).all(...params);
  return rows.map(row => ({
    ...row,
    matchingSkills: JSON.parse(row.matching_skills || '[]')
  }));
}

export function updateJobStatus(id, status, notes = null) {
  const now = new Date().toISOString();
  let stmt;

  if (status === 'applied') {
    stmt = db.prepare(`UPDATE jobs SET status = ?, applied_at = COALESCE(applied_at, ?), notes = COALESCE(?, notes) WHERE id = ?`);
    return stmt.run(status, now, notes, id);
  } else if (status === 'saved') {
    stmt = db.prepare(`UPDATE jobs SET status = ?, saved_at = COALESCE(saved_at, ?), notes = COALESCE(?, notes) WHERE id = ?`);
    return stmt.run(status, now, notes, id);
  } else {
    stmt = db.prepare(`UPDATE jobs SET status = ?, notes = COALESCE(?, notes) WHERE id = ?`);
    return stmt.run(status, notes, id);
  }
}

export function logScrapeEvent(source, jobsFound, status, message) {
  const stmt = db.prepare(`
    INSERT INTO scrape_logs (timestamp, source, jobs_found, status, message)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(new Date().toISOString(), source, jobsFound, status, message);
}

export function getStats() {
  const total = db.prepare(`SELECT COUNT(*) as count FROM jobs`).get().count;
  const highMatch = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE match_score >= 70`).get().count;
  const applied = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'applied'`).get().count;
  const saved = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'saved'`).get().count;
  const interviewing = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'interviewing'`).get().count;
  const rejected = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'archived' OR status = 'rejected'`).get().count;
  const lastScrape = db.prepare(`SELECT timestamp FROM scrape_logs ORDER BY id DESC LIMIT 1`).get()?.timestamp || null;

  return { total, highMatch, applied, saved, interviewing, rejected, lastScrape };
}

// Initialize on import
initDB();
