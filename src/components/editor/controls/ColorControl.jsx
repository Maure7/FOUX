import NumericInput from './NumericInput';
import GradientAngleDisc from './GradientAngleDisc';

export default function ColorControl({
  label, hexValue, alphaValue, disabled,
  onColorChange, onAlphaChange, opacityLabel,
  // Gradient props
  gradientEnabled, onGradientToggle,
  gradientColor1, gradientColor2, gradientAngle,
  onGradientColor1Change, onGradientColor2Change, onGradientAngleChange,
  showGradient = false,
  t,
}) {
  const displayAlpha = Math.round((alphaValue ?? 1) * 100);

  return (
    <div className="sidebar-control">
      <div className="sidebar-control__label-row">
        <span className="sidebar-control__label">{label}</span>
        {showGradient && (
          <label className="sidebar-gradient-toggle">
            <input
              type="checkbox"
              checked={!!gradientEnabled}
              disabled={disabled}
              onChange={(e) => onGradientToggle && onGradientToggle(e.target.checked)}
            />
            <span className="sidebar-gradient-toggle__slider" />
            <span className="sidebar-gradient-toggle__text">{t ? t('sidebar.gradient') : 'Gradiente'}</span>
          </label>
        )}
      </div>

      {gradientEnabled ? (
        /* ── Gradient Mode ── */
        <div className="sidebar-gradient-controls">
          <div className="sidebar-gradient-colors">
            <div className="sidebar-gradient-color-field">
              <span className="sidebar-gradient-color-field__label">{t ? t('sidebar.gradientColorStart') : 'Cor Inicial'}</span>
              <div className="sidebar-color-input">
                <input
                  type="color"
                  className="sidebar-color-picker"
                  value={gradientColor1 || '#e59843'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor1Change && onGradientColor1Change(e.target.value)}
                />
                <input
                  type="text"
                  className="sidebar-color-text"
                  value={gradientColor1 || '#e59843'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor1Change && onGradientColor1Change(e.target.value)}
                />
              </div>
            </div>
            <div className="sidebar-gradient-color-field">
              <span className="sidebar-gradient-color-field__label">{t ? t('sidebar.gradientColorEnd') : 'Cor Final'}</span>
              <div className="sidebar-color-input">
                <input
                  type="color"
                  className="sidebar-color-picker"
                  value={gradientColor2 || '#9333ea'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor2Change && onGradientColor2Change(e.target.value)}
                />
                <input
                  type="text"
                  className="sidebar-color-text"
                  value={gradientColor2 || '#9333ea'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor2Change && onGradientColor2Change(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Angular Disc Controller */}
          <div className="sidebar-gradient-angle-section">
            <div className="sidebar-control__label-row">
              <span className="sidebar-control__label">{t ? t('sidebar.gradientAngle') : 'Ângulo'}</span>
              <NumericInput
                className="sidebar-inline-number"
                value={gradientAngle ?? 135}
                min={0}
                max={360}
                disabled={disabled}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v)) onGradientAngleChange && onGradientAngleChange(((v % 360) + 360) % 360);
                }}
              />
              <span className="sidebar-control__unit">°</span>
            </div>
            <GradientAngleDisc
              angle={gradientAngle ?? 135}
              colorStart={gradientColor1 || '#e59843'}
              colorEnd={gradientColor2 || '#9333ea'}
              onAngleChange={onGradientAngleChange}
              disabled={disabled}
            />
          </div>

          {/* Preview bar */}
          <div
            className="sidebar-gradient-preview"
            style={{
              background: `linear-gradient(${gradientAngle ?? 135}deg, ${gradientColor1 || '#e59843'}, ${gradientColor2 || '#9333ea'})`,
            }}
          />
        </div>
      ) : (
        /* ── Solid Color Mode ── */
        <>
          <div className="sidebar-color-input">
            <input
              type="color"
              className="sidebar-color-picker"
              aria-label={label}
              value={hexValue || '#000000'}
              disabled={disabled}
              onChange={(e) => onColorChange(e.target.value)}
            />
            <input
              type="text"
              className="sidebar-color-text"
              aria-label={label}
              value={hexValue || '#000000'}
              disabled={disabled}
              onChange={(e) => onColorChange(e.target.value)}
            />
          </div>
          {/* Slider de Opacidade com input numérico bidirecional */}
          <div className="sidebar-opacity-row">
            <span className="sidebar-opacity-row__label">{opacityLabel || 'Opacidade:'}</span>
            <NumericInput
              className="sidebar-inline-number sidebar-inline-number--small"
              value={displayAlpha}
              min={0}
              max={100}
              disabled={disabled}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) onAlphaChange(Math.max(0, Math.min(100, v)) / 100);
              }}
            />
            <span className="sidebar-control__unit">%</span>
          </div>
          <input
            type="range"
            className="sidebar-slider sidebar-slider--opacity"
            min="0"
            max="100"
            value={displayAlpha}
            disabled={disabled}
            onChange={(e) => onAlphaChange(parseInt(e.target.value, 10) / 100)}
          />
        </>
      )}
    </div>
  );
}

