import { useCallback, useEffect, useRef, useState } from 'react';
import { drawRound, findTarget, isComplete } from '../challenges/engine.js';
import { transitionsSettled } from '../utils/inspector/styles';
import { saveChallengeRun } from '../challenges/records.js';

const ADVANCE_DELAY_MS = 600;

// session: { queue, done, total, startedAt, passedAt, status: 'playing' | 'passed' }
// O tempo só é salvo quando o último desafio da rodada é cumprido; sair do editor,
// fechar o modo ou desistir descarta a rodada.
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

  // As edições chegam a cada evento de input; a validação roda no máximo uma vez por
  // frame, depois de o inspector já ter aplicado os estilos do elemento.
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
      // Com transition, o alvo ainda informa o valor antigo; confere de novo quando ela termina.
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
      // O próximo desafio pode já ter sido cumprido por uma edição anterior.
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

  // O desafio pulado vai para o fim da fila: a rodada ainda depende dele.
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
