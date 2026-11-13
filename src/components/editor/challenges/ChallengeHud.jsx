import { memo, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Crosshair, Flag, GripHorizontal, SkipForward, Timer, Trophy } from 'lucide-react';
import { formatClock } from '../../../challenges/records.js';
import '../../../styles/challenges.css';

const EDGE = 8;

// Floating, draggable card. It starts in the canvas' lower-left corner and can
// be collapsed to the header (time and progress) to free the canvas.
function ChallengeHud({ session, language, onHighlight, onSkip, onQuit, t }) {
  const hudRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const passed = session.status === 'passed';

  useEffect(() => {
    if (passed) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [passed]);

  const challenge = session.queue[0];
  const done = session.done + (passed ? 1 : 0);
  const percent = Math.round((done / session.total) * 100);
  const elapsed = (session.passedAt ?? Math.max(now, session.startedAt)) - session.startedAt;

  // Pointer capture keeps the drag alive while the cursor crosses the iframe.
  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const hud = hudRef.current;
    const parent = hud.offsetParent;
    if (!parent) return;
    event.preventDefault();
    const box = hud.getBoundingClientRect();
    const area = parent.getBoundingClientRect();
    const offsetX = event.clientX - box.left;
    const offsetY = event.clientY - box.top;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent) => setPosition({
      left: Math.min(Math.max(EDGE, moveEvent.clientX - area.left - offsetX), area.width - box.width - EDGE),
      top: Math.min(Math.max(EDGE, moveEvent.clientY - area.top - offsetY), area.height - box.height - EDGE),
    });
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  return (
    <section
      ref={hudRef}
      className={`challenge-hud ${passed ? 'is-passed' : ''} ${collapsed ? 'is-collapsed' : ''}`}
      style={position ? { left: position.left, top: position.top, bottom: 'auto' } : undefined}
      aria-label={t('challenges.title')}
    >
      <header className="challenge-hud__header" onPointerDown={startDrag}>
        <GripHorizontal size={14} className="challenge-hud__grip" aria-hidden="true" />
        <Trophy size={14} className="challenge-hud__trophy" aria-hidden="true" />
        <strong className="challenge-hud__title">{t('challenges.title')}</strong>
        <span className="challenge-hud__timer" role="timer" aria-label={t('challenges.elapsed', { time: formatClock(elapsed) })}>
          <Timer size={13} aria-hidden="true" />
          {formatClock(elapsed)}
        </span>
        <button
          type="button"
          className="challenge-hud__icon-btn"
          aria-expanded={!collapsed}
          aria-label={t(collapsed ? 'challenges.expand' : 'challenges.collapse')}
          data-tooltip={t(collapsed ? 'challenges.expand' : 'challenges.collapse')}
          onClick={() => setCollapsed((value) => !value)}
        >
          <ChevronDown size={14} className="challenge-hud__chevron" />
        </button>
      </header>

      <div
        className="challenge-hud__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={session.total}
        aria-valuenow={done}
        aria-valuetext={t('challenges.progress', { done, total: session.total })}
      >
        <span className="challenge-hud__bar" style={{ transform: `scaleX(${done / session.total})` }} />
      </div>
      <p className="challenge-hud__count">
        <span>{t('challenges.progress', { done, total: session.total })}</span>
        <span>{percent}%</span>
      </p>

      {!collapsed && (
        <div className="challenge-hud__body">
          <span className="challenge-hud__category">{t(`challenges.categories.${challenge.category}`)}</span>
          <p className="challenge-hud__statement" aria-live="polite" data-challenge={challenge.id}>{challenge.text[language] ?? challenge.text.pt}</p>
          <div className="challenge-hud__actions">
            <button type="button" className="challenge-hud__btn challenge-hud__btn--primary" onClick={onHighlight} disabled={passed}>
              <Crosshair size={13} aria-hidden="true" />
              <span>{t('challenges.highlight')}</span>
            </button>
            <button type="button" className="challenge-hud__btn" onClick={onSkip} disabled={passed || session.queue.length < 2}>
              <SkipForward size={13} aria-hidden="true" />
              <span>{t('challenges.skip')}</span>
            </button>
            <button type="button" className="challenge-hud__btn challenge-hud__btn--quiet" onClick={onQuit}>
              <Flag size={13} aria-hidden="true" />
              <span>{t('challenges.giveUp')}</span>
            </button>
          </div>
        </div>
      )}

      {passed && (
        <div className="challenge-hud__success" role="status">
          <span className="challenge-hud__check"><Check size={18} strokeWidth={3} aria-hidden="true" /></span>
          <span>{t('challenges.passed')}</span>
        </div>
      )}
    </section>
  );
}

export default memo(ChallengeHud);
