import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { MousePointerClick, Paintbrush, RotateCcw, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import StylesTab from './sidebar/StylesTab';
import LayoutTab from './sidebar/LayoutTab';
import HoverTab from './sidebar/HoverTab';
import useColorControls from './sidebar/useColorControls';
import useSidebarSections, { SidebarSectionsContext } from '../../hooks/useSidebarSections';
import { changeMeta, currentCssValue } from '../../utils/historyLabels.js';

const TABS = [
  { id: 'estilos', labelKey: 'sidebar.tabStyles', tourId: 'styles' },
  { id: 'layout', labelKey: 'sidebar.tabLayout' },
  { id: 'eventos', labelKey: 'sidebar.tabEvents' },
];

// Identifica o elemento selecionado e cada "Restaurar elemento": a HoverTab é recriada a
// partir das regras dele e os controles numéricos descartam os rascunhos.
const elementKeys = new WeakMap();
let nextElementKey = 0;
function keyFor(element) {
  if (!elementKeys.has(element)) elementKeys.set(element, ++nextElementKey);
  return elementKeys.get(element);
}

function EmptyState({ Icon, title, hint }) {
  return (
    <div className="foux-editor-empty-state">
      <div className="foux-editor-empty-state__icon-wrap"><Icon size={28} /></div>
      <span className="foux-editor-empty-state__title">{title}</span>
      <span className="foux-editor-empty-state__hint">{hint}</span>
    </div>
  );
}

function SidebarEstilos({
  isLocked,
  selectedElement,
  computedStyles,
  applyStyle,
  injectFont,
  getImportedFonts,
  getElementsWithId,
  selectElementById,
  onStyleChange,
  assignHoverClass,
  injectHoverStyles,
  getHoverRules,
  width,
  isResizing,
  onResizeStart,
  tourStep,
  revision,
  documentKey,
  onRestoreElement,
  onBoxFocus,
  projectId,
}) {
  const { t } = useLanguage();
  const [userTab, setActiveTab] = useState('estilos');
  const activeTab = tourStep?.tab || userTab;
  const hasSelection = !!selectedElement;
  const elementKey = hasSelection ? `${keyFor(selectedElement)}-${revision}` : null;

  const stylesRef = useRef(computedStyles);
  useEffect(() => { stylesRef.current = computedStyles; }, [computedStyles]);

  // O histórico é avisado antes: trocar de propriedade fecha o passo de desfazer
  // anterior antes de esta edição chegar ao documento.
  const apply = useCallback((cssProperty, value, meta) => {
    onStyleChange(meta ?? changeMeta(`history.props.${cssProperty}`, selectedElement, currentCssValue(cssProperty, stylesRef.current), value));
    applyStyle(cssProperty, value);
  }, [applyStyle, onStyleChange, selectedElement]);
  const colors = useColorControls({ selectedElement, computedStyles, revision, apply, applyStyle, onStyleChange });
  // Acordeões abertos/fechados, salvos por projeto.
  const sections = useSidebarSections(projectId);

  return (
    <aside
      data-tour="sidebar"
      className={`editor-sidebar ${isLocked ? 'editor-sidebar--locked' : ''} ${isResizing ? 'editor-sidebar--resizing' : ''}`}
      style={width ? { width: `${width}px` } : undefined}
    >
      <div
        className={`sidebar-resize-handle ${isResizing ? 'is-active' : ''}`}
        role="separator"
        aria-orientation="vertical"
        aria-label={t('tooltips.resizeSidebar')}
        onMouseDown={onResizeStart}
      />

      {isLocked && (
        <div className="editor-sidebar__locked-overlay">
          <span className="editor-sidebar__locked-text">{t('sidebar.waitingHtml')}</span>
        </div>
      )}

      <div className="sidebar-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-tour={tab.tourId}
            aria-pressed={activeTab === tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'sidebar-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {!isLocked && (
        <div className="foux-editor-element-badge">
          <MousePointerClick size={13} className={`foux-editor-element-badge__icon ${hasSelection ? '' : 'foux-editor-element-badge__icon--muted'}`} />
          {hasSelection && <span className="foux-editor-element-badge__tag">{`<${selectedElement.tagName.toLowerCase()}>`}</span>}
          <span className="foux-editor-element-badge__hint">{t(hasSelection ? 'sidebar.selected' : 'sidebar.clickElementCanvas')}</span>
          {hasSelection && (
            <button
              type="button"
              className="foux-editor-element-badge__restore"
              onClick={onRestoreElement}
              data-tooltip={t('sidebar.restoreElementHint')}
              aria-label={t('sidebar.restoreElementHint')}
            >
              <RotateCcw size={12} aria-hidden="true" />
              <span>{t('sidebar.restoreElement')}</span>
            </button>
          )}
        </div>
      )}

      <SidebarSectionsContext.Provider value={sections}>
        <div className="sidebar-content">
          {activeTab === 'estilos' && (
            <>
              {!isLocked && !hasSelection && (
                <EmptyState Icon={Paintbrush} title={t('sidebar.selectElementToEdit')} hint={t('sidebar.hoverDocumentHint')} />
              )}
              <StylesTab
                element={selectedElement}
                resetKey={elementKey}
                values={computedStyles}
                disabled={isLocked || !hasSelection}
                apply={apply}
                colors={colors}
                onBoxFocus={onBoxFocus}
                injectFont={injectFont}
                getImportedFonts={getImportedFonts}
                tourStep={tourStep}
                t={t}
              />
            </>
          )}

          {activeTab === 'layout' && (
            <LayoutTab
              // Um documento novo (importar, desfazer) traz outra lista de IDs.
              key={documentKey}
              element={selectedElement}
              colors={colors}
              getElementsWithId={getElementsWithId}
              selectElementById={selectElementById}
              tourStep={tourStep}
              t={t}
            />
          )}

          {activeTab === 'eventos' && (hasSelection ? (
            <HoverTab
              key={elementKey}
              element={selectedElement}
              getHoverRules={getHoverRules}
              assignHoverClass={assignHoverClass}
              injectHoverStyles={injectHoverStyles}
              onStyleChange={onStyleChange}
              tourStep={tourStep}
              t={t}
            />
          ) : (
            <EmptyState Icon={Zap} title={t('sidebar.hoverSelectElement')} hint={t('sidebar.hoverClickCanvas')} />
          ))}
        </div>
      </SidebarSectionsContext.Provider>
    </aside>
  );
}

export default memo(SidebarEstilos);
