import { memo } from 'react';
import { Info } from 'lucide-react';

// Friendly name, the official CSS token and a one-line hint. The hint button
// sits outside any <label>, so clicking it never toggles the related control.
function PropertyLabel({ label, token, hint, className = '' }) {
  return (
    <span className={`sidebar-control__label prop-label ${className}`}>
      <span className="prop-label__name">{label}</span>
      {token && <code className="prop-label__token">{token}</code>}
      {hint && <HintButton hint={hint} />}
    </span>
  );
}

export function HintButton({ hint }) {
  return (
    <button type="button" className="prop-label__hint" data-tooltip={hint} aria-label={hint}>
      <Info size={11} aria-hidden="true" />
    </button>
  );
}

export default memo(PropertyLabel);
