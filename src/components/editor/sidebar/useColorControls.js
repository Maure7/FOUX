import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_GRADIENT, extractAlpha, gradientCss, hexAlphaToRgba, sameColor } from '../../../utils/css/color.js';
import { isSingleGradient } from '../../../utils/gradientBorder';
import { changeMeta } from '../../../utils/historyLabels.js';

const fromComputed = (previous, parsed) => (parsed ? { ...parsed, enabled: true } : { ...previous, enabled: false });
const percent = (alpha) => `${Math.round(alpha * 100)}%`;

// Escolher uma cor num elemento totalmente transparente (ex.: <div> sem fundo)
// aplicaria um rgba(…, 0) invisível.
const visibleAlpha = (raw) => extractAlpha(raw) || 1;

// Um gradiente que a sidebar não edita (radial, cônico) cobre a cor de fundo escolhida.
const gradientCoversFill = (styles) => !styles?.backgroundGradient && isSingleGradient(styles?._rawBgImage);

// Cores de texto, fundo e borda são compartilhadas pelas abas Estilos e Layout.
// Os handlers são estáveis (leem os estilos mais recentes de uma ref), então os
// controles memorizados não re-renderizam enquanto outro está sendo arrastado.
export default function useColorControls({ selectedElement, computedStyles, revision, apply, applyStyle, onStyleChange }) {
  const styles = useRef(computedStyles);
  const elementRef = useRef(selectedElement);
  useEffect(() => {
    styles.current = computedStyles;
    elementRef.current = selectedElement;
  }, [computedStyles, selectedElement]);

  // Os gradientes guardam as últimas cores enquanto desligados, para religar igual.
  const [bgGradient, setBgGradient] = useState(() => fromComputed(DEFAULT_GRADIENT, computedStyles?.backgroundGradient));
  const [borderGradient, setBorderGradient] = useState(() => fromComputed(DEFAULT_GRADIENT, computedStyles?.borderGradient));
  // Restaurar o elemento (revision) troca os estilos sem selecionar de novo.
  const [synced, setSynced] = useState({ element: selectedElement, revision });
  if (synced.element !== selectedElement || synced.revision !== revision) {
    setSynced({ element: selectedElement, revision });
    setBgGradient((previous) => fromComputed(previous, computedStyles?.backgroundGradient));
    setBorderGradient((previous) => fromComputed(previous, computedStyles?.borderGradient));
  }

  const onTextColor = useCallback((hex) => apply('color', hexAlphaToRgba(hex, visibleAlpha(styles.current?._rawColor))), [apply]);
  const onTextAlpha = useCallback((alpha) => {
    const current = styles.current;
    // Bordas sem cor própria seguem currentColor; fixa a cor da borda visível
    // antes, para a opacidade do texto não apagar a borda junto.
    const borderFollowsText = !current?.borderGradient && current?.borderWidth > 0
      && sameColor(current?._rawColor, current?._rawBorderColor);
    onStyleChange(changeMeta('history.props.colorAlpha', elementRef.current, percent(extractAlpha(current?._rawColor)), percent(alpha)));
    applyStyle('color', hexAlphaToRgba(current?.color ?? '#000000', alpha));
    if (borderFollowsText) applyStyle('borderColor', current._rawBorderColor);
  }, [applyStyle, onStyleChange]);

  // A cor e a troca do gradiente não editável formam um único passo de desfazer.
  const applyFill = useCallback((color, meta) => {
    if (!gradientCoversFill(styles.current)) {
      apply('backgroundColor', color, meta);
      return;
    }
    const step = meta ?? changeMeta('history.props.backgroundColor', elementRef.current, styles.current?._rawBg, color);
    apply('backgroundImage', 'none', step);
    apply('backgroundColor', color, step);
  }, [apply]);
  const onBgColor = useCallback((hex) => applyFill(hexAlphaToRgba(hex, visibleAlpha(styles.current?._rawBg))), [applyFill]);
  const onBgAlpha = useCallback((alpha) => applyFill(
    hexAlphaToRgba(styles.current?.backgroundColor ?? '#ffffff', alpha),
    changeMeta('history.props.backgroundAlpha', elementRef.current, percent(extractAlpha(styles.current?._rawBg)), percent(alpha)),
  ), [applyFill]);
  const onBgGradient = useCallback((next) => {
    setBgGradient(next);
    const meta = changeMeta('history.props.backgroundImage', elementRef.current,
      styles.current?.backgroundGradient ?? 'none', next.enabled ? gradientCss(next) : 'none');
    if (next.enabled) {
      // A cor sólida fica por baixo do gradiente: desligar o gradiente a traz de volta.
      apply('backgroundImage', gradientCss(next), meta);
    } else {
      // Restaura o preenchimento visível com o alfa; um hex aqui deixaria preto
      // um fundo transparente.
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
  // Arredondado para baixo: um par logo abaixo do limite WCAG nunca aparece como aprovado.
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
