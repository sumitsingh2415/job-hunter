// Express REST API Server for Job Hunter System with Applied Timestamp Tracking

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getJobs, updateJobStatus, getStats } from './db/database.js';
import { runAllScrapers } from './scrapers/aggregator.js';
import { startScheduler } from './services/scheduler.js';
import ANSHU_PROFILE from './config/profile.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend dashboard
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// 1. Get Dashboard Statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Filtered & Matched Jobs
app.get('/api/jobs', (req, res) => {
  try {
    const { minScore, status, search, location, limit } = req.query;
    const jobs = getJobs({
      minScore: minScore ? parseInt(minScore) : undefined,
      status: status || undefined,
      search: search || undefined,
      location: location || undefined,
      limit: limit ? parseInt(limit) : 150
    });
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update Job Application Status (Supports 'new', 'saved', 'applied', 'interviewing', 'archived', 'rejected')
app.patch('/api/jobs/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    let { status, notes } = req.body;

    if (status === 'rejected') status = 'archived'; // normalize rejected to archived

    if (!['new', 'saved', 'applied', 'interviewing', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    updateJobStatus(id, status, notes);
    const updatedJobs = getJobs({ limit: 1 });
    res.json({
      success: true,
      message: `Status updated to ${status}`,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Trigger Manual Job Scrape
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('[API] Manual scrape requested via Dashboard.');
    runAllScrapers().catch(err => console.error('[API Scrape Error]', err));
    
    res.json({
      success: true,
      message: 'Scrape job launched in background. Jobs will update automatically in real-time.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get Candidate Profile Config
app.get('/api/profile', (req, res) => {
  res.json({ success: true, profile: ANSHU_PROFILE });
});

// Start Background Cron Scheduler
startScheduler();

// Start Express Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Job Hunter API Server running on http://localhost:${PORT}`);
  console.log(`====================================================`);
});
