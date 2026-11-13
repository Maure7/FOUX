import { useCallback, useEffect, useRef, useState } from 'react';
import { drawRound, findTarget, isComplete } from '../challenges/engine.js';
import { transitionsSettled } from '../utils/inspector/styles';
import { saveChallengeRun } from '../challenges/records.js';

const ADVANCE_DELAY_MS = 600;

// session: { queue, done, total, startedAt, passedAt, status: 'playing' | 'passed' }
// The time is saved only when the last challenge of the round is met; leaving
// the editor, closing the mode or giving up discards the round.
export default function useChallengeMode({ iframeRef, getHoverRules }) {
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const sessionRef = useRef(null);
  const frame = useRef(0);
  const advanceTimer = useRef(0);
  const checkRef = useRef(null);
  const waiting = useRef(false);

  const update = useCallback((next) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const cancelPending = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    clearTimeout(advanceTimer.current);
  }, []);

  // Edits arrive once per input event; validation runs at most once per frame,
  // after the inspector has already flushed the element's styles.
  const scheduleCheck = useCallback(() => {
    if (sessionRef.current?.status !== 'playing' || frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      checkRef.current?.();
    });
  }, []);

  const check = useCallback(() => {
    const current = sessionRef.current;
    if (current?.status !== 'playing') return;
    const doc = iframeRef.current?.contentDocument;
    if (!isComplete(current.queue[0], doc, getHoverRules)) {
      // A transitioning target still reports its old value; check again at the end.
      const settled = waiting.current ? null : transitionsSettled(findTarget(doc, current.queue[0]));
      if (settled) {
        waiting.current = true;
        settled.then(() => {
          waiting.current = false;
          scheduleCheck();
        });
      }
      return;
    }
    update({ ...current, status: 'passed', passedAt: Date.now() });
    advanceTimer.current = setTimeout(() => {
      const passed = sessionRef.current;
      if (!passed) return;
      const queue = passed.queue.slice(1);
      if (!queue.length) {
        const ms = passed.passedAt - passed.startedAt;
        update(null);
        setResult({ ms, ...saveChallengeRun(ms) });
        return;
      }
      update({ ...passed, queue, done: passed.done + 1, status: 'playing', passedAt: null });
      // The next challenge may already be met by an earlier edit.
      scheduleCheck();
    }, ADVANCE_DELAY_MS);
  }, [iframeRef, getHoverRules, update, scheduleCheck]);
  useEffect(() => { checkRef.current = check; }, [check]);

  const start = useCallback(() => {
    cancelPending();
    const queue = drawRound(iframeRef.current?.contentDocument, getHoverRules);
    if (!queue.length) return false;
    setResult(null);
    update({ queue, done: 0, total: queue.length, startedAt: Date.now(), passedAt: null, status: 'playing' });
    return true;
  }, [iframeRef, getHoverRules, cancelPending, update]);

  const stop = useCallback(() => {
    cancelPending();
    update(null);
  }, [cancelPending, update]);

  // A skipped challenge goes to the end of the queue: the round still needs it.
  const skip = useCallback(() => {
    const current = sessionRef.current;
    if (current?.status !== 'playing' || current.queue.length < 2) return;
    update({ ...current, queue: [...current.queue.slice(1), current.queue[0]] });
    scheduleCheck();
  }, [update, scheduleCheck]);

  const dismissResult = useCallback(() => setResult(null), []);

  useEffect(() => cancelPending, [cancelPending]);

  return { session, result, start, stop, skip, scheduleCheck, dismissResult };
}
