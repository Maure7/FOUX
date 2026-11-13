import { memo } from 'react';
import ColorField from './ColorField';
import NumericInput from './NumericInput';
import GradientAngleDisc from './GradientAngleDisc';
import PropertyLabel from './PropertyLabel';
import { cssInfo } from '../../../utils/css/glossary.js';
import { useLanguage } from '../../../context/LanguageContext';
import { gradientCss } from '../../../utils/css/color.js';

function GradientControls({ gradient, disabled, onChange }) {
  const { t } = useLanguage();
  const update = (patch) => onChange({ ...gradient, ...patch });
  const stops = [
    ['color1', t('sidebar.gradientColorStart')],
    ['color2', t('sidebar.gradientColorEnd')],
  ];

  return (
    <div className="sidebar-gradient-controls">
      <div className="sidebar-gradient-colors">
        {stops.map(([key, label]) => (
          <div className="sidebar-gradient-color-field" key={key}>
            <span className="sidebar-gradient-color-field__label">{label}</span>
            <ColorField label={label} value={gradient[key]} disabled={disabled} onChange={(color) => update({ [key]: color })} />
          </div>
        ))}
      </div>
      <div className="sidebar-gradient-angle-section">
        <div className="sidebar-control__label-row">
          <PropertyLabel label={t('sidebar.gradientAngle')} {...cssInfo(t, 'gradientAngle')} />
          <NumericInput
            className="sidebar-inline-number"
            aria-label={t('sidebar.gradientAngle')}
            value={gradient.angle}
            min={0}
            max={360}
            disabled={disabled}
            onChange={(value) => update({ angle: Math.round(value) % 360 })}
          />
          <span className="sidebar-control__unit">°</span>
        </div>
        <GradientAngleDisc
          angle={gradient.angle}
          colorStart={gradient.color1}
          colorEnd={gradient.color2}
          disabled={disabled}
          onAngleChange={(angle) => update({ angle })}
        />
      </div>
      <div className="sidebar-gradient-preview" style={{ background: gradientCss(gradient) }} />
    </div>
  );
}

export default memo(GradientControls);
