import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, tourId, tourStep }) {
  const [userOpen, setIsOpen] = useState(defaultOpen);
  const regionId = useId();
  const isOpen = tourStep ? tourStep.id === tourId : userOpen;

  return (
    <div data-tour={tourId} className={`sidebar-section ${isOpen ? 'sidebar-section--open' : 'sidebar-section--closed'}`}>
      <button
        className={`sidebar-section__header sidebar-accordion-header ${isOpen ? 'sidebar-section__header--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
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

