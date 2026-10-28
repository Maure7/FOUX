import { activateOnKey } from '../../utils/keyboard';
import { CheckSquare, FileCode, Pin, MoreHorizontal } from 'lucide-react';

export default function ProjectCard({
  project,
  onClick,
  onContextMenu,
  viewMode,
  selectionMode,
  isSelected,
  onToggleSelect,
  t,
  formatDate,
}) {
  const isFavorite = !!(project.favorite || project.isFavorite);
  const dateLabel = formatDate(project.updatedAt);

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect(project.id);
    } else {
      onClick(project.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`list-item ${selectionMode ? 'list-item--selectable' : ''} ${isSelected ? 'list-item--selected' : ''} ${isFavorite ? 'list-item--pinned' : ''}`}
        onClick={handleClick}
        onContextMenu={selectionMode ? undefined : onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => activateOnKey(event, () => handleClick())}
      >
        {selectionMode && (
          <div className={`selection-checkbox ${isSelected ? 'selection-checkbox--checked' : ''}`}>
            {isSelected && <CheckSquare size={16} />}
          </div>
        )}
        <FileCode size={18} className="list-item__icon" />
        <div className="list-item__name-wrapper">
          <span className="list-item__name">{project.name}</span>
          {isFavorite && (
            <span className="list-item__pin-badge" title={t('common.pin') || t('common.favorite')}>
              <Pin size={12} className="list-item__pin-icon" />
            </span>
          )}
        </div>
        <span className="list-item__date">{t('dashboard.editedDate', { date: dateLabel })}</span>
        {!selectionMode && (
          <button
            className="list-item__options"
            onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
            aria-label={t('common.options')}
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`project-card project-card--saved ${selectionMode ? 'project-card--selectable' : ''} ${isSelected ? 'project-card--selected' : ''} ${isFavorite ? 'project-card--pinned' : ''}`}
      onClick={handleClick}
      onContextMenu={selectionMode ? undefined : onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => activateOnKey(event, () => handleClick())}
    >
      {isFavorite && (
        <div className="card-pin-badge" title={t('common.pin') || t('common.favorite')}>
          <Pin size={13} className="card-pin-icon" />
        </div>
      )}
      {selectionMode && (
        <div className={`selection-checkbox selection-checkbox--card ${isSelected ? 'selection-checkbox--checked' : ''}`}>
          {isSelected && <CheckSquare size={18} />}
        </div>
      )}
      <div className="project-card__preview">
        {project.htmlContent ? (
          <FileCode size={24} className="project-card__preview-icon project-card__preview-icon--active" />
        ) : (
          <FileCode size={24} className="project-card__preview-icon" />
        )}
      </div>
      <div className="project-card__info">
        <span className="project-card__name">{project.name}</span>
        <span className="project-card__date">{t('dashboard.editedDate', { date: dateLabel })}</span>
      </div>
    </div>
  );
}

