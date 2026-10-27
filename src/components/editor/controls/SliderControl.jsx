import NumericInput from './NumericInput';

export default function SliderControl({ label, unit, value, min, max, step, disabled, onChange }) {
  const numValue = parseFloat(value) || 0;
  const displayValue = step && step < 1 ? numValue.toFixed(2) : Math.round(numValue);

  return (
    <div className="sidebar-control">
      <div className="sidebar-control__label-row">
        <span className="sidebar-control__label">{label}</span>
        <NumericInput
          className="sidebar-inline-number"
          aria-label={label}
          value={displayValue}
          min={min}
          max={max}
          step={step || 1}
          disabled={disabled}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
        />
        {unit && <span className="sidebar-control__unit">{unit}</span>}
      </div>
      <input
        type="range"
        className="sidebar-slider"
        aria-label={label}
        min={min}
        max={max}
        step={step || 1}
        value={numValue}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

