import { memo } from 'react';
import NumericInput from './NumericInput';
import PropertyLabel from './PropertyLabel';
import useDraft from '../../../hooks/useDraft';

function SliderControl({ label, token, hint, unit, value, min, max, step = 1, disabled, resetKey, onChange }) {
  const [shown, setShown] = useDraft(parseFloat(value) || 0, resetKey);
  const change = (next) => {
    setShown(next);
    onChange(next);
  };

  const fill = max > min ? Math.min(100, Math.max(0, ((shown - min) / (max - min)) * 100)) : 0;

  return (
    <div className="sidebar-control">
      <div className="sidebar-control__label-row">
        <PropertyLabel label={label} token={token} hint={hint} />
        <NumericInput
          className="sidebar-inline-number"
          aria-label={label}
          value={step < 1 ? shown.toFixed(2) : Math.round(shown)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          resetKey={resetKey}
          onChange={change}
        />
        {unit && <span className="sidebar-control__unit">{unit}</span>}
      </div>
      <input
        type="range"
        className="sidebar-slider"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={shown}
        style={{ '--fill': `${fill}%` }}
        disabled={disabled}
        onChange={(event) => change(parseFloat(event.target.value))}
      />
    </div>
  );
}

export default memo(SliderControl);
