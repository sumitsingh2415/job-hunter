// Telegram Bot Notification Dispatcher

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function sendTelegramAlert(jobs) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Notifier Simulation] Telegram credentials not configured. Skipping Telegram push alert.');
    return { dispatched: false, reason: 'Credentials not set' };
  }

  try {
    for (const job of jobs.slice(0, 5)) {
      const message = `
🎯 *Job Hunter Alert for Anshu Priya*

*${escapeMarkdown(job.title)}*
🏢 Company: *${escapeMarkdown(job.company)}*
📍 Location: ${escapeMarkdown(job.location)}
🔥 Match Score: *${job.match_score}%*

💡 *Why it fits:* ${escapeMarkdown(job.fit_summary)}

[👉 Apply Here](${job.url})
      `.trim();

      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      });

      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`[Notifier] Telegram push alerts sent for ${Math.min(jobs.length, 5)} jobs.`);
    return { dispatched: true, count: jobs.length };
  } catch (err) {
    console.error('[Notifier Error] Telegram alert failed:', err.message);
    return { dispatched: false, error: err.message };
  }
}

function escapeMarkdown(text = '') {
  return text.replace(/[_*\[\]()~`>#+-=|{}.!]/g, '\\$&');
}
