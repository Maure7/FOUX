import { useCallback, useEffect, useMemo, useState } from 'react';

const EMPTY = { kind: null, ids: new Set() };
// Camadas por cima tratam o próprio Esc; a seleção só cancela quando nada cobre a grade.
const OVERLAYS = '.modal-overlay, .context-menu, .folder-color-picker__popover, .batch-bar__popover, .faq-modal';

// Projetos e pastas nunca são selecionados juntos: o primeiro item define o tipo,
// e desmarcar tudo libera o outro tipo de novo.
export default function useDashboardSelection({ projects, folders }) {
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState(EMPTY);

  const clear = useCallback(() => setSelection(EMPTY), []);
  const start = useCallback(() => { setSelection(EMPTY); setActive(true); }, []);
  const cancel = useCallback(() => { setSelection(EMPTY); setActive(false); }, []);
  const toggleMode = useCallback(() => {
    setSelection(EMPTY);
    setActive((current) => !current);
  }, []);

  const toggle = useCallback((kind, id) => {
    setSelection((current) => {
      if (current.kind && current.kind !== kind) return current;
      const ids = new Set(current.ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return ids.size ? { kind, ids } : EMPTY;
    });
  }, []);

  // Itens excluídos ou movidos para fora não podem continuar selecionados.
  const selectedItems = useMemo(() => {
    if (!selection.kind) return [];
    const source = selection.kind === 'project' ? projects : folders;
    return source.filter((item) => selection.ids.has(item.id));
  }, [selection, projects, folders]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector(OVERLAYS)) return;
      cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, cancel]);

  const kind = selectedItems.length ? selection.kind : null;
  const isSelected = useCallback((itemKind, id) => kind === itemKind && selection.ids.has(id), [kind, selection.ids]);
  const isBlocked = useCallback((itemKind) => active && kind !== null && kind !== itemKind, [active, kind]);

  return { active, kind, selectedItems, start, cancel, clear, toggle, toggleMode, isSelected, isBlocked };
}
