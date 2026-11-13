import { useEffect, useState } from 'react';

const MAP_SIZE = 128;
// Fraction of each side that bends light; the bend grows steeply toward the rim and the
// centre stays neutral, so the backdrop warps most at the edges.
const BEZEL = 0.34;
const SHEEN_SURFACES = [
  '.project-card', '.folder-card', '.list-item', '.profile-card', '.profile-stat-card', '.settings-section',
  '.activity-section', '.activity-item', '.challenge-record', '.modal-action-btn', '[data-theme="liquid-glass"] .editor-sidebar',
].join(', ');

function lensMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MAP_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const image = context.createImageData(MAP_SIZE, MAP_SIZE);
  const bend = (t) => {
    const depth = Math.max(0, (Math.abs(t) - (1 - BEZEL)) / BEZEL);
    return Math.sign(t) * depth ** 2.4;
  };
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const index = (y * MAP_SIZE + x) * 4;
      const u = (x / (MAP_SIZE - 1)) * 2 - 1;
      const v = (y / (MAP_SIZE - 1)) * 2 - 1;
      const dx = bend(u);
      const dy = bend(v);
      // Corners bend diagonally with the same strength as the edges, like a squircle rim.
      const limit = Math.max(1, Math.hypot(dx, dy));
      image.data[index] = 128 - (dx / limit) * 127;
      image.data[index + 1] = 128 - (dy / limit) * 127;
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

function Lens({ id, scale, map }) {
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feImage href={map} preserveAspectRatio="none" result="lens" />
      <feDisplacementMap in="SourceGraphic" in2="lens" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

// The light follows the pointer on the surfaces under it (an item and the card that holds
// it), and never while the student is dragging a slider or resizing an element, so
// editing keeps its frame budget.
function usePointerSheen() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    let frame = 0;
    let pressed = false;
    let lit = [];
    let point = null;
    const unlight = (surface) => {
      surface.style.removeProperty('--glass-mouse-x');
      surface.style.removeProperty('--glass-mouse-y');
    };
    const clear = () => {
      lit.forEach(unlight);
      lit = [];
    };
    const paint = () => {
      frame = 0;
      if (!point || pressed) return;
      const surfaces = [];
      for (let node = point.target.closest?.(SHEEN_SURFACES); node; node = node.parentElement?.closest(SHEEN_SURFACES)) {
        surfaces.push(node);
      }
      lit.filter((surface) => !surfaces.includes(surface)).forEach(unlight);
      lit = surfaces;
      for (const surface of surfaces) {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        surface.style.setProperty('--glass-mouse-x', `${((point.x - rect.left) / rect.width) * 100}%`);
        surface.style.setProperty('--glass-mouse-y', `${((point.y - rect.top) / rect.height) * 100}%`);
      }
    };
    const move = (event) => {
      if (event.pointerType !== 'mouse') return;
      point = { x: event.clientX, y: event.clientY, target: event.target };
      if (!frame && !pressed) frame = requestAnimationFrame(paint);
    };
    const press = () => { pressed = true; };
    const release = () => { pressed = false; };
    const leave = (event) => { if (!event.relatedTarget) { point = null; clear(); } };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', press, { passive: true, capture: true });
    document.addEventListener('pointerup', release, { passive: true, capture: true });
    document.addEventListener('pointercancel', release, { passive: true, capture: true });
    document.addEventListener('pointerout', leave, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clear();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', press, { capture: true });
      document.removeEventListener('pointerup', release, { capture: true });
      document.removeEventListener('pointercancel', release, { capture: true });
      document.removeEventListener('pointerout', leave);
    };
  }, []);
}

export default function LiquidGlassEngine() {
  const [map] = useState(lensMap);
  usePointerSheen();
  if (!map) return null;
  return (
    <svg id="foux-liquid-glass-svg" className="liquid-glass-svg" width="0" height="0" aria-hidden="true" focusable="false">
      <Lens id="foux-liquid-refraction" scale={38} map={map} />
      <Lens id="foux-liquid-subtle" scale={18} map={map} />
    </svg>
  );
}
