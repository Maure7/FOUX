import { useCallback, useEffect, useRef, useState } from 'react';

const LIMIT = 50;
// Dragging a slider or color picker fires dozens of edits per second. They are
// grouped into one undo step that closes after this pause, and the document
// (which may embed fonts as data URLs) is serialized once per step, not per event.
const GESTURE_IDLE_MS = 350;

const sameKind = (first, second) => first?.labelKey === second?.labelKey && first?.target === second?.target;

// Entries are { html, meta }: the document before a step and the description
// of that step ({ labelKey, target, from, to }) shown on the undo/redo buttons.
export default function useEditorHistory(iframeRef, serializeDocument, restoreDocument) {
  const past = useRef([]);
  const future = useRef([]);
  const baseline = useRef(null);
  const pending = useRef(false);
  const pendingMeta = useRef(null);
  const restoring = useRef(false);
  const timer = useRef(null);
  const boundDocument = useRef(null);
  const shortcutHandler = useRef(null);
  const [status, setStatus] = useState({ canUndo: false, canRedo: false, undoMeta: null, redoMeta: null });

  const publish = useCallback(() => {
    const canUndo = past.current.length > 0 || pending.current;
    const canRedo = future.current.length > 0 && !pending.current;
    const undoMeta = pending.current ? pendingMeta.current : past.current.at(-1)?.meta ?? null;
    const redoMeta = canRedo ? future.current[0].meta : null;
    setStatus((current) => (current.canUndo === canUndo && current.canRedo === canRedo
      && current.undoMeta === undoMeta && current.redoMeta === redoMeta
      ? current : { canUndo, canRedo, undoMeta, redoMeta }));
  }, []);

  // Closes the open gesture and returns the snapshot it took, if any.
  const commit = useCallback(() => {
    clearTimeout(timer.current);
    if (!pending.current) return null;
    pending.current = false;
    const meta = pendingMeta.current;
    pendingMeta.current = null;
    const snapshot = serializeDocument();
    if (snapshot && baseline.current && snapshot !== baseline.current) {
      past.current = [...past.current.slice(-(LIMIT - 1)), { html: baseline.current, meta }];
      future.current = [];
    }
    if (snapshot) baseline.current = snapshot;
    publish();
    return snapshot;
  }, [serializeDocument, publish]);

  // Must run before the edit reaches the document: a different property or
  // element closes the open gesture first, so each step describes one change.
  const recordChange = useCallback((meta = null) => {
    if (restoring.current) return;
    if (pending.current && !sameKind(pendingMeta.current, meta)) commit();
    clearTimeout(timer.current);
    timer.current = setTimeout(commit, GESTURE_IDLE_MS);
    if (!pending.current) {
      pending.current = true;
      pendingMeta.current = meta;
      publish();
    } else if (meta) {
      pendingMeta.current = { ...pendingMeta.current, to: meta.to };
    }
  }, [commit, publish]);

  // A discrete action (e.g. restoring an element) becomes exactly one step.
  const recordAction = useCallback((meta, mutate) => {
    if (restoring.current) return false;
    commit();
    if (!mutate()) return false;
    pending.current = true;
    pendingMeta.current = meta;
    commit();
    return true;
  }, [commit]);

  const travel = useCallback((from, to) => {
    if (restoring.current) return;
    const snapshot = commit();
    if (!from.current.length) return;
    const current = snapshot || serializeDocument();
    if (!current) return;
    const target = from === past ? from.current.at(-1) : from.current[0];
    const moved = { html: current, meta: target.meta };
    from.current = from === past ? from.current.slice(0, -1) : from.current.slice(1);
    to.current = from === past
      ? [moved, ...to.current].slice(0, LIMIT)
      : [...to.current.slice(-(LIMIT - 1)), moved];
    restoring.current = true;
    publish();
    restoreDocument(target.html);
  }, [commit, serializeDocument, publish, restoreDocument]);

  const undo = useCallback(() => travel(past, future), [travel]);
  const redo = useCallback(() => travel(future, past), [travel]);

  useEffect(() => {
    shortcutHandler.current = (event) => {
      if (document.querySelector('.tutorial-tour[open]') || event.isComposing) return;
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    };
  }, [undo, redo]);
  const onShortcut = useCallback((event) => shortcutHandler.current?.(event), []);

  // Keystrokes inside the iframe never reach the parent window, and every
  // undo/redo replaces the iframe, so each loaded document is bound here.
  const documentLoaded = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = false;
    pendingMeta.current = null;
    restoring.current = false;
    baseline.current = serializeDocument();
    boundDocument.current?.removeEventListener('keydown', onShortcut);
    boundDocument.current = iframeRef.current?.contentDocument ?? null;
    boundDocument.current?.addEventListener('keydown', onShortcut);
    publish();
  }, [iframeRef, serializeDocument, onShortcut, publish]);

  useEffect(() => {
    window.addEventListener('keydown', onShortcut);
    return () => {
      window.removeEventListener('keydown', onShortcut);
      boundDocument.current?.removeEventListener('keydown', onShortcut);
      clearTimeout(timer.current);
    };
  }, [onShortcut]);

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = false;
    pendingMeta.current = null;
    restoring.current = false;
    baseline.current = null;
    past.current = [];
    future.current = [];
    publish();
  }, [publish]);

  const translate = useCallback((localize) => {
    commit();
    const map = (entry) => ({ ...entry, html: localize(entry.html) });
    past.current = past.current.map(map);
    future.current = future.current.map(map);
  }, [commit]);

  return { ...status, undo, redo, recordChange, recordAction, documentLoaded, reset, translate };
}
