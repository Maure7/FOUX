import { useCallback, useEffect, useRef, useState } from 'react';

const LIMIT = 50;
// Arrastar um slider ou seletor de cor dispara dezenas de edições por segundo.
// Elas viram um só passo de desfazer, fechado após esta pausa, e o documento
// (que pode embutir fontes em data URL) é serializado uma vez por passo, não por evento.
const GESTURE_IDLE_MS = 350;

// Cada fonte importada é um <style id="foux-font-*"> com o arquivo inteiro em base64, que
// se repetiria nos até 2 × LIMIT retratos. O conteúdo fica guardado uma vez e o retrato
// leva só o número dele entre dois U+0000, caractere que o parser de HTML nunca deixa
// no documento.
const FONT_STYLE = /(<style id="foux-font-[^"]*">)([\s\S]*?)(<\/style>)/g;
const MARK = '\u0000';

export function createFontPool() {
  const ids = new Map();
  const contents = [];
  return {
    pack: (html) => html && html.replace(FONT_STYLE, (_, open, css, close) => {
      let id = ids.get(css);
      if (id === undefined) {
        id = contents.push(css) - 1;
        ids.set(css, id);
      }
      return `${open}${MARK}${id}${MARK}${close}`;
    }),
    // As partes ímpares do split são os números das fontes.
    unpack: (html) => html.split(MARK).map((part, index) => (index % 2 ? contents[part] : part)).join(''),
  };
}

const sameKind = (first, second) => first?.labelKey === second?.labelKey && first?.target === second?.target;

// Entradas são { html, meta }: o documento antes do passo (com as fontes trocadas por
// marcas) e a descrição dele ({ labelKey, target, from, to }) mostrada nos botões de
// desfazer/refazer.
export default function useEditorHistory(iframeRef, serializeDocument, restoreDocument) {
  const past = useRef([]);
  const future = useRef([]);
  const baseline = useRef(null);
  const fonts = useRef(null);
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

  const pool = useCallback(() => (fonts.current ??= createFontPool()), []);
  const snapshotDocument = useCallback(() => pool().pack(serializeDocument()), [pool, serializeDocument]);

  // Fecha o gesto aberto e devolve o retrato tirado, se houver.
  const commit = useCallback(() => {
    clearTimeout(timer.current);
    if (!pending.current) return null;
    pending.current = false;
    const meta = pendingMeta.current;
    pendingMeta.current = null;
    const snapshot = snapshotDocument();
    if (snapshot && baseline.current && snapshot !== baseline.current) {
      past.current = [...past.current.slice(-(LIMIT - 1)), { html: baseline.current, meta }];
      future.current = [];
    }
    if (snapshot) baseline.current = snapshot;
    publish();
    return snapshot;
  }, [snapshotDocument, publish]);

  // Precisa rodar antes de a edição chegar ao documento: outra propriedade ou
  // outro elemento fecha o gesto aberto, então cada passo descreve uma mudança.
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

  // Uma ação pontual (ex.: restaurar um elemento) vira exatamente um passo.
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
    const current = snapshot || snapshotDocument();
    if (!current) return;
    const target = from === past ? from.current.at(-1) : from.current[0];
    const moved = { html: current, meta: target.meta };
    from.current = from === past ? from.current.slice(0, -1) : from.current.slice(1);
    to.current = from === past
      ? [moved, ...to.current].slice(0, LIMIT)
      : [...to.current.slice(-(LIMIT - 1)), moved];
    restoring.current = true;
    publish();
    restoreDocument(pool().unpack(target.html));
  }, [commit, snapshotDocument, pool, publish, restoreDocument]);

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

  // Teclas dentro do iframe não chegam à janela do editor, e cada desfazer/refazer
  // troca o iframe, então cada documento carregado é ligado aqui.
  const documentLoaded = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = false;
    pendingMeta.current = null;
    restoring.current = false;
    baseline.current = snapshotDocument();
    boundDocument.current?.removeEventListener('keydown', onShortcut);
    boundDocument.current = iframeRef.current?.contentDocument ?? null;
    boundDocument.current?.addEventListener('keydown', onShortcut);
    publish();
  }, [iframeRef, snapshotDocument, onShortcut, publish]);

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
    fonts.current = null;
    publish();
  }, [publish]);

  // A tradução reinterpreta o HTML com DOMParser, que trocaria as marcas por U+FFFD.
  const translate = useCallback((localize) => {
    commit();
    const { pack, unpack } = pool();
    const map = (entry) => ({ ...entry, html: pack(localize(unpack(entry.html))) });
    past.current = past.current.map(map);
    future.current = future.current.map(map);
  }, [commit, pool]);

  return { ...status, undo, redo, recordChange, recordAction, documentLoaded, reset, translate };
}
