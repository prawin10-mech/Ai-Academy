// What gets logged, and where it is pushed on Telegram. Single source of truth (the README and Settings page mirror it).
//  to: 'user'  -> the learner's own linked chat, if they linked one and kept notifications on
//      'admin' -> the site owner's chat (TELEGRAM_CHAT_ID)
//      null    -> stored in the log only
export const EVENTS = {
  daily_digest:     { to: 'user',  title: 'Daily digest',            help: 'Morning summary: evaluation, plan, new papers, streak.' },
  quiz_daily_done:  { to: 'user',  title: 'Daily 5 finished',        help: 'Score and weakest topic right after the quiz.' },
  streak_milestone: { to: 'user',  title: 'Streak milestone',        help: 'Sent at 3, 7, 14, 30, 60 and 100 days.' },
  course_complete:  { to: 'user',  title: 'Course completed',        help: 'All steps of a course are ticked.' },
  telegram_test:    { to: 'user',  title: 'Test message',            help: 'Sent from Settings to confirm the link works.' },
  quiz_course_done: { to: null,    title: 'Course quiz finished',    help: 'Stored only.' },
  lesson_complete:  { to: null,    title: 'Lesson completed',        help: 'Stored only.' },
  paper_done:       { to: null,    title: 'Paper finished',          help: 'Stored only.' },
  note_saved:       { to: null,    title: 'Note saved',              help: 'Stored only.' },
  account_created:  { to: null,    title: 'Account created',         help: 'Stored only.' },
  telegram_linked:  { to: null,    title: 'Telegram linked',         help: 'Stored only.' },
  cron_summary:     { to: 'admin', title: 'Daily job summary',       help: 'Owner only: digests sent, failed, skipped.' },
  cron_error:       { to: 'admin', title: 'Daily job error',         help: 'Owner only: the job or a paper source failed.' },
  client_error:     { to: 'admin', title: 'Browser error',           help: 'Owner only: unhandled UI error, rate limited.' },
  feedback:         { to: 'admin', title: 'Feedback',                help: 'Owner only: a learner reported a problem.' },
  new_signup:       { to: 'admin', title: 'New learner',             help: 'Owner only: a new account was created.' },
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

// Events the browser may report through POST /api/log.
export const CLIENT_EVENTS = ['lesson_complete', 'course_complete', 'paper_done', 'note_saved', 'client_error'];
