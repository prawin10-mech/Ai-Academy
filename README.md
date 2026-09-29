# AI Engineer Academy

One Next.js app: the interactive learning site, the API, and the daily job. Deploy it once on Vercel.

- 32 free courses in five phases with an in-page video player, per-lesson notes and checklists
- 27 curated research papers with summaries, a three-pass reading tracker, notes and an inline PDF viewer
- A live feed of new papers from arXiv and Hugging Face
- Quizzes (Daily 5 and per course) that come back harder on topics and questions you miss
- A learner evaluation: mastery per topic, streak, recommended focus
- A daily plan built from that evaluation, with a digest sent to your phone through a Telegram bot
- Plain-language explanations everywhere: an "Explained" tab on every course (key ideas with web-developer analogies), a "what to focus on" tip on each step, an "Explain it simply" panel on every paper, a 70-term glossary, and an answer review with revision notes after every quiz
- A Logs page showing everything recorded and what goes to Telegram

## How it fits together

```
Browser (React)  ──►  /api/state, /api/attempts, /api/log   ──►  MongoDB Atlas
                      /api/daily
Vercel Cron 03:00 UTC ─► /api/cron/daily ─► paper feed + evaluation + plan ─► MongoDB + Telegram
```

The browser keeps a local copy of your progress, so the site works offline and syncs when it can.

## Database: MongoDB Atlas (free M0)

Your data is one small document per learner plus daily plans and logs, so MongoDB fits well. Create a free M0 cluster, add a database user, allow access from anywhere (Vercel uses changing IPs), and copy the connection string into `MONGODB_URI`. Collections are created on first write: `state`, `daily`, `feed`, `logs` (logs expire after 90 days).

Without `MONGODB_URI` the app uses a local file (`.data/academy.json`). That is for development only. On Vercel the file system is temporary, so set the variable before relying on it.

## Deploy on Vercel

1. Push this repo to GitHub, then import it at vercel.com/new. No build settings are needed.
2. Add the environment variables below in Project Settings, then redeploy.
3. Open the site, enter your `ACCESS_KEY`, and go to Logs. It should show Database: mongodb.
4. On Logs press "Send Telegram test". You should get a message on your phone.
5. Run the daily job once by hand (see below) to check the digest.

| Variable | Required | What it is |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas connection string |
| `MONGODB_DB` | no | Database name, default `ai_academy` |
| `TELEGRAM_BOT_TOKEN` | for phone updates | From @BotFather |
| `TELEGRAM_CHAT_ID` | for phone updates | Your chat id (send any message to your bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `chat.id`) |
| `ACCESS_KEY` | yes | Long random string. Protects the site and API. |
| `CRON_SECRET` | yes | Long random string. Vercel sends it to the cron route automatically. |
| `TZ_NAME` | no | Time zone for "today", default `Asia/Dubai` |
| `APP_URL` | no | Link shown in the digest |

Keep the bot token, the Mongo string and the keys in Vercel only. Never commit them or paste them into chats.

## The daily job

`vercel.json` runs `/api/cron/daily` every day at 03:00 UTC (07:00 in Dubai). Change the schedule there. It:

1. Pulls new papers from arXiv (cs.CL, cs.LG, cs.AI) and Hugging Face daily papers. If a source is down it carries on and reports the error.
2. Evaluates your progress: mastery per topic (last 10 answers, needs 3), streak, yesterday's activity.
3. Writes today's plan: the next lesson for your weakest topic, the Daily 5, one paper for that topic, a new paper, and news.
4. Sends the digest to Telegram and logs the run.

It is safe to run twice: an existing plan for the day is kept unless you add `?force=1`.

Run it by hand:

```
curl -H "Authorization: Bearer $CRON_SECRET" "https://YOUR-APP.vercel.app/api/cron/daily?force=1"
```

or locally: `node --env-file=.env.local scripts/run-daily.mjs --force`

## What goes to Telegram

| Event | Sent | Contents |
| --- | --- | --- |
| `daily_digest` | yes | Date, streak, steps done, yesterday, mastery per topic, focus, plan, three new papers |
| `cron_error` | yes | Paper source down, Telegram failure, or the job crashed |
| `quiz_daily_done` | yes | Daily 5 score and weakest topic |
| `streak_milestone` | yes | 3, 7, 14, 30, 60, 100 days |
| `course_complete` | yes | All steps of a course ticked |
| `client_error` | yes | Browser error, at most 3 per 10 minutes |
| `health_test` | yes | Test message from the Logs page |
| `quiz_course_done`, `lesson_complete`, `paper_done`, `note_saved`, `cron_ok` | no | Stored in the log only |

Notes are never sent. Edit the table in `lib/events.js` to change what is sent.

## Develop locally

```
npm install
cp .env.example .env.local
npm run dev
npm test
```

`npm test` covers the scoring, plan, feed parsing, Telegram formatting, merge and daily job logic with no network.

## Project layout

```
app/            pages (Today, Courses, Course, Papers, Notes, Progress, Logs, Quiz) and app/api routes
components/     Providers (state, sync, quiz), Shell, Player, NotesEditor, Quiz
lib/            scoring, plan, feed, telegram, db, auth, log, daily, state, events, dates
data/           courses, quizzes, papers, topics, daily-seed, plus course-guides, paper-guides and glossary (the explanations)
tests/          logic.test.mjs
```

## Editing content

- Add a course: append to `data/courses.json` (`id`, `phase`, `topic`, `title`, `by`, `url`, `cost`, `hrs`, `about`, `lessons`). YouTube lessons use `yt` (a video id) or `list` (a playlist id).
- Add quiz questions: append `{q, o, a, why}` to a topic in `data/quizzes.json`. `a` is the index of the right option.
- Add a paper: append to `data/papers.json` with its arXiv id, and add a matching entry to `data/paper-guides.json`.
- Add a course: also add its entry to `data/course-guides.json` (`npm test` fails if an explanation is missing).

Course links were checked when written. Third-party sites change, so open the course page if a link fails and update the URL.
