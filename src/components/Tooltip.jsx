import { cloneElement, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/Tooltip.css';

const TOP_BARS = '.header, .editor-header';
const TRIGGERS = 'button, [role="button"]';

// Use for custom controls; ordinary buttons are covered by TooltipProvider.
export function Tooltip({ content, children }) {
  return cloneElement(children, { 'data-tooltip': content });
}

function tooltipText(element) {
  const labelledBy = element.getAttribute('aria-labelledby')?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent || '').join(' ');
  const actionText = element.matches('button, [role="button"]') ? element.textContent : '';
  return (element.dataset.tooltip || element.getAttribute('aria-label') || labelledBy || actionText || '').replace(/\s+/g, ' ').trim();
}

export function TooltipProvider({ children, delay = 450 }) {
  const id = useId();
  const [tip, setTip] = useState(null);

  useEffect(() => {
    let timer;
    let active;
    let describedElement;
    let oldDescription;
    const normalizeTitles = (node) => {
      if (!(node instanceof Element)) return;
      const elements = [...node.querySelectorAll('[title]')];
      if (node.hasAttribute('title')) elements.unshift(node);
      for (const element of elements) {
        const title = element.getAttribute('title');
        if (title) {
          if (element.closest(TOP_BARS)) {
            element.dataset.tooltip = title;
            if (!element.hasAttribute('aria-label') && !element.textContent.trim()) element.setAttribute('aria-label', title);
            element.removeAttribute('title');
          } else if (element.tagName !== 'IFRAME') {
            if (!element.hasAttribute('aria-label') && !element.textContent.trim()) element.setAttribute('aria-label', title);
            element.removeAttribute('title');
          }
        }
      }
    };
    normalizeTitles(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') normalizeTitles(record.target);
        else record.addedNodes.forEach(normalizeTitles);
      }
      if (active && !active.isConnected) hide();
    });
    const hide = () => {
      clearTimeout(timer);
      if (describedElement?.isConnected) {
        if (oldDescription === null) describedElement.removeAttribute('aria-describedby');
        else describedElement.setAttribute('aria-describedby', oldDescription);
      }
      describedElement = null;
      active = null;
      setTip(null);
    };
    const show = (event) => {
      if (event.type === 'pointerover' && event.pointerType === 'touch') return;
      const topBar = event.target.closest?.(TOP_BARS);
      const element = event.target.closest?.(TRIGGERS);
      if (!topBar || !element || !topBar.contains(element) || element.closest('[role="tooltip"]') || element === active) return;
      hide();
      const text = tooltipText(element);
      if (!text) return;
      active = element;
      timer = setTimeout(() => {
        if (!element.isConnected) return hide();
        const rect = element.getBoundingClientRect();
        describedElement = element;
        oldDescription = element.getAttribute('aria-describedby');
        element.setAttribute('aria-describedby', `${oldDescription || ''} ${id}`.trim());
        setTip({ text, rect, host: element.closest('dialog[open]') || document.body });
      }, event.type === 'focusin' ? 0 : delay);
    };
    const leave = (event) => {
      if (active?.contains(event.relatedTarget)) return;
      hide();
    };
    const onKeyDown = (event) => { if (event.key === 'Escape') hide(); };
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] });
    document.addEventListener('pointerover', show);
    document.addEventListener('pointerout', leave);
    document.addEventListener('focusin', show);
    document.addEventListener('focusout', leave);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      observer.disconnect();
      hide();
      document.removeEventListener('pointerover', show);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('focusin', show);
      document.removeEventListener('focusout', leave);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [delay, id]);

  const width = tip ? Math.min(210, window.innerWidth - 24, Math.max(48, tip.text.length * 6.2 + 16)) : 48;
  const x = tip ? Math.max(12, Math.min(window.innerWidth - width - 12, tip.rect.left + tip.rect.width / 2 - width / 2)) : 12;
  const above = tip && tip.rect.bottom > window.innerHeight - 110;
  return <>{children}{tip && createPortal(
    <div id={id} role="tooltip" className="foux-tooltip" style={{ left: x, width, top: above ? tip.rect.top - 5 : tip.rect.bottom + 5, transform: above ? 'translateY(-100%)' : undefined }}>{tip.text}</div>, tip.host,
  )}</>;
}
