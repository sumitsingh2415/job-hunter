// HTML Email Digest Notifier Module

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Transporter configuration (defaults to console output log if SMTP credentials are not set)
export async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
}

export async function dispatchHighMatchAlert(jobs) {
  const recipientEmail = process.env.NOTIFICATION_EMAIL || '025anshupriya@gmail.com';

  const jobRowsHtml = jobs.map(job => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 18px; font-weight: 600;">${job.title}</h3>
            <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; font-weight: 500;">
              <strong>${job.company}</strong> &bull; 📍 ${job.location} &bull; 🌐 ${job.source}
            </p>
          </div>
          <span style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; white-space: nowrap;">
            ${job.match_score}% MATCH
          </span>
        </div>

        <p style="background: #f8fafc; padding: 10px 14px; border-left: 4px solid #3b82f6; border-radius: 4px; color: #334155; font-size: 13px; margin: 8px 0 12px 0;">
          💡 <strong>Why it fits Anshu:</strong> ${job.fit_summary}
        </p>

        <div style="margin-bottom: 12px;">
          ${(job.matchingSkills || []).map(skill => `<span style="background: #e0f2fe; color: #0369a1; font-size: 11px; padding: 3px 8px; border-radius: 12px; margin-right: 4px; display: inline-block;">✓ ${skill}</span>`).join('')}
        </div>

        <a href="${job.url}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 13px;">
          Apply Now &rarr;
        </a>
      </td>
    </tr>
  `).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>High Match Job Alerts for Anshu Priya</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 32px 28px; text-align: center;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">🎯 Job Hunter Alert: New Matches Found</h1>
          <p style="margin: 0; color: #94a3b8; font-size: 15px;">Tailored job recommendations for <strong>Anshu Priya</strong></p>
        </div>

        <!-- Meta Summary -->
        <div style="background: #eff6ff; padding: 16px 28px; border-bottom: 1px solid #dbeafe;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            Found <strong>${jobs.length} high-matching roles</strong> (Score &ge; 75%) across LinkedIn, RemoteOK & India Job Portals.
          </p>
        </div>

        <!-- Jobs Table -->
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${jobRowsHtml}
          </tbody>
        </table>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
          <p style="margin: 0 0 4px 0;">Automated Job Hunter System &bull; Powered by Antigravity AI Engine</p>
          <p style="margin: 0;">Designed for Anshu Priya (Business Development & Marketing Specialist)</p>
        </div>

      </div>
    </body>
    </html>
  `;

  const transporter = await createTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: `"Job Hunter Bot" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `🎯 ${jobs.length} High-Match Jobs Found for Anshu Priya (${new Date().toLocaleDateString()})`,
      html: emailHtml
    });
    console.log(`[Notifier] Email notification dispatched to ${recipientEmail}`);
  } else {
    console.log(`[Notifier Simulation] Email notification created for ${recipientEmail} with ${jobs.length} jobs.`);
  }

  return { dispatched: true, recipient: recipientEmail, count: jobs.length };
}
