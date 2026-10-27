import { useCallback, useEffect, useRef, useState } from 'react';
import { appStorage } from '../services/appStorage';

function clampWidth(width) {
  const maximum = Math.min(600, Math.max(300, Math.floor(window.innerWidth * 0.45)));
  return Math.max(300, Math.min(maximum, Number.isFinite(width) ? width : 340));
}

export default function useSidebarResize() {
  const [width, setWidth] = useState(() => {
    try { return clampWidth(Number.parseInt(appStorage.getItem('foux_sidebar_width'), 10)); }
    catch { return 340; }
  });
  const [isResizing, setIsResizing] = useState(false);
  const cleanup = useRef(null);
  useEffect(() => {
    const resize = () => setWidth((current) => clampWidth(current));
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cleanup.current?.();
    };
  }, []);

  const onResizeStart = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    cleanup.current?.();
    const startX = event.clientX;
    let finalWidth = width;
    setIsResizing(true);
    const move = (next) => {
      finalWidth = clampWidth(width + startX - next.clientX);
      setWidth(finalWidth);
    };
    const remove = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', finish);
      window.removeEventListener('blur', finish);
    };
    const finish = () => {
      remove();
      setIsResizing(false);
      try { appStorage.setItem('foux_sidebar_width', String(finalWidth)); }
      catch { /* Keep the usable width in memory if storage is unavailable. */ }
    };
    cleanup.current = remove;
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', finish);
    window.addEventListener('blur', finish);
  }, [width]);
  return { width, isResizing, onResizeStart };
}
