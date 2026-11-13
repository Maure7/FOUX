import { memo, useEffect, useRef } from 'react';
import useDocumentDrag from '../../../hooks/useDocumentDrag';
import { useLanguage } from '../../../context/LanguageContext';

const ARROW_STEP = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: 359, ArrowDown: 359 };

function GradientAngleDisc({ angle, colorStart = '#e59843', colorEnd = '#9333ea', onAngleChange, disabled }) {
  const { t } = useLanguage();
  const discRef = useRef(null);
  const onAngleChangeRef = useRef(onAngleChange);
  const beginDrag = useDocumentDrag();
  // The document-level drag listener outlives the render that started it.
  useEffect(() => { onAngleChangeRef.current = onAngleChange; }, [onAngleChange]);

  const angleAt = (clientX, clientY) => {
    const rect = discRef.current.getBoundingClientRect();
    // atan2 starts at the positive X axis; CSS 0deg points up.
    const degrees = Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2)) * (180 / Math.PI) + 90;
    return Math.round(degrees < 0 ? degrees + 360 : degrees) % 360;
  };

  const handleMouseDown = (event) => {
    if (disabled) return;
    event.preventDefault();
    onAngleChange(angleAt(event.clientX, event.clientY));
    beginDrag((move) => onAngleChangeRef.current(angleAt(move.clientX, move.clientY)));
  };

  const radians = ((angle - 90) * Math.PI) / 180;

  return (
    <div className="gradient-angle-disc-wrapper">
      <div
        ref={discRef}
        className="gradient-angle-disc"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t('sidebar.gradientAngle')}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={angle}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (disabled || !ARROW_STEP[event.key]) return;
          event.preventDefault();
          onAngleChange((angle + ARROW_STEP[event.key]) % 360);
        }}
        onMouseDown={handleMouseDown}
        style={{ backgroundImage: `linear-gradient(${angle}deg, ${colorStart}, ${colorEnd})` }}
      >
        <div className="gradient-angle-disc__inner" />
        <div
          className="gradient-angle-disc__handle"
          style={{ left: `${50 + 40 * Math.cos(radians)}%`, top: `${50 + 40 * Math.sin(radians)}%` }}
        />
        <span className="gradient-angle-disc__label">{angle}°</span>
      </div>
    </div>
  );
}

export default memo(GradientAngleDisc);
