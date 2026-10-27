import { Plus } from 'lucide-react';

export default function NewProjectCard({ onClick, viewMode, t }) {
  return (
    <div
      className={`project-card project-card--new ${viewMode === 'list' ? 'project-card--list-new' : ''}`}
      id="card-new-project"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <div className="new-project__icon">
        <Plus size={viewMode === 'list' ? 16 : 22} />
      </div>
      <span className="new-project__title">{t('dashboard.newProject')}</span>
      {viewMode !== 'list' && (
        <span className="new-project__subtitle">{t('dashboard.startFromScratch')}</span>
      )}
    </div>
  );
}

