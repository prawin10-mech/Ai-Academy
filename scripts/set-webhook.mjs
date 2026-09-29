// Registers the Telegram webhook once: node --env-file=.env.local scripts/set-webhook.mjs https://your-app.vercel.app
const base = process.argv[2];
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret } = process.env;
if (!base || !token || !secret) {
  console.error('Usage: node --env-file=.env.local scripts/set-webhook.mjs https://your-app.vercel.app\nNeeds TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in the environment.');
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: `${base.replace(/\/$/, '')}/api/telegram/webhook`, secret_token: secret, allowed_updates: ['message'] }),
});
const body = await res.json();
console.log(body.ok ? 'Webhook set.' : `Failed: ${body.description}`);
