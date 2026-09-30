# AI Engineer Academy

A free, public learning site that takes a developer to job-ready AI application engineer in about 6 months. It focuses on what employers hire for: LLM apps, RAG, agents, evals and shipping.

- Accounts and guest mode (guests keep progress in their browser and can sign up later without losing it)
- A personalised path: tell it what you know and it skips or fast-tracks topics
- 26-week roadmap, 35 job-focused courses, 13 optional deep dives, plain-language explanations
- Practice lab with 46 coding exercises tested in your browser (hidden test cases, timeout, no network)
- Career page: readiness score, portfolio projects, interview practice
- AI Radar: new model launches (OpenAI, Google, Meta, xAI, Groq and more)
- Daily Telegram digest per learner, linked with one tap

It is one Next.js app: UI, API routes and cron in a single deployment.

## Deploy (Vercel + MongoDB Atlas)

1. Create a free MongoDB Atlas cluster. In Network Access allow `0.0.0.0/0` (Vercel has no fixed IP). Copy the connection string with your real password in it.
2. Import this repo in Vercel and set the environment variables below.
3. Redeploy. Open `/api/health`. It should return `{"ok":true}`. If storage fails it shows a short reason.
4. Sign up with the email you set as `ADMIN_EMAIL` to get owner access.

| Variable | Needed | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string |
| `MONGODB_DB` | no | Database name, default `ai_academy` |
| `SESSION_SECRET` | yes | 32+ random characters, signs login cookies |
| `CRON_SECRET` | yes | Bearer token for the hourly job |
| `ADMIN_EMAIL` | yes | This account gets owner rights |
| `APP_URL` | yes | Your site URL |
| `TELEGRAM_BOT_TOKEN` | for Telegram | From @BotFather |
| `TELEGRAM_BOT_USERNAME` | for Telegram | Bot name without @ |
| `TELEGRAM_WEBHOOK_SECRET` | for Telegram | Random string |
| `TELEGRAM_CHAT_ID` | for owner alerts | Your own chat id |

Secrets live only in Vercel. Never commit them.

## Telegram

1. Create a bot with @BotFather and set the variables above.
2. Register the webhook once: `node --env-file=.env.local scripts/set-webhook.mjs https://your-app.vercel.app`
3. Learners open Settings, tap Link Telegram, and press Start in the bot. `/stop` unlinks.

**If Telegram is not working:** sign in with your `ADMIN_EMAIL` account and open `/api/health`. The `telegram.problems` list says what is wrong in plain words (bad token, wrong bot username, webhook not registered, secret mismatch). You can also run `node --env-file=.env.local scripts/telegram-check.mjs https://your-app.vercel.app`. The webhook secret may only contain letters, numbers, `_` and `-`.

Learners get: their morning digest, Daily 5 results, streak milestones and course completions. You get: the job summary, errors, feedback and new signups.

## Daily job

`/api/cron/daily` builds each learner's plan and sends digests at their own local morning. It needs an hourly trigger. The included GitHub Action `.github/workflows/hourly.yml` does this: add repository secrets `APP_URL` and `CRON_SECRET`. `vercel.json` keeps a once-a-day fallback.

New model news is refreshed daily by a scheduled task that edits `data/whatsnew.json` and pushes to main.

## Develop

```
npm install
npm run dev
npm test
```

Without `MONGODB_URI` the app uses a local file store (`.data/academy.json`), fine for development only.

## Launch checklist

- `SESSION_SECRET` and `CRON_SECRET` set, `ADMIN_EMAIL` is your account
- `/api/health` returns ok, sign-up works in a private window
- Telegram link works end to end
- Skim the AI-written guides in `data/course-guides.json` and `data/paper-guides.json`

## Known limits

- No password reset and no email verification yet. Users can change their password when signed in.
- Practice exercises are JavaScript only.
- Rate limits and the daily job are sized for thousands of learners, not millions.
- No course can guarantee a job. The readiness score measures evidence you have produced.
