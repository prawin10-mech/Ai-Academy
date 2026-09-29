// What gets logged, and what is pushed to Telegram. This table is the single source of truth;
// the README renders the same mapping. level: info | warn | error.
export const EVENTS = {
  daily_digest:     { telegram: true,  title: 'Daily digest',            help: 'Morning summary: evaluation, plan, new papers, streak.' },
  cron_error:       { telegram: true,  title: 'Daily job error',         help: 'The scheduled job failed or a source was unreachable.' },
  cron_ok:          { telegram: false, title: 'Daily job finished',      help: 'Stored in the log only. The digest already covers it.' },
  quiz_daily_done:  { telegram: true,  title: 'Daily 5 finished',        help: 'Score and weakest topic right after the quiz.' },
  quiz_course_done: { telegram: false, title: 'Course quiz finished',    help: 'Stored only.' },
  streak_milestone: { telegram: true,  title: 'Streak milestone',        help: 'Sent at 3, 7, 14, 30, 60 and 100 days.' },
  course_complete:  { telegram: true,  title: 'Course completed',        help: 'All steps of a course are ticked.' },
  lesson_complete:  { telegram: false, title: 'Lesson completed',        help: 'Stored only.' },
  paper_done:       { telegram: false, title: 'Paper finished',          help: 'Stored only.' },
  note_saved:       { telegram: false, title: 'Note saved',              help: 'Stored only (counts, never note text).' },
  client_error:     { telegram: true,  title: 'App error in the browser', help: 'Unhandled error reported by the UI, rate limited.' },
  health_test:      { telegram: true,  title: 'Test message',            help: 'Sent from /api/health?telegram=1.' },
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

// Events the browser is allowed to report through POST /api/log.
export const CLIENT_EVENTS = ['lesson_complete', 'course_complete', 'paper_done', 'note_saved', 'streak_milestone', 'client_error'];
