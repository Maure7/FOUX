import { memo } from 'react';
import { wcagLevel } from '../../../utils/css/contrast.js';
import { useLanguage } from '../../../context/LanguageContext';
import { HintButton } from './PropertyLabel';

const TONES = { AAA: 'pass', AA: 'pass', large: 'warn', fail: 'fail' };

// `contrast.ratio` arrives floored to one decimal, so a 4.46:1 pair is shown
// (and judged) as 4.4:1 instead of rounding up into a passing grade.
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
