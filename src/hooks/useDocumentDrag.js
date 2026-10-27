import { useCallback, useEffect, useRef } from 'react';

export default function useDocumentDrag() {
  const cleanup = useRef(null);
  useEffect(() => () => cleanup.current?.(), []);
  return useCallback((onMove, onEnd = () => {}) => {
    cleanup.current?.();
    const remove = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', finish);
      window.removeEventListener('blur', finish);
    };
    const finish = () => { remove(); onEnd(); };
    cleanup.current = remove;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', finish);
    window.addEventListener('blur', finish);
  }, []);
}
