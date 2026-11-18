import { memo } from 'react';
import { wcagLevel } from '../../../utils/css/contrast.js';
import { useLanguage } from '../../../context/LanguageContext';
import { HintButton } from './PropertyLabel';

const TONES = { AAA: 'pass', AA: 'pass', large: 'warn', fail: 'fail' };

// `contrast.ratio` chega arredondado para baixo em uma casa: um par de 4,46:1
// aparece (e é julgado) como 4,4:1, sem subir para uma nota de aprovação.
function ContrastBadge({ contrast }) {
  const { t } = useLanguage();
  if (!contrast) return null;
  const level = wcagLevel(contrast);
  const tone = TONES[level];
  const grade = tone === 'pass' ? level : t(`contrast.${level}`);

  return (
    <div className={`contrast-badge contrast-badge--${tone}`}>
      <div className="contrast-badge__row">
        <span className="contrast-badge__title">{t('contrast.title')}</span>
        <strong className="contrast-badge__value">{`${contrast.ratio.toFixed(1)}:1 · ${grade}`}</strong>
        <HintButton hint={t('glossary.contrast')} />
      </div>
      {tone !== 'pass' && <p className="contrast-badge__warning">{t(level === 'large' ? 'contrast.warningLarge' : 'contrast.warning')}</p>}
    </div>
  );
}

export default memo(ContrastBadge);
