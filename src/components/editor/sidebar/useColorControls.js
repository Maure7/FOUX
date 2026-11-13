import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_GRADIENT, extractAlpha, gradientCss, hexAlphaToRgba, sameColor } from '../../../utils/css/color.js';
import { changeMeta } from '../../../utils/historyLabels.js';

const fromComputed = (previous, parsed) => (parsed ? { ...parsed, enabled: true } : { ...previous, enabled: false });
const percent = (alpha) => `${Math.round(alpha * 100)}%`;

// Picking a color on a fully transparent element (e.g. a <div> without a
// background) would otherwise apply an invisible rgba(…, 0).
const visibleAlpha = (raw) => extractAlpha(raw) || 1;

// Text, background and border colors are shared by the Styles and Layout tabs.
// Handlers stay referentially stable (they read the latest computed styles
// from a ref), so memoized controls skip re-rendering while another one drags.
export default function useColorControls({ selectedElement, computedStyles, revision, apply, applyStyle, onStyleChange }) {
  const styles = useRef(computedStyles);
  const elementRef = useRef(selectedElement);
  useEffect(() => {
    styles.current = computedStyles;
    elementRef.current = selectedElement;
  }, [computedStyles, selectedElement]);

  // Gradients keep their last colors while disabled, so toggling back restores them.
  const [bgGradient, setBgGradient] = useState(() => fromComputed(DEFAULT_GRADIENT, computedStyles?.backgroundGradient));
  const [borderGradient, setBorderGradient] = useState(() => fromComputed(DEFAULT_GRADIENT, computedStyles?.borderGradient));
  // Restoring an element (revision) replaces its styles without reselecting it.
  const [synced, setSynced] = useState({ element: selectedElement, revision });
  if (synced.element !== selectedElement || synced.revision !== revision) {
    setSynced({ element: selectedElement, revision });
    setBgGradient((previous) => fromComputed(previous, computedStyles?.backgroundGradient));
    setBorderGradient((previous) => fromComputed(previous, computedStyles?.borderGradient));
  }

  const onTextColor = useCallback((hex) => apply('color', hexAlphaToRgba(hex, visibleAlpha(styles.current?._rawColor))), [apply]);
  const onTextAlpha = useCallback((alpha) => {
    const current = styles.current;
    // Borders without an explicit color follow currentColor; pin them first
    // so changing the text opacity does not fade the border as well.
    const borderFollowsText = !current?.borderGradient && sameColor(current?._rawColor, current?._rawBorderColor);
    onStyleChange(changeMeta('history.props.colorAlpha', elementRef.current, percent(extractAlpha(current?._rawColor)), percent(alpha)));
    applyStyle('color', hexAlphaToRgba(current?.color ?? '#000000', alpha));
    if (borderFollowsText) applyStyle('borderColor', current._rawBorderColor);
  }, [applyStyle, onStyleChange]);

  const onBgColor = useCallback((hex) => apply('backgroundColor', hexAlphaToRgba(hex, visibleAlpha(styles.current?._rawBg))), [apply]);
  const onBgAlpha = useCallback((alpha) => apply(
    'backgroundColor',
    hexAlphaToRgba(styles.current?.backgroundColor ?? '#ffffff', alpha),
    changeMeta('history.props.backgroundAlpha', elementRef.current, percent(extractAlpha(styles.current?._rawBg)), percent(alpha)),
  ), [apply]);
  const onBgGradient = useCallback((next) => {
    setBgGradient(next);
    const meta = changeMeta('history.props.backgroundImage', elementRef.current,
      styles.current?.backgroundGradient ?? 'none', next.enabled ? gradientCss(next) : 'none');
    if (next.enabled) {
      apply('backgroundImage', gradientCss(next), meta);
      apply('backgroundColor', '', meta);
    } else {
      // Restore the visible fill with its alpha; a hex here would turn a
      // transparent background black.
      apply('backgroundImage', 'none', meta);
      apply('backgroundColor', styles.current?._rawBg || '', meta);
    }
  }, [apply]);

  const onBorderColor = useCallback((hex) => apply('borderColor', hexAlphaToRgba(hex, visibleAlpha(styles.current?._rawBorderColor))), [apply]);
  const onBorderAlpha = useCallback((alpha) => apply(
    'borderColor',
    hexAlphaToRgba(styles.current?.borderColor ?? '#CBD5E1', alpha),
    changeMeta('history.props.borderAlpha', elementRef.current, percent(extractAlpha(styles.current?._rawBorderColor)), percent(alpha)),
  ), [apply]);
  const onBorderGradient = useCallback((next) => {
    setBorderGradient(next);
    apply('borderGradient', next.enabled ? { color1: next.color1, color2: next.color2, angle: next.angle } : null);
  }, [apply]);

  const textColor = computedStyles?.color ?? '#000000';
  const textAlpha = extractAlpha(computedStyles?._rawColor);
  const bgColor = computedStyles?.backgroundColor ?? '#ffffff';
  const bgAlpha = extractAlpha(computedStyles?._rawBg);
  const borderColor = computedStyles?.borderColor ?? '#CBD5E1';
  const borderAlpha = extractAlpha(computedStyles?._rawBorderColor);
  // Floored, so a pair just below a WCAG threshold never displays as passing.
  const ratio = computedStyles?.contrast ? Math.floor(computedStyles.contrast.ratio * 10) / 10 : null;
  const large = !!computedStyles?.contrast?.large;
  const contrast = useMemo(() => (ratio === null ? null : { ratio, large }), [ratio, large]);

  const text = useMemo(() => ({
    color: textColor, alpha: textAlpha, onColorChange: onTextColor, onAlphaChange: onTextAlpha, contrast,
  }), [textColor, textAlpha, onTextColor, onTextAlpha, contrast]);
  const background = useMemo(() => ({
    color: bgColor, alpha: bgAlpha, onColorChange: onBgColor, onAlphaChange: onBgAlpha,
    gradient: bgGradient, onGradientChange: onBgGradient, contrast,
  }), [bgColor, bgAlpha, onBgColor, onBgAlpha, bgGradient, onBgGradient, contrast]);
  const border = useMemo(() => ({
    color: borderColor, alpha: borderAlpha, onColorChange: onBorderColor, onAlphaChange: onBorderAlpha,
    gradient: borderGradient, onGradientChange: onBorderGradient,
  }), [borderColor, borderAlpha, onBorderColor, onBorderAlpha, borderGradient, onBorderGradient]);

  return useMemo(() => ({ text, background, border }), [text, background, border]);
}
