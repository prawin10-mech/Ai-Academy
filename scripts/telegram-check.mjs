// Explains why Telegram is not working: node --env-file=.env.local scripts/telegram-check.mjs https://your-app.vercel.app
import { telegramDiagnostics } from '../lib/telegram.js';
const r = await telegramDiagnostics({ appUrl: process.argv[2] || process.env.APP_URL || '' });
console.log(JSON.stringify(r, null, 2));
console.log(r.problems.length ? `\n${r.problems.length} problem(s) found. Fix the lines above.` : '\nNo problems found. Open the bot, press Start, and check Settings.');
