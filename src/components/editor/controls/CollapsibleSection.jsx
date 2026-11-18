import { useContext, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SidebarSectionsContext } from '../../../hooks/useSidebarSections';

// Com `sectionId` dentro da sidebar, o estado aberto/fechado é o salvo para o projeto
// (tudo começa fechado). O tour abre só a seção do passo atual.
export default function CollapsibleSection({ sectionId, title, icon: Icon, children, defaultOpen = false, tourId, tourStep }) {
  const sections = useContext(SidebarSectionsContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const persisted = !!(sections && sectionId);
  const userOpen = persisted ? sections.isOpen(sectionId) : localOpen;
  const regionId = useId();
  const isOpen = tourStep ? tourStep.id === tourId : userOpen;
  const toggle = () => (persisted ? sections.toggle(sectionId) : setLocalOpen((open) => !open));

  return (
    <div
      data-tour={tourId}
      data-section={sectionId}
      className={`sidebar-section ${isOpen ? 'sidebar-section--open' : 'sidebar-section--closed'}`}
    >
      <button
        type="button"
        className={`sidebar-section__header sidebar-accordion-header ${isOpen ? 'sidebar-section__header--open' : ''}`}
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={regionId}
      >
        <div className="sidebar-section__header-left">
          {Icon && <Icon size={14} color="currentColor" className="sidebar-section__icon" />}
          <span className="sidebar-section__title">{title}</span>
        </div>
        <span className="sidebar-section__chevron">
          <ChevronDown size={14} color="currentColor" />
        </span>
      </button>
      <div id={regionId} className="sidebar-section__region" inert={!isOpen} aria-hidden={!isOpen}>
        <div className="sidebar-section__clip">
          <div className="sidebar-section__body">{children}</div>
        </div>
      </div>
    </div>
  );
}
