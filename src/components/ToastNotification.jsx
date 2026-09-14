import { useState, useCallback, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

/* ===== TOAST HOOK (reusable across screens) ===== */
let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const showToast = useCallback((message) => {
    const id = ++toastIdCounter;

    setToasts((prev) => [...prev, { id, message, exiting: false }]);

    // Start exit animation after 2.7s, remove after 3s total
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timersRef.current[id];
      }, 300);
    }, 2700);

    return id;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return { toasts, showToast };
}

/* ===== TOAST CONTAINER ===== */
export function ToastContainer({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.exiting ? 'toast--exiting' : ''}`}
        >
          <Info className="toast__icon" />
          <span className="toast__message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
