import { useLayoutEffect } from 'react';

export default function useFloatingMenu(menuRef, x, y) {
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const position = () => {
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
      let top = Math.max(8, Math.min(y, window.innerHeight - height - 8));
      Object.assign(menu.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto', maxHeight: `${window.innerHeight - 16}px` });
      menu.style.setProperty('--menu-origin', `${Math.min(width, Math.max(0, x - left))}px ${Math.min(height, Math.max(0, y - top))}px`);
      for (const submenu of menu.querySelectorAll('.context-menu__submenu')) {
        submenu.dataset.side = 'right';
        const availableRight = window.innerWidth - left - width - 8;
        const availableLeft = left - 8;
        const submenuWidth = submenu.offsetWidth;
        submenu.dataset.side = submenuWidth <= availableRight ? 'right' : submenuWidth <= availableLeft ? 'left' : 'stacked';
        // Short windows and long destination lists must remain reachable.
        submenu.style.top = '-6px';
        const rect = submenu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 8) submenu.style.top = `${-6 - (rect.bottom - window.innerHeight + 8)}px`;
      }
      top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8));
      menu.style.top = `${top}px`;
      menu.style.setProperty('--menu-origin', `${Math.min(width, Math.max(0, x - left))}px ${Math.min(menu.offsetHeight, Math.max(0, y - top))}px`);
    };
    position();
    const observer = new MutationObserver(position);
    observer.observe(menu, { childList: true, subtree: true });
    menu.addEventListener('pointerover', position);
    menu.addEventListener('focusin', position);
    window.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      menu.removeEventListener('pointerover', position);
      menu.removeEventListener('focusin', position);
      window.removeEventListener('resize', position);
    };
  }, [menuRef, x, y]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const previousFocus = document.activeElement;
    menu?.querySelector('button')?.focus({ preventScroll: true });
    const navigate = (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const controls = [...menu.querySelectorAll('button:not(:disabled)')].filter(element => element.getClientRects().length);
      if (!controls.length) return;
      event.preventDefault();
      const index = controls.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + controls.length) % controls.length;
      controls[next].focus({ preventScroll: true });
    };
    menu?.addEventListener('keydown', navigate);
    return () => {
      menu?.removeEventListener('keydown', navigate);
      if (previousFocus?.isConnected && (menu?.contains(document.activeElement) || document.activeElement === document.body)) previousFocus.focus({ preventScroll: true });
    };
  }, [menuRef]);
}
