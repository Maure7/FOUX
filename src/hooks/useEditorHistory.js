import { useCallback, useEffect, useRef, useState } from 'react';

const LIMIT = 50;

// The sidebar reports edits after applying them. Keep the previous clean
// document as the baseline and group consecutive slider events into one step.
export default function useEditorHistory(iframeRef, serializeDocument, restoreDocument) {
  const [pastStates, setPastStates] = useState([]);
  const [futureStates, setFutureStates] = useState([]);
  const baseline = useRef(null);
  const lastEdit = useRef(null);
  const restoring = useRef(false);
  const timer = useRef(null);
  const grouping = useRef(false);

  const endGesture = useCallback(() => {
    clearTimeout(timer.current);
    grouping.current = false;
    baseline.current = lastEdit.current;
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const documentLoaded = useCallback(() => {
    endGesture();
    baseline.current = serializeDocument();
    lastEdit.current = baseline.current;
    restoring.current = false;
  }, [endGesture, serializeDocument]);

  const recordChange = useCallback(() => {
    if (restoring.current) return;
    const snapshot = serializeDocument();
    if (!snapshot || snapshot === lastEdit.current) return;
    if (!grouping.current && baseline.current) {
      const previous = baseline.current;
      setPastStates((past) => [...past.slice(-(LIMIT - 1)), previous]);
      setFutureStates([]);
      grouping.current = true;
    }
    lastEdit.current = snapshot;
    clearTimeout(timer.current);
    timer.current = setTimeout(endGesture, 350);
  }, [serializeDocument, endGesture]);

  const undo = useCallback(() => {
    if (restoring.current || !pastStates.length) return;
    const current = serializeDocument();
    if (!current) return;
    endGesture();
    const previous = pastStates.at(-1);
    restoring.current = true;
    setPastStates((past) => past.slice(0, -1));
    setFutureStates((future) => [current, ...future].slice(0, LIMIT));
    restoreDocument(previous);
  }, [pastStates, serializeDocument, endGesture, restoreDocument]);

  const redo = useCallback(() => {
    if (restoring.current || !futureStates.length) return;
    const current = serializeDocument();
    if (!current) return;
    endGesture();
    restoring.current = true;
    setPastStates((past) => [...past.slice(-(LIMIT - 1)), current]);
    setFutureStates((future) => future.slice(1));
    restoreDocument(futureStates[0]);
  }, [futureStates, serializeDocument, endGesture, restoreDocument]);

  const reset = useCallback(() => {
    endGesture();
    baseline.current = lastEdit.current = null;
    restoring.current = false;
    setPastStates([]);
    setFutureStates([]);
  }, [endGesture]);

  const translate = useCallback((localize) => {
    endGesture();
    setPastStates((past) => past.map(localize));
    setFutureStates((future) => future.map(localize));
  }, [endGesture]);

  useEffect(() => {
    const iframe = iframeRef.current;
    let iframeDoc;
    const handler = (event) => {
      if (document.querySelector('.tutorial-tour[open]') || event.isComposing) return;
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    };
    const bind = () => {
      iframeDoc?.removeEventListener('keydown', handler);
      iframeDoc = iframe?.contentDocument;
      iframeDoc?.addEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler);
    iframe?.addEventListener('load', bind);
    bind();
    return () => {
      window.removeEventListener('keydown', handler);
      iframe?.removeEventListener('load', bind);
      iframeDoc?.removeEventListener('keydown', handler);
    };
  }, [iframeRef, undo, redo]);

  return { canUndo: pastStates.length > 0, canRedo: futureStates.length > 0,
    undo, redo, recordChange, documentLoaded, reset, translate };
}
