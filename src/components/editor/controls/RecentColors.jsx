import { memo } from 'react';
import useRecentColors from '../../../hooks/useRecentColors';
import { useLanguage } from '../../../context/LanguageContext';

// Paleta das últimas cores confirmadas, compartilhada por todos os seletores de cor.
// `compact` (paradas de gradiente, lado a lado) esconde a legenda visível.
function RecentColors({ current, disabled, compact, onPick }) {
  const { t } = useLanguage();
  const colors = useRecentColors();
  if (!colors.length) return null;
  const title = t('colorTools.recentColors');

  return (
    <div className={`sidebar-recent-colors${compact ? ' sidebar-recent-colors--compact' : ''}`} role="group" aria-label={title}>
      {!compact && <span className="sidebar-recent-colors__label">{title}</span>}
      <div className="sidebar-recent-colors__swatches">
        {colors.map((hex) => (
          <button
            key={hex}
            type="button"
            className="sidebar-recent-colors__swatch"
            style={{ '--swatch': hex }}
            data-tooltip={hex}
            aria-label={t('colorTools.applyRecent', { color: hex })}
            aria-pressed={hex === current}
            disabled={disabled}
            onClick={() => onPick(hex)}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(RecentColors);
