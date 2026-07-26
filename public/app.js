// Job Hunter Dashboard Frontend Application Logic with Timestamp Tracking

let allJobs = [];
let currentProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchStats();
  fetchJobs();
  fetchProfile();
  setupEventListeners();

  // Auto refresh stats & jobs every 30 seconds
  setInterval(() => {
    fetchStats();
    fetchJobs();
  }, 30000);
});

// 1. Fetch Stats Overview
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('statTotal').innerText = data.stats.total;
      document.getElementById('statHighMatch').innerText = data.stats.highMatch;
      document.getElementById('statSaved').innerText = data.stats.saved;
      document.getElementById('statApplied').innerText = data.stats.applied;
      if (document.getElementById('statRejected')) {
        document.getElementById('statRejected').innerText = data.stats.rejected || 0;
      }

      if (data.stats.lastScrape) {
        const timeAgo = new Date(data.stats.lastScrape).toLocaleTimeString();
        document.getElementById('lastSyncTime').innerText = `Last updated: ${timeAgo}`;
      }
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// 2. Fetch Jobs List
async function fetchJobs() {
  try {
    const minScore = document.getElementById('scoreFilter').value;
    const location = document.getElementById('locationFilter').value;
    const status = document.getElementById('statusFilter').value;
    const search = document.getElementById('searchInput').value;

    const params = new URLSearchParams();
    if (minScore) params.append('minScore', minScore);
    if (location) params.append('location', location);
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      allJobs = data.jobs;
      renderJobs(allJobs);
    }
  } catch (err) {
    console.error('Error fetching jobs:', err);
  }
}

// 3. Fetch Candidate Profile
async function fetchProfile() {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.success) {
      currentProfile = data.profile;
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
  }
}

// Format ISO date into human readable string
function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// 4. Render Job Cards
function renderJobs(jobs) {
  const container = document.getElementById('jobsGrid');
  document.getElementById('jobCountBadge').innerText = jobs.length;

  if (jobs.length === 0) {
    container.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; padding: 48px; text-align: center; color: #94a3b8;">
        <i class="fa-solid fa-folder-open" style="font-size: 48px; margin-bottom: 16px; color: #3b82f6;"></i>
        <h3>No matching jobs found</h3>
        <p>Try adjusting your search filters or click "Trigger Scraper Now" to fetch live positions.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = jobs.map(job => {
    let badgeClass = 'badge-low';
    if (job.match_score >= 80) badgeClass = 'badge-exceptional';
    else if (job.match_score >= 65) badgeClass = 'badge-strong';
    else if (job.match_score >= 50) badgeClass = 'badge-moderate';

    const skillChips = (job.matchingSkills || []).slice(0, 4).map(s => 
      `<span class="chip">✓ ${escapeHtml(s)}</span>`
    ).join('');

    // Status Timestamp Badge
    let timestampBadge = '';
    if (job.status === 'applied' && job.applied_at) {
      timestampBadge = `<div class="applied-timestamp"><i class="fa-solid fa-circle-check"></i> Applied on ${formatDateTime(job.applied_at)}</div>`;
    } else if (job.status === 'saved' && job.saved_at) {
      timestampBadge = `<div class="saved-timestamp"><i class="fa-solid fa-star"></i> Saved on ${formatDateTime(job.saved_at)}</div>`;
    } else if (job.status === 'archived') {
      timestampBadge = `<div class="rejected-timestamp"><i class="fa-solid fa-circle-xmark"></i> Rejected / Archived</div>`;
    }

    return `
      <div class="job-card glass-card">
        <span class="match-badge ${badgeClass}">${job.match_score}% MATCH</span>
        
        <div class="job-header">
          <h3 class="job-role">${escapeHtml(job.title)}</h3>
          <span class="job-company">${escapeHtml(job.company)}</span>
        </div>

        <div class="job-meta">
          <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(job.location || 'India')}</span>
          <span><i class="fa-solid fa-globe"></i> ${escapeHtml(job.source)}</span>
          <span><i class="fa-regular fa-calendar"></i> ${job.posted_date || 'Recent'}</span>
        </div>

        ${timestampBadge}

        <!-- Quick Action Buttons: Save, Mark Applied, Reject -->
        <div class="quick-action-bar">
          <button class="action-btn ${job.status === 'saved' ? 'active-save' : ''}" onclick="updateStatus('${job.id}', '${job.status === 'saved' ? 'new' : 'saved'}')">
            <i class="fa-solid fa-star"></i> ${job.status === 'saved' ? 'Saved' : 'Save'}
          </button>
          
          <button class="action-btn ${job.status === 'applied' ? 'active-apply' : ''}" onclick="updateStatus('${job.id}', '${job.status === 'applied' ? 'new' : 'applied'}')">
            <i class="fa-solid fa-paper-plane"></i> ${job.status === 'applied' ? 'Applied' : 'Mark Applied'}
          </button>

          <button class="action-btn ${job.status === 'archived' ? 'active-reject' : ''}" onclick="updateStatus('${job.id}', '${job.status === 'archived' ? 'new' : 'archived'}')">
            <i class="fa-solid fa-xmark"></i> ${job.status === 'archived' ? 'Rejected' : 'Reject'}
          </button>
        </div>

        <div class="fit-box">
          💡 <strong>Fit:</strong> ${escapeHtml(job.fit_summary)}
        </div>

        <div class="skill-chips">
          ${skillChips}
        </div>

        <div class="card-actions">
          <select class="status-select" onchange="updateStatus('${job.id}', this.value)">
            <option value="new" ${job.status === 'new' ? 'selected' : ''}>New Match</option>
            <option value="saved" ${job.status === 'saved' ? 'selected' : ''}>⭐ Saved</option>
            <option value="applied" ${job.status === 'applied' ? 'selected' : ''}>✉️ Applied</option>
            <option value="interviewing" ${job.status === 'interviewing' ? 'selected' : ''}>🎯 Interviewing</option>
            <option value="archived" ${job.status === 'archived' ? 'selected' : ''}>❌ Rejected</option>
          </select>

          <a href="${job.url}" target="_blank" class="apply-link" onclick="handleApplyClick('${job.id}')">
            Apply Now <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Automatically prompt or mark applied when user clicks Apply Now
function handleApplyClick(jobId) {
  setTimeout(() => {
    updateStatus(jobId, 'applied');
  }, 1000);
}

// 5. Update Job Application Status
async function updateStatus(jobId, status) {
  try {
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      fetchStats();
      fetchJobs();
    }
  } catch (err) {
    console.error('Error updating status:', err);
  }
}

// 6. Setup Event Listeners
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', debounce(fetchJobs, 300));
  document.getElementById('scoreFilter').addEventListener('change', fetchJobs);
  document.getElementById('locationFilter').addEventListener('change', fetchJobs);
  document.getElementById('statusFilter').addEventListener('change', fetchJobs);

  // Trigger Live Scraper Button
  document.getElementById('btnScrapeNow').addEventListener('click', async () => {
    const banner = document.getElementById('scrapeBanner');
    banner.classList.remove('hidden');

    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();

      setTimeout(() => {
        banner.classList.add('hidden');
        fetchStats();
        fetchJobs();
      }, 5000);
    } catch (err) {
      console.error('Scrape error:', err);
      banner.classList.add('hidden');
    }
  });

  // Profile Modal Controls
  document.getElementById('btnProfile').addEventListener('click', openProfileModal);
  document.getElementById('closeProfileModal').addEventListener('click', () => {
    document.getElementById('profileModal').classList.add('hidden');
  });
}

function openProfileModal() {
  if (!currentProfile) return;
  const modal = document.getElementById('profileModal');
  const body = document.getElementById('profileModalBody');

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
      <div>
        <label style="font-weight: 600; color: #3b82f6;">Target Job Titles:</label>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
          ${currentProfile.targetTitles.map(t => `<span class="chip" style="background: rgba(59,130,246,0.15); color: #fff;">${t}</span>`).join('')}
        </div>
      </div>

      <div>
        <label style="font-weight: 600; color: #10b981;">Primary Resume Skills:</label>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
          ${currentProfile.primarySkills.map(s => `<span class="chip" style="background: rgba(16,185,129,0.15); color: #fff;">✓ ${s}</span>`).join('')}
        </div>
      </div>

      <div>
        <label style="font-weight: 600; color: #fbbf24;">Target Locations:</label>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
          ${currentProfile.locations.map(l => `<span class="chip" style="background: rgba(245,158,11,0.15); color: #fff;">📍 ${l}</span>`).join('')}
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
