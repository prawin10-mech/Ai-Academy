// Telegram webhook logic: linking a chat to an account, and stopping notifications.
import { escapeHtml, sendTelegram } from './telegram.js';
import { logEvent } from './log.js';
import { timingSafeEqual } from './security.js';
import { dateInZone } from './dates.js';
import { streak } from './scoring.js';

export const COMMANDS = [
  ['today', "Today's plan"],
  ['streak', 'Your study streak'],
  ['status', 'Link and digest settings'],
  ['pause', 'Pause the daily digest'],
  ['resume', 'Turn the daily digest back on'],
  ['help', 'Show all commands'],
  ['stop', 'Unlink this chat'],
];

const helpText = () => ['<b>What I can do</b>', ...COMMANDS.map(([c, d]) => `/${c} · ${d}`)].join('\n');
const maskEmail = (e = '') => { const [a, b] = String(e).split('@'); return b ? `${a.slice(0, 1)}***@${b}` : 'your account'; };

export function webhookAuthorized(request, env = process.env) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return false;
  return timingSafeEqual(request.headers.get('x-telegram-bot-api-secret-token'), env.TELEGRAM_WEBHOOK_SECRET);
}

export async function handleUpdate({ store, update, env = process.env, fetchFn = fetch, now = Date.now() }) {
  const msg = update && update.message;
  if (!msg || !msg.chat || typeof msg.text !== 'string' || msg.chat.type !== 'private') return { handled: false };
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const reply = (t) => sendTelegram(t, { env, fetchFn, chatId });

  const start = text.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{8,64}))?$/);
  if (start) {
    const token = start[1];
    if (!token) {
      const me = await store.getUserByChat(chatId);
      if (me) {
        await reply(`👋 Welcome back${me.name ? `, ${escapeHtml(me.name)}` : ''}. This chat is linked to ${escapeHtml(maskEmail(me.email))}.\n\n${helpText()}`);
        return { handled: true, action: 'welcome_back', userId: me.id };
      }
      await reply('👋 Welcome to <b>AI Engineer Academy</b>.\n\nThis chat is <b>not linked</b> yet. To get your daily digest here:\n1. Open the website and go to Settings\n2. Press "Link Telegram"\n3. Tap the button it gives you and press Start here\n\nIt takes about 10 seconds.');
      return { handled: true, action: 'help' };
    }
    const user = await store.getUserByLinkToken(token);
    if (!user || !user.telegramLinkExpires || user.telegramLinkExpires < now) {
      await reply('That link has expired. Open Settings on the website and press "Link Telegram" again.');
      return { handled: true, action: 'expired' };
    }
    // One chat belongs to one account.
    const other = await store.getUserByChat(chatId);
    if (other && other.id !== user.id) await store.updateUser(other.id, { telegramChatId: undefined });
    const updated = await store.updateUser(user.id, { telegramChatId: chatId, telegramLinkToken: undefined, telegramLinkExpires: undefined, digest: true });
    await logEvent(store, { user: updated, type: 'telegram_linked', message: 'Telegram linked.', env, fetchFn });
    const hour = String(updated.digestHour ?? 7).padStart(2, '0');
    await reply(`✅ <b>Linked${user.name ? `, ${escapeHtml(user.name)}` : ''}!</b>\n\nYour daily digest arrives at about ${hour}:00 (${escapeHtml(updated.tz || 'UTC')}): your progress, today's plan and new AI launches. You can change the time in Settings.\n\n${helpText()}`);
    return { handled: true, action: 'linked', userId: user.id };
  }

  const cmd = (text.match(/^\/(\w+)(?:@\w+)?\s*$/) || [])[1];
  const linked = cmd && cmd !== 'stop' ? await store.getUserByChat(chatId) : null;
  if (cmd && ['help', 'today', 'streak', 'status', 'pause', 'resume'].includes(cmd)) {
    if (cmd === 'help') { await reply(helpText()); return { handled: true, action: 'help' }; }
    if (!linked) {
      await reply('This chat is not linked to an account yet. Open Settings on the website, press "Link Telegram", then tap the button.');
      return { handled: true, action: 'not_linked' };
    }
    const tz = linked.tz || 'UTC';
    const date = dateInZone(new Date(now), tz);
    const state = await store.getState(linked.id);
    if (cmd === 'streak') {
      const n = streak(state, date);
      await reply(n ? `🔥 <b>${n}</b> day${n === 1 ? '' : 's'} in a row. Keep it going today.` : 'No streak yet. Do one lesson step or a Daily 5 quiz today to start one.');
    } else if (cmd === 'today') {
      const plan = await store.getPlan(linked.id, date);
      if (plan && plan.tasks) {
        await reply([`🎯 <b>${escapeHtml(plan.focus)}</b>`, escapeHtml(plan.why), '', ...plan.tasks.map((t, i) => `${i + 1}. ${escapeHtml(t.t)}`)].join('\n'));
      } else {
        await reply("Today's plan is made when you open the app or when your digest is sent. Open the academy once and try again.");
      }
    } else if (cmd === 'status') {
      const on = linked.digest !== false;
      await reply(`<b>Linked</b> to ${escapeHtml(maskEmail(linked.email))}\nDigest: ${on ? `on, about ${String(linked.digestHour ?? 7).padStart(2, '0')}:00` : 'paused'} (${escapeHtml(tz)})\nStreak: ${streak(state, date)} day(s)`);
    } else if (cmd === 'pause') {
      await store.updateUser(linked.id, { digest: false });
      await reply('⏸ Digest paused. Send /resume to turn it back on.');
    } else if (cmd === 'resume') {
      await store.updateUser(linked.id, { digest: true });
      await reply('▶️ Digest is on again.');
    }
    return { handled: true, action: cmd, userId: linked.id };
  }

  if (/^\/stop(?:@\w+)?$/.test(text)) {
    const user = await store.getUserByChat(chatId);
    if (user) await store.updateUser(user.id, { telegramChatId: undefined });
    await reply('Unlinked. You will not get messages here anymore. Link again any time from Settings.');
    return { handled: true, action: 'stopped', userId: user ? user.id : null };
  }

  await reply(`I did not understand that.\n\n${helpText()}`);
  return { handled: true, action: 'unknown' };
}
