import Link from 'next/link';

export const metadata = { title: 'Privacy and terms · AI Engineer Academy' };

export default function Privacy() {
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <Link className="linkbtn" href="/" style={{ alignSelf: 'flex-start' }}>Back</Link>
      <h1>Privacy and terms</h1>
      <p className="lead">Plain-language summary. If you run this site for other people, have a lawyer review it and replace the contact details below.</p>

      <h2>What we store</h2>
      <p>With an account: your email, name (optional), time zone, a salted hash of your password (never the password), your progress, notes, quiz answers, exercise code, project checklists and an activity log. If you link Telegram, your Telegram chat id.</p>
      <p>As a guest: everything stays in your browser. Nothing is sent to our server.</p>

      <h2>What we do with it</h2>
      <p>Only to run the academy: show your progress, build your daily plan and send your digest if you turned it on. We do not sell data and we do not show ads. Your notes and code are never sent to Telegram.</p>

      <h2>Services used</h2>
      <p>Hosting on Vercel, a database on MongoDB Atlas, and the Telegram Bot API if you link it. Videos play from YouTube (privacy-enhanced mode) and papers open from arXiv. Those sites have their own policies.</p>

      <h2>Your control</h2>
      <p>In Settings you can download all your data, unlink Telegram, and delete your account. Deleting removes your account, progress, notes and logs from our database. Logs also expire automatically after 90 days.</p>

      <h2>Cookies</h2>
      <p>One essential cookie keeps you signed in. It is HttpOnly and lasts 30 days. We also keep your progress in your browser&apos;s local storage so the site works offline.</p>

      <h2>Terms</h2>
      <p>This is a free learning aid. Course links, explanations and interview answers are provided as is and can be out of date or wrong; check the original sources. Courses and papers belong to their authors and providers. Nothing here guarantees a job, and the readiness score is only an estimate. Report problems from Settings.</p>
      <p className="lead">Contact: set your own contact email here before launch.</p>
    </div>
  );
}
