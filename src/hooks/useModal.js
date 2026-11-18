import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

// Ciclo de vida comum dos diálogos: segura a animação de saída, prende o foco e o
// devolve ao botão que abriu. Callbacks e ações no projeto rodam na hora.
export default function useModal(isOpen) {
  const modalRef = useRef(null);
  const [present, setPresent] = useState(isOpen);
  if (isOpen && !present) setPresent(true);

  useEffect(() => {
    if (isOpen || !present) return;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.input === 'keyboard';
    const timer = setTimeout(() => setPresent(false), instant ? 0 : 140);
    return () => clearTimeout(timer);
  }, [isOpen, present]);

  useLayoutEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const modal = modalRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => [...modal.querySelectorAll(FOCUSABLE)].filter(element => element.getClientRects().length && !element.closest('[inert]'));
    // Prefere o campo editável; diálogos destrutivos começam no Cancelar.
    const initialFocus = modal.querySelector('input:not(:disabled), .modal-cancel-btn') || controls()[0];
    initialFocus?.focus({ preventScroll: true });
    if (initialFocus?.matches('#modal-rename-input')) initialFocus.select();
    const containFocus = (event) => {
      if (!modal.contains(event.target) && !document.querySelector('dialog[open]')) controls()[0]?.focus({ preventScroll: true });
    };
    const trapTab = (event) => {
      if (event.key !== 'Tab' || document.querySelector('dialog[open]')) return;
      const elements = controls();
      const index = elements.indexOf(document.activeElement);
      if (!elements.length) { event.preventDefault(); return; }
      if ((event.shiftKey && index <= 0) || (!event.shiftKey && (index < 0 || index === elements.length - 1))) {
        event.preventDefault();
        elements[event.shiftKey ? elements.length - 1 : 0].focus();
      }
    };
    document.addEventListener('focusin', containFocus);
    document.addEventListener('keydown', trapTab);
    return () => {
      document.removeEventListener('focusin', containFocus);
      document.removeEventListener('keydown', trapTab);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return { modalRef, present };
}
