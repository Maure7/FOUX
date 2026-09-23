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

/* ===================================================================
   SidebarEstilos — Painel lateral reativo de estilização visual.
   Adapta controles conforme a tag do elemento selecionado.
   Inclui slider de opacidade (alpha) nos color pickers.
   Inclui sliders bidirecionais com input numérico.
   Inclui aba Eventos com controles de :hover.
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
  { label: 'Padrão do navegador', value: '' },
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
    <div className="sidebar-section">
      <button
        className="sidebar-section__header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="sidebar-section__header-left">
          {Icon && <Icon size={14} className="sidebar-section__icon" />}
          <span className="sidebar-section__title">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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

/* ===== COLOR CONTROL WITH ALPHA SLIDER ===== */
function ColorControl({ label, hexValue, alphaValue, disabled, onColorChange, onAlphaChange }) {
  const displayAlpha = Math.round((alphaValue ?? 1) * 100);

  return (
    <div className="sidebar-control">
      <span className="sidebar-control__label">{label}</span>
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
        <span className="sidebar-opacity-row__label">Opacidade:</span>
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
  /* Hover events — from useIframeInspector */
  assignHoverClass,
  getHoverClass,
  injectHoverStyles,
  iframeRef,
}) {
  const [activeTab, setActiveTab] = useState('estilos');
  const [customFonts, setCustomFonts] = useState([]);
  const [idElements, setIdElements] = useState([]);
  const fontInputRef = useRef(null);

  /* Alpha states per color property */
  const [alphaColor, setAlphaColor] = useState(1);
  const [alphaBg, setAlphaBg] = useState(1);
  const [alphaBorder, setAlphaBorder] = useState(1);

  /* Hover event states */
  const [hoverBgColor, setHoverBgColor] = useState('#000000');
  const [hoverTextColor, setHoverTextColor] = useState('#ffffff');
  const [hoverBgEnabled, setHoverBgEnabled] = useState(false);
  const [hoverTextEnabled, setHoverTextEnabled] = useState(false);
  const [hoverScale, setHoverScale] = useState(1.0);
  const [hoverScaleEnabled, setHoverScaleEnabled] = useState(false);
  const [hoverShadowEnabled, setHoverShadowEnabled] = useState(false);
  const [hoverShadowIntensity, setHoverShadowIntensity] = useState(50);

  const hasSelection = !!selectedElement;
  const disabled = isLocked || !hasSelection;
  const isImage = selectedTagName === 'IMG';
  const isTextElement = selectedTagName ? TEXT_TAGS.has(selectedTagName) : false;

  /* Sync alpha when selection changes */
  useEffect(() => {
    if (computedStyles) {
      setAlphaColor(extractAlpha(computedStyles._rawColor));
      setAlphaBg(extractAlpha(computedStyles._rawBg));
      setAlphaBorder(extractAlpha(computedStyles._rawBorderColor));
    }
  }, [computedStyles]);

  /* Reset hover states when selection changes */
  useEffect(() => {
    setHoverBgEnabled(false);
    setHoverTextEnabled(false);
    setHoverScaleEnabled(false);
    setHoverShadowEnabled(false);
    setHoverScale(1.0);
    setHoverShadowIntensity(50);
  }, [selectedElement]);

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
  useEffect(() => {
    if (activeTab === 'layout' && getElementsWithId) {
      setIdElements(getElementsWithId());
    }
  }, [activeTab, getElementsWithId]);

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

  /* ============================================================
     HOVER EVENTS — Build and inject :hover CSS
     ============================================================ */
  const buildAndInjectHoverCSS = useCallback(() => {
    if (!selectedElement || !assignHoverClass || !injectHoverStyles) return;

    const cls = assignHoverClass(selectedElement);
    if (!cls) return;

    const rules = [];
    if (hoverBgEnabled) rules.push(`background-color: ${hoverBgColor} !important`);
    if (hoverTextEnabled) rules.push(`color: ${hoverTextColor} !important`);
    if (hoverScaleEnabled) rules.push(`transform: scale(${hoverScale}) !important`);
    if (hoverShadowEnabled) {
      const opacity = (hoverShadowIntensity / 100).toFixed(2);
      rules.push(`box-shadow: 0 8px 20px rgba(0, 0, 0, ${opacity}) !important`);
    }

    // Always add transition for smooth hover
    rules.push('transition: all 0.25s ease !important');

    if (rules.length > 1) {
      injectHoverStyles(`.${cls}`, rules.join('; '));
    }

    if (onStyleChange) onStyleChange();
  }, [selectedElement, assignHoverClass, injectHoverStyles, hoverBgEnabled, hoverBgColor, hoverTextEnabled, hoverTextColor, hoverScaleEnabled, hoverScale, hoverShadowEnabled, hoverShadowIntensity, onStyleChange]);

  // Auto-inject hover CSS whenever hover states change
  useEffect(() => {
    if (activeTab === 'eventos' && hasSelection) {
      buildAndInjectHoverCSS();
    }
  }, [activeTab, hasSelection, buildAndInjectHoverCSS]);

  return (
    <aside className={`editor-sidebar ${isLocked ? 'editor-sidebar--locked' : ''}`}>
      {/* Locked overlay */}
      {isLocked && (
        <div className="editor-sidebar__locked-overlay">
          <span className="editor-sidebar__locked-text">
            Esperando o carregamento do HTML
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="sidebar-tabs">
        {['Estilos', 'Layout', 'Eventos'].map((tab) => (
          <button
            key={tab}
            className={`sidebar-tab ${activeTab === tab.toLowerCase() ? 'sidebar-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.toLowerCase())}
          >
            {tab}
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
              <span className="foux-editor-element-badge__hint">selecionado</span>
            </>
          ) : (
            <>
              <MousePointerClick size={13} className="foux-editor-element-badge__icon foux-editor-element-badge__icon--muted" />
              <span className="foux-editor-element-badge__hint">
                Clique em um elemento no canvas
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
                  Selecione um elemento no canvas para editar seus estilos
                </span>
                <span className="foux-editor-empty-state__hint">
                  Passe o mouse sobre o documento e clique em qualquer elemento
                </span>
              </div>
            )}

            {/* ── DIMENSÕES (só para <img>) ── */}
            {isImage && (
              <CollapsibleSection title="DIMENSÕES" icon={Image}>
                <SliderControl
                  label="Largura"
                  unit="px"
                  value={val('width', 200)}
                  min={20}
                  max={1200}
                  disabled={disabled}
                  onChange={(v) => apply('width', `${v}px`)}
                />
                <SliderControl
                  label="Altura"
                  unit="px"
                  value={val('height', 200)}
                  min={20}
                  max={1200}
                  disabled={disabled}
                  onChange={(v) => apply('height', `${v}px`)}
                />
                <div className="sidebar-control">
                  <span className="sidebar-control__label">Disposição</span>
                  <div className="sidebar-align-group">
                    <button className="sidebar-align-btn" disabled={disabled} title="Float à esquerda"
                      onClick={() => { apply('display', 'inline'); apply('float', 'left'); apply('margin', '0 12px 12px 0'); }}>
                      <AlignLeft size={14} />
                    </button>
                    <button className="sidebar-align-btn" disabled={disabled} title="Centralizar"
                      onClick={() => { apply('display', 'block'); apply('float', 'none'); apply('margin', '0 auto'); }}>
                      <AlignCenter size={14} />
                    </button>
                    <button className="sidebar-align-btn" disabled={disabled} title="Float à direita"
                      onClick={() => { apply('display', 'inline'); apply('float', 'right'); apply('margin', '0 0 12px 12px'); }}>
                      <AlignRight size={14} />
                    </button>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* ── TIPOGRAFIA (oculto para <img>) ── */}
            {!isImage && (
              <CollapsibleSection title="TIPOGRAFIA" icon={Type}>
                {/* Font Family */}
                {isTextElement && (
                  <div className="sidebar-control">
                    <span className="sidebar-control__label">Família da Fonte</span>
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
                      {SAFE_FONTS.map((f) => (
                        <option key={f.label} value={f.value}>{f.label}</option>
                      ))}
                      {customFonts.length > 0 && (
                        <optgroup label="Fontes importadas">
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
                      <span>Importar fonte local</span>
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
                  label="Tamanho da Fonte"
                  unit="px"
                  value={val('fontSize', 16)}
                  min={8}
                  max={72}
                  disabled={disabled}
                  onChange={(v) => apply('fontSize', `${v}px`)}
                />

                {/* Alignment */}
                <div className="sidebar-control">
                  <span className="sidebar-control__label">Alinhamento</span>
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
                  label="Cor do Texto"
                  hexValue={val('color', '#000000')}
                  alphaValue={alphaColor}
                  disabled={disabled}
                  onColorChange={handleTextColorChange}
                  onAlphaChange={handleTextAlphaChange}
                />
              </CollapsibleSection>
            )}

            {/* ── BORDAS E FORMAS ── */}
            <CollapsibleSection title="BORDAS E FORMAS" icon={Square}>
              <SliderControl
                label="Arredondamento (Radius)"
                unit="px"
                value={val('borderRadius', 0)}
                min={0}
                max={50}
                disabled={disabled}
                onChange={(v) => apply('borderRadius', `${v}px`)}
              />

              <SliderControl
                label="Espessura da Borda"
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

              {/* Border Color with Alpha */}
              <ColorControl
                label="Cor da Borda"
                hexValue={val('borderColor', '#CBD5E1')}
                alphaValue={alphaBorder}
                disabled={disabled}
                onColorChange={handleBorderColorChange}
                onAlphaChange={handleBorderAlphaChange}
              />
            </CollapsibleSection>

            {/* ── ESPAÇAMENTO E FUNDO ── */}
            <CollapsibleSection title="ESPAÇAMENTO E FUNDO" icon={Maximize}>
              <div className="sidebar-control sidebar-control--row">
                <div className="sidebar-control__half">
                  <span className="sidebar-control__label">Padding (px)</span>
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
                  <span className="sidebar-control__label">Margin (px)</span>
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

              {/* Background Color with Alpha */}
              <ColorControl
                label="Cor de Fundo"
                hexValue={val('backgroundColor', '#ffffff')}
                alphaValue={alphaBg}
                disabled={disabled}
                onColorChange={handleBgColorChange}
                onAlphaChange={handleBgAlphaChange}
              />
            </CollapsibleSection>
          </>
        )}

        {/* ═══════════════ ABA LAYOUT ═══════════════ */}
        {activeTab === 'layout' && (
          <>
            <CollapsibleSection title="ELEMENTOS POR ID" icon={Layers} defaultOpen={true}>
              {idElements.length === 0 ? (
                <div className="foux-editor-empty-state foux-editor-empty-state--compact">
                  <Layers size={22} className="foux-editor-empty-state__icon-inline" />
                  <span className="foux-editor-empty-state__hint">
                    Nenhum elemento com ID encontrado no documento
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
              <CollapsibleSection title="CORES" icon={Palette} defaultOpen={true}>
                <ColorControl
                  label="Cor de Fundo"
                  hexValue={val('backgroundColor', '#ffffff')}
                  alphaValue={alphaBg}
                  disabled={false}
                  onColorChange={handleBgColorChange}
                  onAlphaChange={handleBgAlphaChange}
                />
                <ColorControl
                  label="Cor do Texto / Destaque"
                  hexValue={val('color', '#000000')}
                  alphaValue={alphaColor}
                  disabled={false}
                  onColorChange={handleTextColorChange}
                  onAlphaChange={handleTextAlphaChange}
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
                  Selecione um elemento para configurar eventos hover
                </span>
                <span className="foux-editor-empty-state__hint">
                  Clique em um elemento no canvas para começar
                </span>
              </div>
            ) : (
              <>
                <CollapsibleSection title="HOVER — MUDAR COR" icon={Palette} defaultOpen={true}>
                  {/* Background Color on Hover */}
                  <div className="sidebar-control">
                    <label className="sidebar-toggle-row">
                      <input
                        type="checkbox"
                        className="sidebar-toggle-checkbox"
                        checked={hoverBgEnabled}
                        onChange={(e) => setHoverBgEnabled(e.target.checked)}
                      />
                      <span className="sidebar-control__label">Cor de Fundo no Hover</span>
                    </label>
                    {hoverBgEnabled && (
                      <div className="sidebar-color-input">
                        <input
                          type="color"
                          className="sidebar-color-picker"
                          value={hoverBgColor}
                          onChange={(e) => setHoverBgColor(e.target.value)}
                        />
                        <input
                          type="text"
                          className="sidebar-color-text"
                          value={hoverBgColor}
                          onChange={(e) => setHoverBgColor(e.target.value)}
                        />
                      </div>
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
                      <span className="sidebar-control__label">Cor do Texto no Hover</span>
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

                <CollapsibleSection title="HOVER — ESCALA" icon={Maximize} defaultOpen={true}>
                  <div className="sidebar-control">
                    <label className="sidebar-toggle-row">
                      <input
                        type="checkbox"
                        className="sidebar-toggle-checkbox"
                        checked={hoverScaleEnabled}
                        onChange={(e) => setHoverScaleEnabled(e.target.checked)}
                      />
                      <span className="sidebar-control__label">Ativar Escala no Hover</span>
                    </label>
                    {hoverScaleEnabled && (
                      <SliderControl
                        label="Escala"
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

                <CollapsibleSection title="HOVER — SOMBRA" icon={Square} defaultOpen={true}>
                  <div className="sidebar-control">
                    <label className="sidebar-toggle-row">
                      <input
                        type="checkbox"
                        className="sidebar-toggle-checkbox"
                        checked={hoverShadowEnabled}
                        onChange={(e) => setHoverShadowEnabled(e.target.checked)}
                      />
                      <span className="sidebar-control__label">Sombra Externa no Hover</span>
                    </label>
                    {hoverShadowEnabled && (
                      <SliderControl
                        label="Intensidade"
                        unit="%"
                        value={hoverShadowIntensity}
                        min={10}
                        max={100}
                        disabled={false}
                        onChange={(v) => setHoverShadowIntensity(v)}
                      />
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
