import { memo, useEffect, useState } from 'react';
import { Link2, Link2Off } from 'lucide-react';
import NumericInput from './NumericInput';
import PropertyLabel from './PropertyLabel';
import { cssInfo } from '../../../utils/css/glossary.js';

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
const NO_SIDES = [0, 0, 0, 0];
const allEqual = (sides) => sides.every((value) => value === sides[0]);
const boxOf = (event) => event.target.closest?.('[data-box]')?.dataset.box ?? null;

function SideInput({ property, index, value, disabled, resetKey, onChange, t }) {
  return (
    <NumericInput
      className={`box-model__input box-model__input--${SIDES[index].toLowerCase()}`}
      aria-label={`${t(`sidebar.${property}`)} — ${t(`sidebar.side${SIDES[index]}`)}`}
      value={value}
      min={0}
      disabled={disabled}
      resetKey={resetKey}
      onChange={(number) => onChange(property, index, number)}
    />
  );
}

function RingLabel({ property, linked, disabled, onToggle, t }) {
  const label = t(linked ? 'sidebar.unlinkSides' : 'sidebar.linkSides');
  return (
    <span className="box-model__ring-label">
      <code>{property}</code>
      <button
        type="button"
        className="box-model__link"
        aria-pressed={linked}
        aria-label={`${label} (${property})`}
        data-tooltip={label}
        disabled={disabled}
        onClick={() => onToggle(property)}
      >
        {linked ? <Link2 size={11} /> : <Link2Off size={11} />}
      </button>
    </span>
  );
}

// Primeiro os campos shorthand (os quatro lados), depois um diagrama estilo
// DevTools por lado. Passar o mouse ou focar uma das propriedades diz ao canvas
// qual área do box pintar sobre o elemento selecionado.
function BoxModelEditor({ element, values, disabled, apply, onBoxFocus, resetKey, t }) {
  const sides = { padding: values?.paddingSides ?? NO_SIDES, margin: values?.marginSides ?? NO_SIDES };
  const initialLinks = () => ({ element, padding: allEqual(sides.padding), margin: allEqual(sides.margin) });
  const [links, setLinks] = useState(initialLinks);
  if (links.element !== element) setLinks(initialLinks());

  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);
  const active = disabled ? null : hovered ?? focused;
  useEffect(() => {
    onBoxFocus?.(active);
  }, [active, onBoxFocus]);
  useEffect(() => () => onBoxFocus?.(null), [onBoxFocus]);

  const setSide = (property, index, number) => {
    if (links[property]) apply(property, `${number}px`);
    else apply(`${property}${SIDES[index]}`, `${number}px`);
  };
  const toggle = (property) => setLinks((current) => ({ ...current, [property]: !current[property] }));
  const contentText = values?.contentSize ? `${values.contentSize[0]} × ${values.contentSize[1]}` : '—';
  const side = (property, index) => (
    <SideInput property={property} index={index} value={sides[property][index]} disabled={disabled} resetKey={resetKey} onChange={setSide} t={t} />
  );

  return (
    <div
      className="box-model"
      onPointerOver={(event) => setHovered(boxOf(event))}
      onPointerLeave={() => setHovered(null)}
      onFocus={(event) => setFocused(boxOf(event))}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null); }}
    >
      {['padding', 'margin'].map((property) => (
        <div className="sidebar-control__label-row box-model__shorthand" data-box={property} key={property}>
          <PropertyLabel label={t(`sidebar.${property}`)} {...cssInfo(t, property)} />
          <NumericInput
            className="sidebar-inline-number"
            aria-label={t(`sidebar.${property}`)}
            value={allEqual(sides[property]) ? sides[property][0] : ''}
            placeholder={t('sidebar.mixedSides')}
            min={0}
            disabled={disabled}
            resetKey={resetKey}
            onChange={(number) => apply(property, `${number}px`)}
          />
          <span className="sidebar-control__unit">px</span>
        </div>
      ))}

      <div className={`box-model__diagram ${active ? `box-model__diagram--${active}` : ''}`}>
        <div className="box-model__ring box-model__ring--margin" data-box="margin">
          <RingLabel property="margin" linked={links.margin} disabled={disabled} onToggle={toggle} t={t} />
          {side('margin', 0)}
          <div className="box-model__middle">
            {side('margin', 3)}
            <div className="box-model__ring box-model__ring--padding" data-box="padding">
              <RingLabel property="padding" linked={links.padding} disabled={disabled} onToggle={toggle} t={t} />
              {side('padding', 0)}
              <div className="box-model__middle">
                {side('padding', 3)}
                <div className="box-model__content" role="img" aria-label={`${t('sidebar.contentBox')}: ${contentText}`}>
                  {contentText}
                </div>
                {side('padding', 1)}
              </div>
              {side('padding', 2)}
            </div>
            {side('margin', 1)}
          </div>
          {side('margin', 2)}
        </div>
      </div>
    </div>
  );
}

export default memo(BoxModelEditor);
