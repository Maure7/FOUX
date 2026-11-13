import { memo, useState } from 'react';
import useDraft from '../../../hooks/useDraft';
import { normalizeHex } from '../../../utils/css/color.js';

// Picker + hexadecimal text. Typed text is kept until blur and only complete
// values (#abc, #aabbcc, with or without '#') are applied while typing.
function ColorField({ label, value, disabled, onChange }) {
  const [picked, setPicked] = useDraft(value);
  const [typed, setTyped] = useState(null);
  const pickerValue = normalizeHex(picked) || '#000000';

  return (
    <div className="sidebar-color-input">
      <input
        type="color"
        className="sidebar-color-picker"
        aria-label={label}
        value={pickerValue}
        disabled={disabled}
        onChange={(event) => {
          setPicked(event.target.value);
          onChange(event.target.value);
        }}
      />
      <input
        type="text"
        className="sidebar-color-text"
        aria-label={label}
        value={typed ?? picked ?? ''}
        maxLength={7}
        spellCheck={false}
        disabled={disabled}
        onChange={(event) => {
          setTyped(event.target.value);
          const hex = normalizeHex(event.target.value);
          if (hex) {
            setPicked(hex);
            onChange(hex);
          }
        }}
        onBlur={() => setTyped(null)}
      />
    </div>
  );
}

export default memo(ColorField);
