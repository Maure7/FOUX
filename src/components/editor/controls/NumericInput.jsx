import { useState } from 'react';

export default function NumericInput({ value, onChange, min, max, ...props }) {
  const [draft, setDraft] = useState(null);
  const clamp = (number) => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, number));
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
        if (text !== '' && Number.isFinite(Number(text))) {
          onChange({ target: { value: String(clamp(Number(text))) } });
        }
      }}
      onBlur={() => {
        if (draft !== null && draft !== '' && Number.isFinite(Number(draft))) {
          onChange({ target: { value: String(clamp(Number(draft))) } });
        }
        setDraft(null);
      }}
    />
  );
}

