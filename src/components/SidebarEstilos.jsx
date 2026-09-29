import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Square,
  Maximize,
  Paintbrush,
  MousePointerClick,
  Image,
  Upload,
  Layers,
  Palette,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* ===================================================================
   SidebarEstilos — Painel lateral reativo de estilização visual.
   Totalmente internacionalizado (PT-BR / ES Latino-americano).
   Inclui suporte a Gradientes com Controlador Angular.
   =================================================================== */

/* Tags de texto que exibem controles de tipografia */
const TEXT_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'P', 'SPAN', 'A', 'BUTTON', 'LABEL',
  'LI', 'TD', 'TH', 'BODY', 'DIV', 'SECTION',
  'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN',
  'BLOCKQUOTE', 'FIGCAPTION', 'SUMMARY', 'DETAILS',
  'STRONG', 'EM', 'B', 'I', 'U', 'SMALL', 'MARK',
]);

const SAFE_FONTS = [
  { key: 'defaultBrowserFont', labelPt: 'Padrão do navegador', labelEs: 'Predeterminada del navegador', value: '' },
  { label: 'Arial (Sans-serif)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Courier New (Monospace)', value: '"Courier New", Courier, monospace' },
];

/* ===== Utilitários de cor ===== */

/** Converte hex #rrggbb + alpha 0-1 para rgba() */
function hexAlphaToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const a = parseFloat(alpha);
  if (a >= 1) return hex;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

/** Extrai alpha de valor rgba(..., a) */
function extractAlpha(colorValue) {
  if (!colorValue) return 1;
  const m = colorValue.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)/);
  if (m) return parseFloat(m[1]);
  if (colorValue === 'transparent') return 0;
  return 1;
}

/* ===== COLLAPSIBLE SECTION ===== */
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`sidebar-section ${isOpen ? 'sidebar-section--open' : 'sidebar-section--closed'}`}>
      <button
        className={`sidebar-section__header ${isOpen ? 'sidebar-section__header--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="sidebar-section__header-left">
          {Icon && <Icon size={14} className="sidebar-section__icon" />}
          <span className="sidebar-section__title">{title}</span>
        </div>
        <span className="sidebar-section__chevron">
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {isOpen && (
        <div className="sidebar-section__body">
          {children}
        </div>
      )}
    </div>
  );
}

function formatTagName(tag) {
  if (!tag) return '';
  return `<${tag.toLowerCase()}>`;
}

/* ===== BIDIRECTIONAL SLIDER WITH NUMERIC INPUT ===== */
function SliderControl({ label, unit, value, min, max, step, disabled, onChange }) {
  const numValue = parseFloat(value) || 0;
  const displayValue = step && step < 1 ? numValue.toFixed(2) : Math.round(numValue);

  return (
    <div className="sidebar-control">
      <div className="sidebar-control__label-row">
        <span className="sidebar-control__label">{label}</span>
        <input
          type="number"
          className="sidebar-inline-number"
          value={displayValue}
          min={min}
          max={max}
          step={step || 1}
          disabled={disabled}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
        />
        {unit && <span className="sidebar-control__unit">{unit}</span>}
      </div>
      <input
        type="range"
        className="sidebar-slider"
        min={min}
        max={max}
        step={step || 1}
        value={numValue}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

/* ===== GRADIENT ANGLE DISC CONTROLLER ===== */
function GradientAngleDisc({ angle, onAngleChange, disabled }) {
  const discRef = useRef(null);
  const isDraggingRef = useRef(false);

  const computeAngle = useCallback((clientX, clientY) => {
    if (!discRef.current) return 0;
    const rect = discRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2 returns angle from positive X axis; CSS gradient 0deg = bottom-to-top
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return Math.round(deg) % 360;
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    isDraggingRef.current = true;
    onAngleChange(computeAngle(e.clientX, e.clientY));

    const onMove = (ev) => {
      if (!isDraggingRef.current) return;
      onAngleChange(computeAngle(ev.clientX, ev.clientY));
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [disabled, computeAngle, onAngleChange]);

  // Handle position: place on the circumference
  const rad = ((angle - 90) * Math.PI) / 180;
  const handleX = 50 + 40 * Math.cos(rad); // 40% radius
  const handleY = 50 + 40 * Math.sin(rad);

  return (
    <div className="gradient-angle-disc-wrapper">
      <div
        className="gradient-angle-disc"
        ref={discRef}
        onMouseDown={handleMouseDown}
        style={{
          background: `conic-gradient(from 0deg, #e59843, #9333ea, #e59843)`,
        }}
      >
        <div className="gradient-angle-disc__inner" />
        <div
          className="gradient-angle-disc__handle"
          style={{
            left: `${handleX}%`,
            top: `${handleY}%`,
          }}
        />
        <span className="gradient-angle-disc__label">{angle}°</span>
      </div>
    </div>
  );
}

/* ===== COLOR CONTROL WITH ALPHA SLIDER + GRADIENT SUPPORT ===== */
function ColorControl({
  label, hexValue, alphaValue, disabled,
  onColorChange, onAlphaChange, opacityLabel,
  // Gradient props
  gradientEnabled, onGradientToggle,
  gradientColor1, gradientColor2, gradientAngle,
  onGradientColor1Change, onGradientColor2Change, onGradientAngleChange,
  showGradient = false,
  t,
}) {
  const displayAlpha = Math.round((alphaValue ?? 1) * 100);

  return (
    <div className="sidebar-control">
      <div className="sidebar-control__label-row">
        <span className="sidebar-control__label">{label}</span>
        {showGradient && (
          <label className="sidebar-gradient-toggle">
            <input
              type="checkbox"
              checked={!!gradientEnabled}
              disabled={disabled}
              onChange={(e) => onGradientToggle && onGradientToggle(e.target.checked)}
            />
            <span className="sidebar-gradient-toggle__slider" />
            <span className="sidebar-gradient-toggle__text">{t ? t('sidebar.gradient') : 'Gradiente'}</span>
          </label>
        )}
      </div>

      {gradientEnabled ? (
        /* ── Gradient Mode ── */
        <div className="sidebar-gradient-controls">
          <div className="sidebar-gradient-colors">
            <div className="sidebar-gradient-color-field">
              <span className="sidebar-gradient-color-field__label">{t ? t('sidebar.gradientColorStart') : 'Cor Inicial'}</span>
              <div className="sidebar-color-input">
                <input
                  type="color"
                  className="sidebar-color-picker"
                  value={gradientColor1 || '#e59843'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor1Change && onGradientColor1Change(e.target.value)}
                />
                <input
                  type="text"
                  className="sidebar-color-text"
                  value={gradientColor1 || '#e59843'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor1Change && onGradientColor1Change(e.target.value)}
                />
              </div>
            </div>
            <div className="sidebar-gradient-color-field">
              <span className="sidebar-gradient-color-field__label">{t ? t('sidebar.gradientColorEnd') : 'Cor Final'}</span>
              <div className="sidebar-color-input">
                <input
                  type="color"
                  className="sidebar-color-picker"
                  value={gradientColor2 || '#9333ea'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor2Change && onGradientColor2Change(e.target.value)}
                />
                <input
                  type="text"
                  className="sidebar-color-text"
                  value={gradientColor2 || '#9333ea'}
                  disabled={disabled}
                  onChange={(e) => onGradientColor2Change && onGradientColor2Change(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Angular Disc Controller */}
          <div className="sidebar-gradient-angle-section">
            <div className="sidebar-control__label-row">
              <span className="sidebar-control__label">{t ? t('sidebar.gradientAngle') : 'Ângulo'}</span>
              <input
                type="number"
                className="sidebar-inline-number"
                value={gradientAngle ?? 135}
                min={0}
                max={360}
                disabled={disabled}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v)) onGradientAngleChange && onGradientAngleChange(((v % 360) + 360) % 360);
                }}
              />
              <span className="sidebar-control__unit">°</span>
            </div>
            <GradientAngleDisc
              angle={gradientAngle ?? 135}
              onAngleChange={onGradientAngleChange}
              disabled={disabled}
            />
          </div>

          {/* Preview bar */}
          <div
            className="sidebar-gradient-preview"
            style={{
              background: `linear-gradient(${gradientAngle ?? 135}deg, ${gradientColor1 || '#e59843'}, ${gradientColor2 || '#9333ea'})`,
            }}
          />
        </div>
      ) : (
        /* ── Solid Color Mode ── */
        <>
          <div className="sidebar-color-input">
            <input
              type="color"
              className="sidebar-color-picker"
              value={hexValue || '#000000'}
              disabled={disabled}
              onChange={(e) => onColorChange(e.target.value)}
            />
            <input
              type="text"
              className="sidebar-color-text"
              value={hexValue || '#000000'}
              disabled={disabled}
              onChange={(e) => onColorChange(e.target.value)}
            />
          </div>
          {/* Slider de Opacidade com input numérico bidirecional */}
          <div className="sidebar-opacity-row">
            <span className="sidebar-opacity-row__label">{opacityLabel || 'Opacidade:'}</span>
            <input
              type="number"
              className="sidebar-inline-number sidebar-inline-number--small"
              value={displayAlpha}
              min={0}
              max={100}
              disabled={disabled}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) onAlphaChange(Math.max(0, Math.min(100, v)) / 100);
              }}
            />
            <span className="sidebar-control__unit">%</span>
          </div>
          <input
            type="range"
            className="sidebar-slider sidebar-slider--opacity"
            min="0"
            max="100"
            value={displayAlpha}
            disabled={disabled}
            onChange={(e) => onAlphaChange(parseInt(e.target.value, 10) / 100)}
          />
        </>
      )}
    </div>
  );
}

/* ===== MAIN COMPONENT ===== */
export default function SidebarEstilos({
  isLocked,
  selectedElement,
  selectedTagName,
  computedStyles,
  applyStyle,
  injectFont,
  getElementsWithId,
  selectElementById,
  onStyleChange,
  assignHoverClass,
  injectHoverStyles,
  getHoverRules,
  width,
  isResizing,
  onResizeStart,
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('estilos');
  const [customFonts, setCustomFonts] = useState([]);
  const [idElements, setIdElements] = useState([]);
  const fontInputRef = useRef(null);

  /* Alpha states per color property */
  const [alphaColor, setAlphaColor] = useState(1);
  const [alphaBg, setAlphaBg] = useState(1);
  const [alphaBorder, setAlphaBorder] = useState(1);

  /* ===== Gradient States ===== */
  const [bgGradientEnabled, setBgGradientEnabled] = useState(false);
  const [bgGradientColor1, setBgGradientColor1] = useState('#e59843');
  const [bgGradientColor2, setBgGradientColor2] = useState('#9333ea');
  const [bgGradientAngle, setBgGradientAngle] = useState(135);

  const [borderGradientEnabled, setBorderGradientEnabled] = useState(false);
  const [borderGradientColor1, setBorderGradientColor1] = useState('#e59843');
  const [borderGradientColor2, setBorderGradientColor2] = useState('#9333ea');
  const [borderGradientAngle, setBorderGradientAngle] = useState(135);

  /* Hover gradient states */
  const [hoverBgGradientEnabled, setHoverBgGradientEnabled] = useState(false);
  const [hoverBgGradientColor1, setHoverBgGradientColor1] = useState('#e59843');
  const [hoverBgGradientColor2, setHoverBgGradientColor2] = useState('#9333ea');
  const [hoverBgGradientAngle, setHoverBgGradientAngle] = useState(135);

  /* Hover event states */
  const [hoverBgColor, setHoverBgColor] = useState('#000000');
  const [hoverTextColor, setHoverTextColor] = useState('#ffffff');
  const [hoverBgEnabled, setHoverBgEnabled] = useState(false);
  const [hoverTextEnabled, setHoverTextEnabled] = useState(false);
  const [hoverScale, setHoverScale] = useState(1.0);
  const [hoverScaleEnabled, setHoverScaleEnabled] = useState(false);
  const [hoverShadowEnabled, setHoverShadowEnabled] = useState(false);
  const [hoverShadowX, setHoverShadowX] = useState(0);
  const [hoverShadowY, setHoverShadowY] = useState(8);
  const [hoverShadowBlur, setHoverShadowBlur] = useState(20);
  const [hoverShadowOpacity, setHoverShadowOpacity] = useState(35);

  /* Shadow pad drag ref */
  const shadowPadRef = useRef(null);
  const isDraggingShadowRef = useRef(false);

  const hasSelection = !!selectedElement;
  const disabled = isLocked || !hasSelection;
  const isImage = selectedTagName === 'IMG';
  const isTextElement = selectedTagName ? TEXT_TAGS.has(selectedTagName) : false;

  /* Sync alpha when selection changes */
  const [prevComputedStyles, setPrevComputedStyles] = useState(computedStyles);
  if (computedStyles !== prevComputedStyles) {
    setPrevComputedStyles(computedStyles);
    if (computedStyles) {
      setAlphaColor(extractAlpha(computedStyles._rawColor));
      setAlphaBg(extractAlpha(computedStyles._rawBg));
      setAlphaBorder(extractAlpha(computedStyles._rawBorderColor));
    }
  }

  /* Reset or restore hover states when selection changes */
  const [prevSelectedElement, setPrevSelectedElement] = useState(selectedElement);
  if (selectedElement !== prevSelectedElement) {
    setPrevSelectedElement(selectedElement);

    const existingCss = getHoverRules ? getHoverRules(selectedElement) : null;
    if (existingCss) {
      const hasBgGrad = existingCss.includes('linear-gradient');
      const hasBg = existingCss.includes('background-color') || hasBgGrad;
      const hasColor = /(?:^|;)\s*color:/.test(existingCss);
      const hasScale = existingCss.includes('scale(');
      const hasShadow = existingCss.includes('box-shadow:');

      setHoverBgEnabled(hasBg);
      setHoverBgGradientEnabled(hasBgGrad);
      if (hasBgGrad) {
        const gradMatch = existingCss.match(/linear-gradient\(\s*(\d+)deg\s*,\s*([^,]+),\s*([^)]+)\)/);
        if (gradMatch) {
          setHoverBgGradientAngle(parseInt(gradMatch[1], 10) || 135);
          setHoverBgGradientColor1(gradMatch[2].trim());
          setHoverBgGradientColor2(gradMatch[3].trim());
        }
      } else if (hasBg) {
        const bgMatch = existingCss.match(/background-color:\s*([^;!]+)/);
        if (bgMatch) setHoverBgColor(bgMatch[1].trim());
      }

      setHoverTextEnabled(hasColor);
      if (hasColor) {
        const colorMatch = existingCss.match(/(?:^|;)\s*color:\s*([^;!]+)/);
        if (colorMatch) setHoverTextColor(colorMatch[1].trim());
      }

      setHoverScaleEnabled(hasScale);
      if (hasScale) {
        const scaleMatch = existingCss.match(/scale\(([\d.]+)\)/);
        if (scaleMatch) setHoverScale(parseFloat(scaleMatch[1]) || 1.05);
      }

      setHoverShadowEnabled(hasShadow);
      if (hasShadow) {
        const shadowMatch = existingCss.match(/box-shadow:\s*(-?\d+)px\s+(-?\d+)px\s+(-?\d+)px\s+rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/);
        if (shadowMatch) {
          setHoverShadowX(parseInt(shadowMatch[1], 10) || 0);
          setHoverShadowY(parseInt(shadowMatch[2], 10) || 8);
          setHoverShadowBlur(parseInt(shadowMatch[3], 10) || 20);
          setHoverShadowOpacity(Math.round(parseFloat(shadowMatch[4]) * 100) || 35);
        }
      }
    } else {
      setHoverBgEnabled(false);
      setHoverTextEnabled(false);
      setHoverScaleEnabled(false);
      setHoverShadowEnabled(false);
      setHoverScale(1.05);
      setHoverShadowX(0);
      setHoverShadowY(8);
      setHoverShadowBlur(20);
      setHoverShadowOpacity(35);
      setHoverBgGradientEnabled(false);
    }

    // Reset gradient states for general tab
    setBgGradientEnabled(false);
    setBorderGradientEnabled(false);
  }

  /* Helper: ler valor com fallback */
  const val = useCallback(
    (key, fallback) => (computedStyles ? computedStyles[key] : fallback),
    [computedStyles]
  );

  /* Helper: aplicar estilo + notificar para auto-save */
  const apply = useCallback(
    (cssProp, value) => {
      if (applyStyle) applyStyle(cssProp, value);
      if (onStyleChange) onStyleChange();
    },
    [applyStyle, onStyleChange]
  );

  /* Carregar lista de IDs quando a aba Layout é ativada */
  const [prevLayoutTab, setPrevLayoutTab] = useState(activeTab);
  if (activeTab !== prevLayoutTab) {
    setPrevLayoutTab(activeTab);
    if (activeTab === 'layout' && getElementsWithId) {
      setIdElements(getElementsWithId());
    }
  }

  /* Handler: importar fonte local */
  const handleFontImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fontName = file.name.replace(/\.(ttf|otf|woff2?|)$/i, '').replace(/[^a-zA-Z0-9\s-]/g, '');
    const blobUrl = URL.createObjectURL(file);

    if (injectFont) {
      injectFont(fontName, blobUrl);
    }

    setCustomFonts((prev) => {
      if (prev.some((f) => f.label === fontName)) return prev;
      return [...prev, { label: fontName, value: `'${fontName}'` }];
    });

    apply('fontFamily', `'${fontName}'`);
    e.target.value = '';
  }, [injectFont, apply]);

  /* Detectar qual fonte está selecionada no dropdown */
  const currentFontValue = val('fontFamily', '');
  const matchedFont = [...SAFE_FONTS, ...customFonts].find((f) =>
    f.value && currentFontValue.toLowerCase().includes(f.value.split(',')[0].replace(/['"]/g, '').trim().toLowerCase())
  );
  const selectedFontValue = matchedFont ? matchedFont.value : '';

  /* Handlers de cor + alpha combinados */
  const handleTextColorChange = useCallback((hex) => {
    const value = hexAlphaToRgba(hex, alphaColor);
    apply('color', value);
  }, [apply, alphaColor]);

  const handleTextAlphaChange = useCallback((a) => {
    setAlphaColor(a);
    const hex = val('color', '#000000');
    apply('color', hexAlphaToRgba(hex, a));
  }, [apply, val]);

  const handleBgColorChange = useCallback((hex) => {
    const value = hexAlphaToRgba(hex, alphaBg);
    apply('backgroundColor', value);
  }, [apply, alphaBg]);

  const handleBgAlphaChange = useCallback((a) => {
    setAlphaBg(a);
    const hex = val('backgroundColor', '#ffffff');
    apply('backgroundColor', hexAlphaToRgba(hex, a));
  }, [apply, val]);

  const handleBorderColorChange = useCallback((hex) => {
    const value = hexAlphaToRgba(hex, alphaBorder);
    apply('borderColor', value);
  }, [apply, alphaBorder]);

  const handleBorderAlphaChange = useCallback((a) => {
    setAlphaBorder(a);
    const hex = val('borderColor', '#CBD5E1');
    apply('borderColor', hexAlphaToRgba(hex, a));
  }, [apply, val]);

  /* ===== Gradient Application Handlers ===== */
  const applyBgGradient = useCallback((c1, c2, angle) => {
    apply('backgroundImage', `linear-gradient(${angle}deg, ${c1}, ${c2})`);
    apply('backgroundColor', '');
  }, [apply]);

  const handleBgGradientToggle = useCallback((enabled) => {
    setBgGradientEnabled(enabled);
    if (enabled) {
      applyBgGradient(bgGradientColor1, bgGradientColor2, bgGradientAngle);
    } else {
      apply('backgroundImage', 'none');
      const hex = val('backgroundColor', '#ffffff');
      apply('backgroundColor', hex);
    }
  }, [apply, val, applyBgGradient, bgGradientColor1, bgGradientColor2, bgGradientAngle]);

  const handleBgGradientColor1Change = useCallback((c) => {
    setBgGradientColor1(c);
    applyBgGradient(c, bgGradientColor2, bgGradientAngle);
  }, [applyBgGradient, bgGradientColor2, bgGradientAngle]);

  const handleBgGradientColor2Change = useCallback((c) => {
    setBgGradientColor2(c);
    applyBgGradient(bgGradientColor1, c, bgGradientAngle);
  }, [applyBgGradient, bgGradientColor1, bgGradientAngle]);

  const handleBgGradientAngleChange = useCallback((a) => {
    setBgGradientAngle(a);
    applyBgGradient(bgGradientColor1, bgGradientColor2, a);
  }, [applyBgGradient, bgGradientColor1, bgGradientColor2]);

  const applyBorderGradient = useCallback((c1, c2, angle) => {
    apply('borderImage', `linear-gradient(${angle}deg, ${c1}, ${c2}) 1`);
    apply('borderColor', '');
  }, [apply]);

  const handleBorderGradientToggle = useCallback((enabled) => {
    setBorderGradientEnabled(enabled);
    if (enabled) {
      applyBorderGradient(borderGradientColor1, borderGradientColor2, borderGradientAngle);
    } else {
      apply('borderImage', 'none');
      const hex = val('borderColor', '#CBD5E1');
      apply('borderColor', hex);
    }
  }, [apply, val, applyBorderGradient, borderGradientColor1, borderGradientColor2, borderGradientAngle]);

  const handleBorderGradientColor1Change = useCallback((c) => {
    setBorderGradientColor1(c);
    applyBorderGradient(c, borderGradientColor2, borderGradientAngle);
  }, [applyBorderGradient, borderGradientColor2, borderGradientAngle]);

  const handleBorderGradientColor2Change = useCallback((c) => {
    setBorderGradientColor2(c);
    applyBorderGradient(borderGradientColor1, c, borderGradientAngle);
  }, [applyBorderGradient, borderGradientColor1, borderGradientAngle]);

  const handleBorderGradientAngleChange = useCallback((a) => {
    setBorderGradientAngle(a);
    applyBorderGradient(borderGradientColor1, borderGradientColor2, a);
  }, [applyBorderGradient, borderGradientColor1, borderGradientColor2]);

  /* ============================================================
     HOVER EVENTS — Build and inject :hover CSS
     ============================================================ */
  const buildAndInjectHoverCSS = useCallback(() => {
    if (!selectedElement || !assignHoverClass || !injectHoverStyles) return;

    const cls = assignHoverClass(selectedElement);
    if (!cls) return;

    const rules = [];
    if (hoverBgEnabled) {
      if (hoverBgGradientEnabled) {
        rules.push(`background-image: linear-gradient(${hoverBgGradientAngle}deg, ${hoverBgGradientColor1}, ${hoverBgGradientColor2}) !important`);
      } else {
        rules.push(`background-color: ${hoverBgColor} !important`);
      }
    }
    if (hoverTextEnabled) rules.push(`color: ${hoverTextColor} !important`);
    if (hoverScaleEnabled) rules.push(`transform: scale(${hoverScale}) !important`);
    if (hoverShadowEnabled) {
      const opacity = (hoverShadowOpacity / 100).toFixed(2);
      rules.push(`box-shadow: ${hoverShadowX}px ${hoverShadowY}px ${hoverShadowBlur}px rgba(0, 0, 0, ${opacity}) !important`);
    }

    if (rules.length > 0) {
      rules.push('transition: all 0.25s ease !important');
      injectHoverStyles(`.${cls}`, rules.join('; '));
    } else {
      injectHoverStyles(`.${cls}`, '');
    }

    if (onStyleChange) onStyleChange();
  }, [selectedElement, assignHoverClass, injectHoverStyles, hoverBgEnabled, hoverBgColor, hoverTextEnabled, hoverTextColor, hoverScaleEnabled, hoverScale, hoverShadowEnabled, hoverShadowX, hoverShadowY, hoverShadowBlur, hoverShadowOpacity, hoverBgGradientEnabled, hoverBgGradientColor1, hoverBgGradientColor2, hoverBgGradientAngle, onStyleChange]);

  useEffect(() => {
    if (activeTab === 'eventos' && hasSelection) {
      buildAndInjectHoverCSS();
    }
  }, [activeTab, hasSelection, buildAndInjectHoverCSS]);

  const tabsConfig = [
    { id: 'estilos', label: t('sidebar.tabStyles') },
    { id: 'layout', label: t('sidebar.tabLayout') },
    { id: 'eventos', label: t('sidebar.tabEvents') },
  ];

  return (
    <aside
      className={`editor-sidebar ${isLocked ? 'editor-sidebar--locked' : ''} ${isResizing ? 'editor-sidebar--resizing' : ''}`}
      style={width ? { width: `${width}px` } : undefined}
    >
      {/* Alça de redimensionamento na extremidade esquerda */}
      <div
        className={`sidebar-resize-handle ${isResizing ? 'is-active' : ''}`}
        onMouseDown={onResizeStart}
        title="Arrastar para redimensionar barra lateral"
      />

      {/* Locked overlay */}
      {isLocked && (
        <div className="editor-sidebar__locked-overlay">
          <span className="editor-sidebar__locked-text">
            {t('sidebar.waitingHtml')}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="sidebar-tabs">
        {tabsConfig.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'sidebar-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Badge de elemento */}
      {!isLocked && (
        <div className="foux-editor-element-badge">
          {hasSelection ? (
            <>
              <MousePointerClick size={13} className="foux-editor-element-badge__icon" />
              <span className="foux-editor-element-badge__tag">
                {formatTagName(selectedTagName)}
              </span>
              <span className="foux-editor-element-badge__hint">{t('sidebar.selected')}</span>
            </>
          ) : (
            <>
              <MousePointerClick size={13} className="foux-editor-element-badge__icon foux-editor-element-badge__icon--muted" />
              <span className="foux-editor-element-badge__hint">
                {t('sidebar.clickElementCanvas')}
              </span>
            </>
          )}
        </div>
      )}

      <div className="sidebar-content">
        {/* ═══════════════ ABA ESTILOS ═══════════════ */}
        {activeTab === 'estilos' && (
          <>
            {/* Estado vazio */}
            {!isLocked && !hasSelection && (
              <div className="foux-editor-empty-state">
                <div className="foux-editor-empty-state__icon-wrap">
                  <Paintbrush size={28} />
                </div>
                <span className="foux-editor-empty-state__title">
                  {t('sidebar.selectElementToEdit')}
                </span>
                <span className="foux-editor-empty-state__hint">
                  {t('sidebar.hoverDocumentHint')}
                </span>
              </div>
            )}

            {/* ── DIMENSÕES (só para <img>) ── */}
            {isImage && (
              <CollapsibleSection title={t('sidebar.dimensions')} icon={Image}>
                <SliderControl
                  label={t('sidebar.width')}
                  unit="px"
                  value={val('width', 200)}
                  min={20}
                  max={1200}
                  disabled={disabled}
                  onChange={(v) => apply('width', `${v}px`)}
                />
                <SliderControl
                  label={t('sidebar.height')}
                  unit="px"
                  value={val('height', 200)}
                  min={20}
                  max={1200}
                  disabled={disabled}
                  onChange={(v) => apply('height', `${v}px`)}
                />
                <div className="sidebar-control">
                  <span className="sidebar-control__label">{t('sidebar.alignment')}</span>
                  <div className="sidebar-align-group">
                    <button className="sidebar-align-btn" disabled={disabled} title={t('sidebar.floatLeft')}
                      onClick={() => { apply('display', 'inline'); apply('float', 'left'); apply('margin', '0 12px 12px 0'); }}>
                      <AlignLeft size={14} />
                    </button>
                    <button className="sidebar-align-btn" disabled={disabled} title={t('sidebar.center')}
                      onClick={() => { apply('display', 'block'); apply('float', 'none'); apply('margin', '0 auto'); }}>
                      <AlignCenter size={14} />
                    </button>
                    <button className="sidebar-align-btn" disabled={disabled} title={t('sidebar.floatRight')}
                      onClick={() => { apply('display', 'inline'); apply('float', 'right'); apply('margin', '0 0 12px 12px'); }}>
                      <AlignRight size={14} />
                    </button>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* ── TIPOGRAFIA (oculto para <img>) ── */}
            {!isImage && (
              <CollapsibleSection title={t('sidebar.typography')} icon={Type}>
                {/* Font Family */}
                {isTextElement && (
                  <div className="sidebar-control">
                    <span className="sidebar-control__label">{t('sidebar.fontFamily')}</span>
                    <select
                      className="sidebar-select"
                      value={selectedFontValue}
                      disabled={disabled}
                      onChange={(e) => {
                        if (e.target.value) {
                          apply('fontFamily', e.target.value);
                        }
                      }}
                    >
                      {SAFE_FONTS.map((f) => {
                        const fontLabel = f.key ? t(`sidebar.${f.key}`) : f.label;
                        return (
                          <option key={f.value || 'default'} value={f.value}>{fontLabel}</option>
                        );
                      })}
                      {customFonts.length > 0 && (
                        <optgroup label={t('sidebar.importedFonts')}>
                          {customFonts.map((f) => (
                            <option key={f.label} value={f.value}>{f.label}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button
                      className="sidebar-import-font-btn"
                      disabled={disabled}
                      onClick={() => fontInputRef.current?.click()}
                    >
                      <Upload size={12} />
                      <span>{t('sidebar.importLocalFont')}</span>
                    </button>
                    <input
                      ref={fontInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff,.woff2"
                      style={{ display: 'none' }}
                      onChange={handleFontImport}
                    />
                  </div>
                )}

                {/* Font Size — Bidirectional */}
                <SliderControl
                  label={t('sidebar.fontSize')}
                  unit="px"
                  value={val('fontSize', 16)}
                  min={8}
                  max={72}
                  disabled={disabled}
                  onChange={(v) => apply('fontSize', `${v}px`)}
                />

                {/* Alignment */}
                <div className="sidebar-control">
                  <span className="sidebar-control__label">{t('sidebar.textAlignment')}</span>
                  <div className="sidebar-align-group">
                    {[
                      { value: 'left', Icon: AlignLeft },
                      { value: 'center', Icon: AlignCenter },
                      { value: 'right', Icon: AlignRight },
                      { value: 'justify', Icon: AlignJustify },
                    ].map(({ value, Icon }) => (
                      <button
                        key={value}
                        className={`sidebar-align-btn ${val('textAlign', 'left') === value ? 'sidebar-align-btn--active' : ''}`}
                        disabled={disabled}
                        onClick={() => apply('textAlign', value)}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Color with Alpha */}
                <ColorControl
                  label={t('sidebar.textColor')}
                  hexValue={val('color', '#000000')}
                  alphaValue={alphaColor}
                  disabled={disabled}
                  onColorChange={handleTextColorChange}
                  onAlphaChange={handleTextAlphaChange}
                  opacityLabel={t('sidebar.opacity')}
                  t={t}
                />
              </CollapsibleSection>
            )}

            {/* ── BORDAS E FORMAS ── */}
            <CollapsibleSection title={t('sidebar.bordersAndShapes')} icon={Square}>
              <SliderControl
                label={t('sidebar.borderRadius')}
                unit="px"
                value={val('borderRadius', 0)}
                min={0}
                max={50}
                disabled={disabled}
                onChange={(v) => apply('borderRadius', `${v}px`)}
              />

              <SliderControl
                label={t('sidebar.borderWidth')}
                unit="px"
                value={val('borderWidth', 0)}
                min={0}
                max={20}
                disabled={disabled}
                onChange={(v) => {
                  apply('borderWidth', `${v}px`);
                  if (v > 0) apply('borderStyle', 'solid');
                }}
              />

              {/* Border Color with Alpha + Gradient */}
              <ColorControl
                label={t('sidebar.borderColor')}
                hexValue={val('borderColor', '#CBD5E1')}
                alphaValue={alphaBorder}
                disabled={disabled}
                onColorChange={handleBorderColorChange}
                onAlphaChange={handleBorderAlphaChange}
                opacityLabel={t('sidebar.opacity')}
                showGradient={true}
                gradientEnabled={borderGradientEnabled}
                onGradientToggle={handleBorderGradientToggle}
                gradientColor1={borderGradientColor1}
                gradientColor2={borderGradientColor2}
                gradientAngle={borderGradientAngle}
                onGradientColor1Change={handleBorderGradientColor1Change}
                onGradientColor2Change={handleBorderGradientColor2Change}
                onGradientAngleChange={handleBorderGradientAngleChange}
                t={t}
              />
            </CollapsibleSection>

            {/* ── ESPAÇAMENTO E FUNDO ── */}
            <CollapsibleSection title={t('sidebar.spacingAndBackground')} icon={Maximize}>
              <div className="sidebar-control sidebar-control--row">
                <div className="sidebar-control__half">
                  <span className="sidebar-control__label">{t('sidebar.padding')}</span>
                  <input
                    type="number"
                    className="sidebar-number-input"
                    value={val('padding', 0)}
                    min="0"
                    disabled={disabled}
                    onChange={(e) => apply('padding', `${e.target.value}px`)}
                  />
                </div>
                <div className="sidebar-control__half">
                  <span className="sidebar-control__label">{t('sidebar.margin')}</span>
                  <input
                    type="number"
                    className="sidebar-number-input"
                    value={val('margin', 0)}
                    min="0"
                    disabled={disabled}
                    onChange={(e) => apply('margin', `${e.target.value}px`)}
                  />
                </div>
              </div>

              {/* Background Color with Alpha + Gradient */}
              <ColorControl
                label={t('sidebar.backgroundColor')}
                hexValue={val('backgroundColor', '#ffffff')}
                alphaValue={alphaBg}
                disabled={disabled}
                onColorChange={handleBgColorChange}
                onAlphaChange={handleBgAlphaChange}
                opacityLabel={t('sidebar.opacity')}
                showGradient={true}
                gradientEnabled={bgGradientEnabled}
                onGradientToggle={handleBgGradientToggle}
                gradientColor1={bgGradientColor1}
                gradientColor2={bgGradientColor2}
                gradientAngle={bgGradientAngle}
                onGradientColor1Change={handleBgGradientColor1Change}
                onGradientColor2Change={handleBgGradientColor2Change}
                onGradientAngleChange={handleBgGradientAngleChange}
                t={t}
              />
            </CollapsibleSection>
          </>
        )}

        {/* ═══════════════ ABA LAYOUT ═══════════════ */}
        {activeTab === 'layout' && (
          <>
            <CollapsibleSection title={t('sidebar.elementsById')} icon={Layers} defaultOpen={true}>
              {idElements.length === 0 ? (
                <div className="foux-editor-empty-state foux-editor-empty-state--compact">
                  <Layers size={22} className="foux-editor-empty-state__icon-inline" />
                  <span className="foux-editor-empty-state__hint">
                    {t('sidebar.noElementsWithId')}
                  </span>
                </div>
              ) : (
                <div className="foux-layout-id-list">
                  {idElements.map((item) => (
                    <button
                      key={item.id}
                      className={`foux-layout-id-item ${
                        selectedElement?.id === item.id ? 'foux-layout-id-item--active' : ''
                      }`}
                      onClick={() => {
                        if (selectElementById) selectElementById(item.id);
                      }}
                    >
                      <span className="foux-layout-id-item__hash">#</span>
                      <span className="foux-layout-id-item__name">{item.id}</span>
                      <span className="foux-layout-id-item__tag">{`<${item.tagName.toLowerCase()}>`}</span>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {hasSelection && (
              <CollapsibleSection title={t('sidebar.colors')} icon={Palette} defaultOpen={true}>
                <ColorControl
                  label={t('sidebar.backgroundColor')}
                  hexValue={val('backgroundColor', '#ffffff')}
                  alphaValue={alphaBg}
                  disabled={false}
                  onColorChange={handleBgColorChange}
                  onAlphaChange={handleBgAlphaChange}
                  opacityLabel={t('sidebar.opacity')}
                  showGradient={true}
                  gradientEnabled={bgGradientEnabled}
                  onGradientToggle={handleBgGradientToggle}
                  gradientColor1={bgGradientColor1}
                  gradientColor2={bgGradientColor2}
                  gradientAngle={bgGradientAngle}
                  onGradientColor1Change={handleBgGradientColor1Change}
                  onGradientColor2Change={handleBgGradientColor2Change}
                  onGradientAngleChange={handleBgGradientAngleChange}
                  t={t}
                />
                <ColorControl
                  label={t('sidebar.textHighlightColor')}
                  hexValue={val('color', '#000000')}
                  alphaValue={alphaColor}
                  disabled={false}
                  onColorChange={handleTextColorChange}
                  onAlphaChange={handleTextAlphaChange}
                  opacityLabel={t('sidebar.opacity')}
                  t={t}
                />
              </CollapsibleSection>
            )}
          </>
        )}

        {/* ═══════════════ ABA EVENTOS ═══════════════ */}
        {activeTab === 'eventos' && (
          <>
            {!hasSelection ? (
              <div className="foux-editor-empty-state">
                <div className="foux-editor-empty-state__icon-wrap">
                  <Zap size={28} />
                </div>
                <span className="foux-editor-empty-state__title">
                  {t('sidebar.hoverSelectElement')}
                </span>
                <span className="foux-editor-empty-state__hint">
                  {t('sidebar.hoverClickCanvas')}
                </span>
              </div>
            ) : (
              <>
                <CollapsibleSection title={t('sidebar.eventsHover')} icon={Palette} defaultOpen={true}>
                  {/* Background Color on Hover */}
                  <div className="sidebar-control">
                    <label className="sidebar-toggle-row">
                      <input
                        type="checkbox"
                        className="sidebar-toggle-checkbox"
                        checked={hoverBgEnabled}
                        onChange={(e) => setHoverBgEnabled(e.target.checked)}
                      />
                      <span className="sidebar-control__label">{t('sidebar.hoverBgColor')}</span>
                    </label>
                    {hoverBgEnabled && (
                      <>
                        {/* Gradient toggle for hover bg */}
                        <label className="sidebar-gradient-toggle" style={{ marginBottom: 6, marginTop: 4 }}>
                          <input
                            type="checkbox"
                            checked={hoverBgGradientEnabled}
                            onChange={(e) => setHoverBgGradientEnabled(e.target.checked)}
                          />
                          <span className="sidebar-gradient-toggle__slider" />
                          <span className="sidebar-gradient-toggle__text">{t('sidebar.gradient')}</span>
                        </label>
                        {hoverBgGradientEnabled ? (
                          <div className="sidebar-gradient-controls">
                            <div className="sidebar-gradient-colors">
                              <div className="sidebar-gradient-color-field">
                                <span className="sidebar-gradient-color-field__label">{t('sidebar.gradientColorStart')}</span>
                                <div className="sidebar-color-input">
                                  <input type="color" className="sidebar-color-picker" value={hoverBgGradientColor1}
                                    onChange={(e) => setHoverBgGradientColor1(e.target.value)} />
                                  <input type="text" className="sidebar-color-text" value={hoverBgGradientColor1}
                                    onChange={(e) => setHoverBgGradientColor1(e.target.value)} />
                                </div>
                              </div>
                              <div className="sidebar-gradient-color-field">
                                <span className="sidebar-gradient-color-field__label">{t('sidebar.gradientColorEnd')}</span>
                                <div className="sidebar-color-input">
                                  <input type="color" className="sidebar-color-picker" value={hoverBgGradientColor2}
                                    onChange={(e) => setHoverBgGradientColor2(e.target.value)} />
                                  <input type="text" className="sidebar-color-text" value={hoverBgGradientColor2}
                                    onChange={(e) => setHoverBgGradientColor2(e.target.value)} />
                                </div>
                              </div>
                            </div>
                            <div className="sidebar-gradient-angle-section">
                              <div className="sidebar-control__label-row">
                                <span className="sidebar-control__label">{t('sidebar.gradientAngle')}</span>
                                <input type="number" className="sidebar-inline-number" value={hoverBgGradientAngle}
                                  min={0} max={360}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    if (Number.isFinite(v)) setHoverBgGradientAngle(((v % 360) + 360) % 360);
                                  }}
                                />
                                <span className="sidebar-control__unit">°</span>
                              </div>
                              <GradientAngleDisc angle={hoverBgGradientAngle} onAngleChange={setHoverBgGradientAngle} disabled={false} />
                            </div>
                            <div className="sidebar-gradient-preview" style={{
                              background: `linear-gradient(${hoverBgGradientAngle}deg, ${hoverBgGradientColor1}, ${hoverBgGradientColor2})`,
                            }} />
                          </div>
                        ) : (
                          <div className="sidebar-color-input">
                            <input type="color" className="sidebar-color-picker" value={hoverBgColor}
                              onChange={(e) => setHoverBgColor(e.target.value)} />
                            <input type="text" className="sidebar-color-text" value={hoverBgColor}
                              onChange={(e) => setHoverBgColor(e.target.value)} />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Text Color on Hover */}
                  <div className="sidebar-control">
                    <label className="sidebar-toggle-row">
                      <input
                        type="checkbox"
                        className="sidebar-toggle-checkbox"
                        checked={hoverTextEnabled}
                        onChange={(e) => setHoverTextEnabled(e.target.checked)}
                      />
                      <span className="sidebar-control__label">{t('sidebar.hoverTextColor')}</span>
                    </label>
                    {hoverTextEnabled && (
                      <div className="sidebar-color-input">
                        <input
                          type="color"
                          className="sidebar-color-picker"
                          value={hoverTextColor}
                          onChange={(e) => setHoverTextColor(e.target.value)}
                        />
                        <input
                          type="text"
                          className="sidebar-color-text"
                          value={hoverTextColor}
                          onChange={(e) => setHoverTextColor(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={t('sidebar.hoverScaleSection')} icon={Maximize} defaultOpen={true}>
                  <div className="sidebar-control">
                    <label className="sidebar-toggle-row">
                      <input
                        type="checkbox"
                        className="sidebar-toggle-checkbox"
                        checked={hoverScaleEnabled}
                        onChange={(e) => setHoverScaleEnabled(e.target.checked)}
                      />
                      <span className="sidebar-control__label">{t('sidebar.hoverScaleToggle')}</span>
                    </label>
                    {hoverScaleEnabled && (
                      <SliderControl
                        label={t('sidebar.scale')}
                        unit=""
                        value={hoverScale}
                        min={0.8}
                        max={1.3}
                        step={0.01}
                        disabled={false}
                        onChange={(v) => setHoverScale(v)}
                      />
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={t('sidebar.hoverShadowSection')} icon={Square} defaultOpen={true}>
                  <div className="sidebar-control">
                    <label className="sidebar-toggle-row">
                      <input
                        type="checkbox"
                        className="sidebar-toggle-checkbox"
                        checked={hoverShadowEnabled}
                        onChange={(e) => setHoverShadowEnabled(e.target.checked)}
                      />
                      <span className="sidebar-control__label">{t('sidebar.hoverShadowToggle')}</span>
                    </label>
                    {hoverShadowEnabled && (
                      <>
                        {/* ── Shadow Direction Pad (2D Joystick) ── */}
                        <div className="shadow-pad-wrapper">
                          <div className="shadow-pad-label">{t('sidebar.shadowDirection')}</div>
                          <div
                            className="shadow-pad"
                            ref={shadowPadRef}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              isDraggingShadowRef.current = true;
                              const rect = shadowPadRef.current.getBoundingClientRect();
                              const PAD_RADIUS = rect.width / 2;
                              const MAX_OFFSET = 30;
                              const cx = rect.left + PAD_RADIUS;
                              const cy = rect.top + PAD_RADIUS;

                              const updateFromMouse = (clientX, clientY) => {
                                let dx = clientX - cx;
                                let dy = clientY - cy;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist > PAD_RADIUS) {
                                  dx = (dx / dist) * PAD_RADIUS;
                                  dy = (dy / dist) * PAD_RADIUS;
                                }
                                const newX = Math.round((dx / PAD_RADIUS) * MAX_OFFSET);
                                const newY = Math.round((dy / PAD_RADIUS) * MAX_OFFSET);
                                setHoverShadowX(newX);
                                setHoverShadowY(newY);
                              };

                              updateFromMouse(e.clientX, e.clientY);

                              const onMove = (ev) => {
                                if (!isDraggingShadowRef.current) return;
                                updateFromMouse(ev.clientX, ev.clientY);
                              };
                              const onUp = () => {
                                isDraggingShadowRef.current = false;
                                document.removeEventListener('mousemove', onMove);
                                document.removeEventListener('mouseup', onUp);
                              };
                              document.addEventListener('mousemove', onMove);
                              document.addEventListener('mouseup', onUp);
                            }}
                          >
                            {/* Crosshair lines */}
                            <div className="shadow-pad__crosshair-h" />
                            <div className="shadow-pad__crosshair-v" />
                            {/* Draggable handle */}
                            <div
                              className="shadow-pad__handle"
                              style={{
                                left: `calc(50% + ${(hoverShadowX / 30) * 50}%)`,
                                top: `calc(50% + ${(hoverShadowY / 30) * 50}%)`,
                              }}
                            />
                          </div>
                        </div>

                        {/* ── X / Y Numeric Inputs (bidirectional) ── */}
                        <div className="shadow-offset-row">
                          <div className="shadow-offset-field">
                            <span className="shadow-offset-field__label">X</span>
                            <input
                              type="number"
                              className="sidebar-inline-number"
                              value={hoverShadowX}
                              min={-30}
                              max={30}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (Number.isFinite(v)) setHoverShadowX(Math.max(-30, Math.min(30, v)));
                              }}
                            />
                            <span className="sidebar-control__unit">px</span>
                          </div>
                          <div className="shadow-offset-field">
                            <span className="shadow-offset-field__label">Y</span>
                            <input
                              type="number"
                              className="sidebar-inline-number"
                              value={hoverShadowY}
                              min={-30}
                              max={30}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (Number.isFinite(v)) setHoverShadowY(Math.max(-30, Math.min(30, v)));
                              }}
                            />
                            <span className="sidebar-control__unit">px</span>
                          </div>
                        </div>

                        {/* ── Blur ── */}
                        <SliderControl
                          label={t('sidebar.shadowBlur')}
                          unit="px"
                          value={hoverShadowBlur}
                          min={0}
                          max={60}
                          disabled={false}
                          onChange={(v) => setHoverShadowBlur(v)}
                        />

                        {/* ── Opacity ── */}
                        <SliderControl
                          label={t('sidebar.shadowOpacity')}
                          unit="%"
                          value={hoverShadowOpacity}
                          min={5}
                          max={100}
                          disabled={false}
                          onChange={(v) => setHoverShadowOpacity(v)}
                        />

                        {/* ── Live preview string ── */}
                        <div className="shadow-preview-string">
                          <code>{`${hoverShadowX}px ${hoverShadowY}px ${hoverShadowBlur}px rgba(0,0,0,${(hoverShadowOpacity/100).toFixed(2)})`}</code>
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleSection>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
