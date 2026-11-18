import { memo } from 'react';
import { Info } from 'lucide-react';

// Nome amigável, o token oficial do CSS e uma dica de uma linha. O botão de dica
// fica fora de qualquer <label>, então o clique nunca alterna o controle ao lado.
function PropertyLabel({ label, token, hint, className = '' }) {
  return (
    <span className={`sidebar-control__label prop-label ${className}`}>
      <span className="prop-label__name">{label}</span>
      {(token || hint) && (
        <span className="prop-label__meta">
          {token && <code className="prop-label__token">{token}</code>}
          {hint && <HintButton hint={hint} />}
        </span>
      )}
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
