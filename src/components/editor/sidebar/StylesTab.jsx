import { memo, useMemo, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Square, Maximize, Paintbrush, Image, Upload } from 'lucide-react';
import BoxModelEditor from '../controls/BoxModelEditor';
import CollapsibleSection from '../controls/CollapsibleSection';
import ColorControl from '../controls/ColorControl';
import PropertyLabel from '../controls/PropertyLabel';
import SliderControl from '../controls/SliderControl';
import { cssInfo } from '../../../utils/css/glossary.js';
import { changeMeta } from '../../../utils/historyLabels.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Mídia ganha dimensões e disposição no lugar da tipografia.
const MEDIA_TAGS = new Set(['IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME', 'EMBED', 'OBJECT']);
// Lista do que NÃO tem texto: HTML do aluno usa pre, code, ul, tabelas e tags próprias.
const NO_TEXT_TAGS = new Set(['HR', 'BR', 'WBR', 'PICTURE', 'SOURCE', 'TRACK', 'MAP', 'AREA']);
const SVG_TEXT = new Set(['text', 'tspan', 'textPath']);

const isMediaElement = (element) => MEDIA_TAGS.has(element?.tagName)
  || (element?.namespaceURI === SVG_NS && element.localName === 'svg');
const holdsText = (element) => !!element && !NO_TEXT_TAGS.has(element.tagName)
  && (element.namespaceURI !== SVG_NS || SVG_TEXT.has(element.localName));

// Pilhas seguras funcionam offline no Electron; o aluno pode importar outras.
const SAFE_FONTS = [
  { key: 'defaultBrowserFont', value: '' },
  { label: 'Arial (Sans-serif)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Courier New (Monospace)', value: '"Courier New", Courier, monospace' },
];

const TEXT_ALIGNMENTS = [
  { value: 'left', Icon: AlignLeft },
  { value: 'center', Icon: AlignCenter },
  { value: 'right', Icon: AlignRight },
  { value: 'justify', Icon: AlignJustify },
];

// `summary` é o CSS mostrado na dica de desfazer/refazer para o preset inteiro.
const IMAGE_LAYOUTS = [
  { labelKey: 'sidebar.floatLeft', Icon: AlignLeft, summary: 'float: left', styles: { display: 'inline', float: 'left', margin: '0 12px 12px 0' } },
  { labelKey: 'sidebar.center', Icon: AlignCenter, summary: 'margin: 0 auto', styles: { display: 'block', float: 'none', margin: '0 auto' } },
  { labelKey: 'sidebar.floatRight', Icon: AlignRight, summary: 'float: right', styles: { display: 'inline', float: 'right', margin: '0 0 12px 12px' } },
];

const firstFamily = (value) => value.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();

function StylesTab({ element, resetKey, values, disabled, apply, colors, onBoxFocus, injectFont, getImportedFonts, tourStep, t }) {
  const fontInputRef = useRef(null);
  const isImage = isMediaElement(element);
  const isTextElement = holdsText(element);
  const value = (key, fallback) => values?.[key] ?? fallback;

  const css = useMemo(() => Object.fromEntries(
    ['width', 'height', 'float', 'fontFamily', 'fontSize', 'textAlign', 'color', 'borderRadius', 'borderWidth', 'borderColor', 'backgroundColor']
      .map((key) => [key, cssInfo(t, key)]),
  ), [t]);

  const onPx = useMemo(() => Object.fromEntries(
    ['width', 'height', 'fontSize', 'borderRadius', 'borderWidth']
      .map((property) => [property, (number) => apply(property, `${number}px`)]),
  ), [apply]);

  // Lido do documento (não da memória) para listar fontes importadas em outra
  // sessão; recarregar o iframe sempre limpa a seleção.
  const [importedFonts, setImportedFonts] = useState(getImportedFonts);
  const [fontsElement, setFontsElement] = useState(element);
  if (fontsElement !== element) {
    setFontsElement(element);
    setImportedFonts(getImportedFonts());
  }
  const currentFamily = value('fontFamily', '').toLowerCase();
  const selectedFont = [...SAFE_FONTS, ...importedFonts].find((font) => font.value && currentFamily.includes(firstFamily(font.value)))?.value ?? '';

  const handleFontImport = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const fontName = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim() || `Fonte ${Date.now()}`;
    const reader = new FileReader();
    reader.onload = () => {
      // Data URL mantém a fonte ao reabrir o projeto e dentro do CSS exportado.
      injectFont(fontName, reader.result);
      setImportedFonts(getImportedFonts());
      apply('fontFamily', `'${fontName}'`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {isImage && (
        <CollapsibleSection sectionId="dimensions" title={t('sidebar.dimensions')} icon={Image}>
          <SliderControl label={t('sidebar.width')} {...css.width} unit="px" value={value('width', 200)} min={20} max={1200} disabled={disabled} resetKey={resetKey} onChange={onPx.width} />
          <SliderControl label={t('sidebar.height')} {...css.height} unit="px" value={value('height', 200)} min={20} max={1200} disabled={disabled} resetKey={resetKey} onChange={onPx.height} />
          <div className="sidebar-control">
            <PropertyLabel label={t('sidebar.alignment')} {...css.float} />
            <div className="sidebar-align-group">
              {IMAGE_LAYOUTS.map(({ labelKey, Icon, summary, styles }) => (
                <button
                  key={labelKey}
                  className="sidebar-align-btn"
                  aria-label={t(labelKey)}
                  disabled={disabled}
                  onClick={() => {
                    const meta = changeMeta('history.props.imageLayout', element, undefined, summary);
                    Object.entries(styles).forEach(([property, cssValue]) => apply(property, cssValue, meta));
                  }}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {!isImage && (
        <CollapsibleSection sectionId="typography" title={t('sidebar.typography')} icon={Type} tourId="typography" tourStep={tourStep}>
          {isTextElement && (
            <div className="sidebar-control">
              <PropertyLabel label={t('sidebar.fontFamily')} {...css.fontFamily} />
              <select
                className="sidebar-select"
                aria-label={t('sidebar.fontFamily')}
                value={selectedFont}
                disabled={disabled}
                onChange={(event) => apply('fontFamily', event.target.value)}
              >
                {SAFE_FONTS.map((font) => (
                  <option key={font.value || 'default'} value={font.value}>{font.key ? t(`sidebar.${font.key}`) : font.label}</option>
                ))}
                {importedFonts.length > 0 && (
                  <optgroup label={t('sidebar.importedFonts')}>
                    {importedFonts.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}
                  </optgroup>
                )}
              </select>
              <button className="sidebar-import-font-btn" disabled={disabled} onClick={() => fontInputRef.current?.click()}>
                <Upload size={12} />
                <span>{t('sidebar.importLocalFont')}</span>
              </button>
              <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{ display: 'none' }} onChange={handleFontImport} />
            </div>
          )}

          <SliderControl label={t('sidebar.fontSize')} {...css.fontSize} unit="px" value={value('fontSize', 16)} min={8} max={72} disabled={disabled} resetKey={resetKey} onChange={onPx.fontSize} />

          <div className="sidebar-control">
            <PropertyLabel label={t('sidebar.textAlignment')} {...css.textAlign} />
            <div className="sidebar-align-group">
              {TEXT_ALIGNMENTS.map(({ value: alignment, Icon }) => {
                const active = value('textAlign', 'left') === alignment;
                return (
                  <button
                    key={alignment}
                    aria-label={t(`tooltips.align.${alignment}`)}
                    aria-pressed={active}
                    className={`sidebar-align-btn ${active ? 'sidebar-align-btn--active' : ''}`}
                    disabled={disabled}
                    onClick={() => apply('textAlign', alignment)}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
          </div>

          <ColorControl label={t('sidebar.textColor')} {...css.color} disabled={disabled} {...colors.text} />
        </CollapsibleSection>
      )}

      <CollapsibleSection sectionId="borders" title={t('sidebar.bordersAndShapes')} icon={Square} tourId="borders" tourStep={tourStep}>
        <SliderControl label={t('sidebar.borderRadius')} {...css.borderRadius} unit="px" value={value('borderRadius', 0)} min={0} max={50} disabled={disabled} resetKey={resetKey} onChange={onPx.borderRadius} />
        <SliderControl label={t('sidebar.borderWidth')} {...css.borderWidth} unit="px" value={value('borderWidth', 0)} min={0} max={20} disabled={disabled} resetKey={resetKey} onChange={onPx.borderWidth} />
        <ColorControl label={t('sidebar.borderColor')} {...css.borderColor} disabled={disabled} {...colors.border} />
      </CollapsibleSection>

      <CollapsibleSection sectionId="spacing" title={t('sidebar.spacing')} icon={Maximize} tourId="spacing" tourStep={tourStep}>
        <BoxModelEditor element={element} values={values} disabled={disabled} apply={apply} onBoxFocus={onBoxFocus} resetKey={resetKey} t={t} />
      </CollapsibleSection>

      <CollapsibleSection sectionId="background" title={t('sidebar.background')} icon={Paintbrush} tourId="background" tourStep={tourStep}>
        <ColorControl label={t('sidebar.backgroundColor')} {...css.backgroundColor} disabled={disabled} {...colors.background} />
      </CollapsibleSection>
    </>
  );
}

export default memo(StylesTab);
