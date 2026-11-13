import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Palette, Square } from 'lucide-react';
import CollapsibleSection from '../controls/CollapsibleSection';
import ColorField from '../controls/ColorField';
import GradientControls from '../controls/GradientControls';
import NumericInput from '../controls/NumericInput';
import { HintButton } from '../controls/PropertyLabel';
import ShadowPad from '../controls/ShadowPad';
import SliderControl from '../controls/SliderControl';
import { getGradientBorder } from '../../../utils/gradientBorder';
import { buildHoverDeclarations, readHoverState, shadowCss } from '../../../utils/inspector/hoverRules';
import { cssInfo } from '../../../utils/css/glossary.js';
import { changeMeta } from '../../../utils/historyLabels.js';

const SHADOW_RANGE = 30;
const clampOffset = (value) => Math.max(-SHADOW_RANGE, Math.min(SHADOW_RANGE, Math.round(value)));

// The hint button stays outside the <label> so clicking it never toggles the checkbox.
function ToggleRow({ checked, label, token, hint, onChange }) {
  return (
    <div className="sidebar-toggle-line">
      <label className="sidebar-toggle-row">
        <input type="checkbox" className="sidebar-toggle-checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="sidebar-control__label prop-label">
          <span className="prop-label__name">{label}</span>
          {token && <code className="prop-label__token">{token}</code>}
        </span>
      </label>
      {hint && <HintButton hint={hint} />}
    </div>
  );
}

function OffsetField({ axis, label, value, onChange }) {
  return (
    <div className="shadow-offset-field">
      <span className="shadow-offset-field__label">{axis}</span>
      <NumericInput
        className="sidebar-inline-number"
        aria-label={`${label} ${axis}`}
        value={value}
        min={-SHADOW_RANGE}
        max={SHADOW_RANGE}
        onChange={onChange}
      />
      <span className="sidebar-control__unit">px</span>
    </div>
  );
}

// The parent keys this tab by element, so state always starts from the rules
// already saved for the selected element. Rules are written only after user
// input: merely viewing the tab (or the tour) never touches the document.
function HoverTab({ element, getHoverRules, assignHoverClass, injectHoverStyles, onStyleChange, tourStep, t }) {
  const [hover, setHover] = useState(() => readHoverState(getHoverRules(element), element.ownerDocument));
  const latest = useRef(hover);
  const pending = useRef(false);
  const frame = useRef(0);

  const flush = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (!pending.current) return;
    pending.current = false;
    const css = buildHoverDeclarations(latest.current, getGradientBorder(element));
    if (!css && !getHoverRules(element)) return;
    const cls = assignHoverClass(element);
    if (!cls) return;
    onStyleChange(changeMeta('history.props.hover', element));
    injectHoverStyles(`.${cls}`, css, element);
  }, [element, getHoverRules, assignHoverClass, injectHoverStyles, onStyleChange]);

  // Switching tabs or elements right after an edit must not drop it.
  useEffect(() => flush, [flush]);

  // Drags (scale, blur, shadow pad) rebuild the stylesheet at most once per frame.
  const update = useCallback((patch) => {
    latest.current = { ...latest.current, ...patch };
    setHover(latest.current);
    pending.current = true;
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  }, [flush]);

  const set = useMemo(() => ({
    bg: (bg) => update({ bg }),
    bgColor: (bgColor) => update({ bgColor }),
    bgGradient: (bgGradient) => update({ bgGradient }),
    text: (text) => update({ text }),
    textColor: (textColor) => update({ textColor }),
    scale: (scale) => update({ scale }),
    scaleValue: (scaleValue) => update({ scaleValue }),
    shadow: (shadow) => update({ shadow }),
    offset: (shadowX, shadowY) => update({ shadowX, shadowY }),
    shadowX: (value) => update({ shadowX: clampOffset(value) }),
    shadowY: (value) => update({ shadowY: clampOffset(value) }),
    shadowBlur: (shadowBlur) => update({ shadowBlur }),
    shadowOpacity: (shadowOpacity) => update({ shadowOpacity }),
  }), [update]);

  return (
    <>
      <CollapsibleSection title={t('sidebar.eventsHover')} icon={Palette} tourId="events" tourStep={tourStep}>
        <div className="sidebar-control">
          <ToggleRow checked={hover.bg} label={t('sidebar.hoverBgColor')} {...cssInfo(t, 'hoverBackground')} onChange={set.bg} />
          {hover.bg && (
            <>
              <label className="sidebar-gradient-toggle" style={{ marginBottom: 6, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={hover.bgGradient.enabled}
                  onChange={(event) => set.bgGradient({ ...hover.bgGradient, enabled: event.target.checked })}
                />
                <span className="sidebar-gradient-toggle__slider" />
                <span className="sidebar-gradient-toggle__text">{t('sidebar.gradient')}</span>
              </label>
              {hover.bgGradient.enabled
                ? <GradientControls gradient={hover.bgGradient} onChange={set.bgGradient} />
                : <ColorField label={t('sidebar.hoverBgColor')} value={hover.bgColor} onChange={set.bgColor} />}
            </>
          )}
        </div>

        <div className="sidebar-control">
          <ToggleRow checked={hover.text} label={t('sidebar.hoverTextColor')} {...cssInfo(t, 'hoverColor')} onChange={set.text} />
          {hover.text && <ColorField label={t('sidebar.hoverTextColor')} value={hover.textColor} onChange={set.textColor} />}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t('sidebar.hoverScaleSection')} icon={Maximize}>
        <div className="sidebar-control">
          <ToggleRow checked={hover.scale} label={t('sidebar.hoverScaleToggle')} {...cssInfo(t, 'scale')} onChange={set.scale} />
          {hover.scale && (
            <SliderControl label={t('sidebar.scale')} token="scale()" value={hover.scaleValue} min={0.8} max={1.3} step={0.01} onChange={set.scaleValue} />
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t('sidebar.hoverShadowSection')} icon={Square}>
        <div className="sidebar-control">
          <ToggleRow checked={hover.shadow} label={t('sidebar.hoverShadowToggle')} {...cssInfo(t, 'boxShadow')} onChange={set.shadow} />
          {hover.shadow && (
            <>
              <ShadowPad x={hover.shadowX} y={hover.shadowY} max={SHADOW_RANGE} label={t('sidebar.shadowDirection')} {...cssInfo(t, 'shadowOffset')} onChange={set.offset} />
              <div className="shadow-offset-row">
                <OffsetField axis="X" label={t('sidebar.shadowDirection')} value={hover.shadowX} onChange={set.shadowX} />
                <OffsetField axis="Y" label={t('sidebar.shadowDirection')} value={hover.shadowY} onChange={set.shadowY} />
              </div>
              <SliderControl label={t('sidebar.shadowBlur')} {...cssInfo(t, 'shadowBlur')} unit="px" value={hover.shadowBlur} min={0} max={60} onChange={set.shadowBlur} />
              <SliderControl label={t('sidebar.shadowOpacity')} {...cssInfo(t, 'shadowOpacity')} unit="%" value={hover.shadowOpacity} min={0} max={100} onChange={set.shadowOpacity} />
              <div className="shadow-preview-string">
                <code>{shadowCss(hover, ',')}</code>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>
    </>
  );
}

export default memo(HoverTab);
