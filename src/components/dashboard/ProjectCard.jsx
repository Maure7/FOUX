import { activateOnKey } from '../../utils/keyboard';
import { Check, FileCode, Pin, MoreHorizontal } from 'lucide-react';

export default function ProjectCard({
  project,
  onClick,
  onContextMenu,
  viewMode,
  selectionMode = false,
  isSelected = false,
  blocked = false,
  blockedHint,
  onToggleSelect,
  t,
  formatDate,
}) {
  const isFavorite = !!(project.favorite || project.isFavorite);
  const dateLabel = formatDate(project.updatedAt);

  const activate = () => {
    if (blocked) return;
    if (selectionMode) onToggleSelect(project.id);
    else onClick(project.id);
  };

  const interaction = {
    onClick: activate,
    onContextMenu: selectionMode ? (event) => event.preventDefault() : onContextMenu,
    role: selectionMode ? 'checkbox' : 'button',
    tabIndex: blocked ? -1 : 0,
    onKeyDown: (event) => activateOnKey(event, activate),
    ...(selectionMode && { 'aria-checked': isSelected }),
    ...(blocked && { 'aria-disabled': true, title: blockedHint }),
  };
  const states = `${selectionMode ? 'is-selectable' : ''} ${isSelected ? 'is-selected' : ''} ${blocked ? 'is-blocked' : ''}`;

  if (viewMode === 'list') {
    return (
      <div
        className={`list-item ${selectionMode ? 'list-item--selectable' : ''} ${isSelected ? 'list-item--selected' : ''} ${isFavorite ? 'list-item--pinned' : ''} ${states}`}
        {...interaction}
      >
        {selectionMode && (
          <span className={`selection-checkbox ${isSelected ? 'selection-checkbox--checked' : ''}`} aria-hidden="true">
            {isSelected && <Check size={13} strokeWidth={3} />}
          </span>
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
      className={`project-card project-card--saved ${selectionMode ? 'project-card--selectable' : ''} ${isSelected ? 'project-card--selected' : ''} ${isFavorite ? 'project-card--pinned' : ''} ${states}`}
      {...interaction}
    >
      {isFavorite && (
        <div className="card-pin-badge" title={t('common.pin') || t('common.favorite')}>
          <Pin size={13} className="card-pin-icon" />
        </div>
      )}
      {selectionMode && (
        <span className={`selection-checkbox selection-checkbox--card ${isSelected ? 'selection-checkbox--checked' : ''}`} aria-hidden="true">
          {isSelected && <Check size={13} strokeWidth={3} />}
        </span>
      )}
      <div className="project-card__preview">
        <FileCode size={24} className={`project-card__preview-icon ${project.htmlContent ? 'project-card__preview-icon--active' : ''}`} />
      </div>
      <div className="project-card__info">
        <span className="project-card__name">{project.name}</span>
        <span className="project-card__date">{t('dashboard.editedDate', { date: dateLabel })}</span>
      </div>
      {/* Na grade o menu só abria com o botão direito; o "⋯" deixa as opções visíveis. */}
      {!selectionMode && (
        <button
          type="button"
          className="project-card__options"
          onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
          aria-label={t('common.options')}
          aria-haspopup="menu"
        >
          <MoreHorizontal size={16} />
        </button>
      )}
    </div>
  );
}
