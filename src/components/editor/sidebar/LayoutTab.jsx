import { memo, useMemo, useState } from 'react';
import { Layers, Palette } from 'lucide-react';
import CollapsibleSection from '../controls/CollapsibleSection';
import ColorControl from '../controls/ColorControl';
import { cssInfo } from '../../../utils/css/glossary.js';

// Posição do elemento entre os que repetem o mesmo ID (HTML inválido, mas comum).
function occurrenceOf(element) {
  if (!element?.id) return -1;
  return [...element.ownerDocument.querySelectorAll('[id]')].filter((node) => node.id === element.id).indexOf(element);
}

function LayoutTab({ element, colors, getElementsWithId, selectElementById, tourStep, t }) {
  // Montada a cada visita à aba e a cada documento carregado (key no pai).
  const [idElements] = useState(getElementsWithId);
  const activeOccurrence = useMemo(() => occurrenceOf(element), [element]);

  return (
    <>
      <CollapsibleSection sectionId="elementsById" title={t('sidebar.elementsById')} icon={Layers} tourId="layout" tourStep={tourStep}>
        {idElements.length === 0 ? (
          <div className="foux-editor-empty-state foux-editor-empty-state--compact">
            <Layers size={22} className="foux-editor-empty-state__icon-inline" />
            <span className="foux-editor-empty-state__hint">{t('sidebar.noElementsWithId')}</span>
          </div>
        ) : (
          <div className="foux-layout-id-list">
            {idElements.map((item) => {
              const active = element?.id === item.id && activeOccurrence === item.occurrence;
              return (
                <button
                  key={`${item.id}-${item.occurrence}`}
                  className={`foux-layout-id-item ${active ? 'foux-layout-id-item--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => selectElementById(item.id, item.occurrence)}
                >
                  <span className="foux-layout-id-item__hash">#</span>
                  <span className="foux-layout-id-item__name">{item.id}</span>
                  <span className="foux-layout-id-item__tag">{`<${item.tagName.toLowerCase()}>`}</span>
                </button>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {element && (
        <CollapsibleSection sectionId="colors" title={t('sidebar.colors')} icon={Palette}>
          <ColorControl label={t('sidebar.backgroundColor')} {...cssInfo(t, 'backgroundColor')} {...colors.background} />
          <ColorControl label={t('sidebar.textHighlightColor')} {...cssInfo(t, 'color')} {...colors.text} />
        </CollapsibleSection>
      )}
    </>
  );
}

export default memo(LayoutTab);
