import { memo } from 'react';
import ColorField from './ColorField';
import NumericInput from './NumericInput';
import GradientControls from './GradientControls';
import PropertyLabel from './PropertyLabel';
import ContrastBadge from './ContrastBadge';
import { cssInfo } from '../../../utils/css/glossary.js';
import useDraft from '../../../hooks/useDraft';
import { useLanguage } from '../../../context/LanguageContext';

// Solid color + opacity, optionally switchable to a two-stop linear gradient
// when `gradient` is provided ({ enabled, color1, color2, angle }).
function ColorControl({
  label, token, hint, color, alpha = 1, disabled, onColorChange, onAlphaChange, gradient, onGradientChange, contrast,
}) {
  const { t } = useLanguage();
  const [percent, setPercent] = useDraft(Math.round(alpha * 100));
  const changeAlpha = (value) => {
    setPercent(value);
    onAlphaChange(value / 100);
  };

  return (
    <div className="sidebar-control">
      <div className="sidebar-control__label-row">
        {gradient?.enabled
          ? <PropertyLabel label={label} {...cssInfo(t, 'gradient')} />
          : <PropertyLabel label={label} token={token} hint={hint} />}
        {gradient && (
          <label className="sidebar-gradient-toggle">
            <input
              type="checkbox"
              checked={gradient.enabled}
              disabled={disabled}
              onChange={(event) => onGradientChange({ ...gradient, enabled: event.target.checked })}
            />
            <span className="sidebar-gradient-toggle__slider" />
            <span className="sidebar-gradient-toggle__text">{t('sidebar.gradient')}</span>
          </label>
        )}
      </div>

      {gradient?.enabled ? (
        <GradientControls gradient={gradient} disabled={disabled} onChange={onGradientChange} />
      ) : (
        <>
          <ColorField label={label} value={color || '#000000'} disabled={disabled} onChange={onColorChange} />
          <div className="sidebar-opacity-row">
            <span className="sidebar-opacity-row__label">{t('sidebar.opacity')}</span>
            <NumericInput
              className="sidebar-inline-number sidebar-inline-number--small"
              aria-label={`${label} — ${t('sidebar.opacity').replace(/:$/, '')}`}
              value={percent}
              min={0}
              max={100}
              disabled={disabled}
              onChange={(value) => changeAlpha(Math.round(value))}
            />
            <span className="sidebar-control__unit">%</span>
          </div>
          <input
            type="range"
            className="sidebar-slider sidebar-slider--opacity"
            aria-label={`${label} — ${t('sidebar.opacity').replace(/:$/, '')}`}
            min="0"
            max="100"
            value={percent}
            style={{ '--fill': `${percent}%` }}
            disabled={disabled}
            onChange={(event) => changeAlpha(Number(event.target.value))}
          />
        </>
      )}
      <ContrastBadge contrast={contrast} />
    </div>
  );
}

export default memo(ColorControl);
