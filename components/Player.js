'use client';
import { useAcademy } from './Providers.js';

// Videos play inline through youtube-nocookie. Everything else opens on the provider's site.
export default function Player({ course, lesson }) {
  const { state, setEmbed } = useAcademy();
  const embedOn = state.embed == null ? true : !!state.embed;
  const src = lesson.yt
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.yt)}?rel=0`
    : lesson.list
      ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(lesson.list)}&rel=0`
      : null;
  const watch = lesson.yt
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(lesson.yt)}`
    : lesson.list
      ? `https://www.youtube.com/playlist?list=${encodeURIComponent(lesson.list)}`
      : lesson.url || course.url;

  if (src && embedOn) {
    return (
      <div className="stack">
        <div className="frame">
          <iframe
            key={src}
            src={src}
            title={lesson.t}
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="row">
          <a className="linkbtn" href={watch} target="_blank" rel="noopener noreferrer">Video not loading? Open on YouTube</a>
          <button className="linkbtn" onClick={() => setEmbed(false)}>Turn inline player off</button>
        </div>
      </div>
    );
  }
  if (src) {
    return (
      <div className="stage-card">
        <span className="pill accent">Video</span>
        <h3>{lesson.t}</h3>
        <p className="lead">Inline player is off.</p>
        <div className="row">
          <a className="btn primary" href={watch} target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
          <button className="btn" onClick={() => setEmbed(true)}>Turn inline player on</button>
        </div>
      </div>
    );
  }
  const isTask = lesson.k === 'task';
  return (
    <div className="stage-card">
      <span className="pill accent">{isTask ? 'Practice' : 'Reading'}</span>
      <h3>{lesson.t}</h3>
      <p className="lead">
        {isTask
          ? 'Do this, then note what you learned below and mark the step complete.'
          : "This lesson lives on the provider's site. Open it in a new tab and keep your notes here."}
      </p>
      {!isTask && <a className="btn primary" href={watch} target="_blank" rel="noopener noreferrer">Open lesson</a>}
    </div>
  );
}
