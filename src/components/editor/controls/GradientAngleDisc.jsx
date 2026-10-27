import useDocumentDrag from '../../../hooks/useDocumentDrag';
import { useRef, useCallback } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export default function GradientAngleDisc({ angle, colorStart = '#e59843', colorEnd = '#9333ea', onAngleChange, disabled }) {
  const { t } = useLanguage();
  const discRef = useRef(null);
  const beginDrag = useDocumentDrag();

  const computeAngle = useCallback((clientX, clientY) => {
    if (!discRef.current) return 0;
    const rect = discRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2 returns angle from positive X axis; CSS gradient 0deg = bottom-to-top
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return Math.round(deg) % 360;
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    onAngleChange(computeAngle(e.clientX, e.clientY));

    const onMove = (ev) => {
      onAngleChange(computeAngle(ev.clientX, ev.clientY));
    };
    beginDrag(onMove);
  }, [disabled, computeAngle, onAngleChange, beginDrag]);

  // Handle position: place on the circumference
  const rad = ((angle - 90) * Math.PI) / 180;
  const handleX = 50 + 40 * Math.cos(rad); // 40% radius
  const handleY = 50 + 40 * Math.sin(rad);

  return (
    <div className="gradient-angle-disc-wrapper">
      <div
        className="gradient-angle-disc"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t('sidebar.gradientAngle')}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={angle}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          onAngleChange((angle + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : 359)) % 360);
        }}
        ref={discRef}
        onMouseDown={handleMouseDown}
        style={{
          background: `linear-gradient(${angle}deg, ${colorStart}, ${colorEnd})`,
        }}
      >
        <div className="gradient-angle-disc__inner" />
        <div
          className="gradient-angle-disc__handle"
          style={{
            left: `${handleX}%`,
            top: `${handleY}%`,
          }}
        />
        <span className="gradient-angle-disc__label">{angle}°</span>
      </div>
    </div>
  );
}

