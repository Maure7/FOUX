import { memo, useState } from 'react';
import { Layers, Palette } from 'lucide-react';
import CollapsibleSection from '../controls/CollapsibleSection';
import ColorControl from '../controls/ColorControl';
import { cssInfo } from '../../../utils/css/glossary.js';

function LayoutTab({ element, colors, getElementsWithId, selectElementById, tourStep, t }) {
  // Mounted on each visit to the tab, so the list reflects the current document.
  const [idElements] = useState(getElementsWithId);

  return (
    <>
      <CollapsibleSection title={t('sidebar.elementsById')} icon={Layers} tourId="layout" tourStep={tourStep}>
        {idElements.length === 0 ? (
          <div className="foux-editor-empty-state foux-editor-empty-state--compact">
            <Layers size={22} className="foux-editor-empty-state__icon-inline" />
            <span className="foux-editor-empty-state__hint">{t('sidebar.noElementsWithId')}</span>
          </div>
        ) : (
          <div className="foux-layout-id-list">
            {idElements.map((item, index) => (
              <button
                // Invalid HTML may repeat an ID; the index keeps React keys unique.
                key={`${item.id}-${index}`}
                className={`foux-layout-id-item ${element?.id === item.id ? 'foux-layout-id-item--active' : ''}`}
                onClick={() => selectElementById(item.id)}
              >
                <span className="foux-layout-id-item__hash">#</span>
                <span className="foux-layout-id-item__name">{item.id}</span>
                <span className="foux-layout-id-item__tag">{`<${item.tagName.toLowerCase()}>`}</span>
              </button>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {element && (
        <CollapsibleSection title={t('sidebar.colors')} icon={Palette}>
          <ColorControl label={t('sidebar.backgroundColor')} {...cssInfo(t, 'backgroundColor')} {...colors.background} />
          <ColorControl label={t('sidebar.textHighlightColor')} {...cssInfo(t, 'color')} {...colors.text} />
        </CollapsibleSection>
      )}
    </>
  );
}

export default memo(LayoutTab);
