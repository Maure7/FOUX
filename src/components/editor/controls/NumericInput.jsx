import { memo, useState } from 'react';

// Mantém texto incompleto ("", "-", "1.") durante a digitação e só repassa
// números finitos e limitados, para CSS inválido nunca chegar ao canvas.
function NumericInput({ value, onChange, min, max, resetKey, ...props }) {
  const [draft, setDraft] = useState(null);
  // O texto digitado pertence ao elemento em que foi digitado.
  const [draftKey, setDraftKey] = useState(resetKey);
  if (draftKey !== resetKey) {
    setDraftKey(resetKey);
    setDraft(null);
  }
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
