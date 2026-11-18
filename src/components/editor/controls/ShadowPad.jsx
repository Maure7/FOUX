import { memo, useEffect, useRef } from 'react';
import useDocumentDrag from '../../../hooks/useDocumentDrag';
import PropertyLabel from './PropertyLabel';

// Joystick 2D para os deslocamentos do box-shadow; o raio do pad equivale a ±max pixels.
function ShadowPad({ x, y, max = 30, label, token, hint, onChange }) {
  const padRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const beginDrag = useDocumentDrag();
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const handleMouseDown = (event) => {
    event.preventDefault();
    const rect = padRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    const update = (clientX, clientY) => {
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        dx = (dx / distance) * radius;
        dy = (dy / distance) * radius;
      }
      onChangeRef.current(Math.round((dx / radius) * max), Math.round((dy / radius) * max));
    };
    update(event.clientX, event.clientY);
    beginDrag((move) => update(move.clientX, move.clientY));
  };

  return (
    <div className="shadow-pad-wrapper">
      <div className="shadow-pad-label"><PropertyLabel label={label} token={token} hint={hint} /></div>
      <div className="shadow-pad" ref={padRef} onMouseDown={handleMouseDown}>
        <div className="shadow-pad__crosshair-h" />
        <div className="shadow-pad__crosshair-v" />
        <div
          className="shadow-pad__handle"
          style={{ left: `calc(50% + ${(x / max) * 50}%)`, top: `calc(50% + ${(y / max) * 50}%)` }}
        />
      </div>
    </div>
  );
}

export default memo(ShadowPad);
