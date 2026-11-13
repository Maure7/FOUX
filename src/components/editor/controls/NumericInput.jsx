import { memo, useState } from 'react';

// Keeps incomplete text (empty, "-", "1.") while typing and reports only
// finite, clamped numbers, so invalid CSS never reaches the canvas.
function NumericInput({ value, onChange, min, max, ...props }) {
  const [draft, setDraft] = useState(null);
  return (
    <input
      {...props}
      type="number"
      min={min}
      max={max}
      value={draft ?? value}
      onFocus={(event) => setDraft(event.target.value)}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const number = Number(text);
        if (text !== '' && Number.isFinite(number)) {
          onChange(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, number)));
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export default memo(NumericInput);
