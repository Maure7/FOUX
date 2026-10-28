/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const entry = timersRef.current.get(id);
    if (!entry || entry.exiting) return;
    entry.exiting = true;
    clearTimeout(entry.timer);
    setToasts(previous => previous.map(toast => toast.id === id ? { ...toast, exiting: true } : toast));
    entry.timer = setTimeout(() => {
      setToasts(previous => previous.filter(toast => toast.id !== id));
      timersRef.current.delete(id);
    }, 140);
  }, []);

  const resumeToast = useCallback((id, reason = 'pointer') => {
    const entry = timersRef.current.get(id);
    if (!entry || entry.exiting) return;
    entry.paused.delete(reason);
    if (entry.paused.size || entry.started !== null) return;
    entry.started = Date.now();
    entry.timer = setTimeout(() => dismissToast(id), entry.remaining);
  }, [dismissToast]);

  const pauseToast = useCallback((id, reason = 'pointer') => {
    const entry = timersRef.current.get(id);
    if (!entry || entry.exiting) return;
    entry.paused.add(reason);
    clearTimeout(entry.timer);
    if (entry.started !== null) entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.started));
    entry.started = null;
  }, []);

  const showToast = useCallback((message) => {
    const duration = Math.max(4000, Math.min(8000, String(message).length * 60));
    for (const [id, entry] of timersRef.current) {
      if (entry.message !== message || entry.exiting) continue;
      clearTimeout(entry.timer);
      timersRef.current.set(id, { ...entry, remaining: duration, started: null });
      resumeToast(id, 'refresh');
      return id;
    }
    const id = ++toastIdCounter;
    const staleIds = [...timersRef.current.keys()].slice(0, Math.max(0, timersRef.current.size - 2));
    for (const staleId of staleIds) {
      clearTimeout(timersRef.current.get(staleId).timer);
      timersRef.current.delete(staleId);
    }
    const entry = { message, remaining: duration, started: null, paused: new Set(document.hidden ? ['hidden'] : []), exiting: false };
    timersRef.current.set(id, entry);
    setToasts((prev) => [...prev.filter(toast => !staleIds.includes(toast.id)), { id, message, exiting: false }]);
    resumeToast(id);

    return id;
  }, [resumeToast]);

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    const onVisibility = () => {
      for (const id of timers.keys()) {
        if (document.hidden) pauseToast(id, 'hidden');
        else resumeToast(id, 'hidden');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      for (const entry of timers.values()) clearTimeout(entry.timer);
      timers.clear();
    };
  }, [pauseToast, resumeToast]);

  return { toasts, showToast, dismissToast, pauseToast, resumeToast };
}

export function ToastContainer({ toasts, onDismiss, onPause, onResume }) {
  const { t } = useLanguage();
  return (
    <div className="toast-container" role="region" aria-label={t('common.notifications')} aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.exiting ? 'toast--exiting' : ''}`}
          inert={toast.exiting}
          onPointerEnter={() => onPause(toast.id)}
          onPointerLeave={() => onResume(toast.id)}
          onFocus={() => onPause(toast.id, 'focus')}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onResume(toast.id, 'focus'); }}
        >
          <Info className="toast__icon" aria-hidden="true" />
          <span className="toast__message">{toast.message}</span>
          <button type="button" className="toast__close" aria-label={t('common.close')} onClick={() => onDismiss(toast.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
