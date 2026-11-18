import { activateOnKey } from '../../utils/keyboard';
import { Check, Folder, MoreHorizontal, Pin } from 'lucide-react';

export default function FolderCard({
  folder,
  onClick,
  viewMode,
  onContextMenu,
  fileCount,
  selectionMode = false,
  isSelected = false,
  blocked = false,
  blockedHint,
  onToggleSelect,
  t,
  formatDate,
}) {
  const isFavorite = !!(folder.favorite || folder.isFavorite);
  const dateLabel = formatDate(folder.createdAt);
  const fileCountLabel = fileCount === 1 ? t('dashboard.oneFile') : t('dashboard.filesCount', { count: fileCount });

  const activate = () => {
    if (blocked) return;
    if (selectionMode) onToggleSelect(folder.id);
    else onClick(folder.id);
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
  const checkbox = selectionMode && (
    <span className={`selection-checkbox ${viewMode === 'list' ? '' : 'selection-checkbox--card'} ${isSelected ? 'selection-checkbox--checked' : ''}`} aria-hidden="true">
      {isSelected && <Check size={13} strokeWidth={3} />}
    </span>
  );
  // Mesmo botão "⋯" dos projetos: sem ele, as opções da pasta só abriam pelo botão direito.
  const optionsButton = !selectionMode && (
    <button
      type="button"
      className={viewMode === 'list' ? 'list-item__options' : 'project-card__options'}
      onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
      aria-label={t('common.options')}
      aria-haspopup="menu"
    >
      <MoreHorizontal size={16} />
    </button>
  );

  if (viewMode === 'list') {
    return (
      <div
        className={`list-item list-item--folder ${isFavorite ? 'list-item--pinned' : ''} ${isSelected ? 'list-item--selected' : ''} ${states}`}
        style={{ '--folder-border-color': folder.borderColor }}
        {...interaction}
      >
        {checkbox}
        <Folder size={18} className="list-item__icon" style={{ color: folder.borderColor }} />
        <div className="list-item__name-wrapper">
          <span className="list-item__name">{folder.name}</span>
          {isFavorite && (
            <span className="list-item__pin-badge" title={t('common.pin') || t('common.favorite')}>
              <Pin size={12} className="list-item__pin-icon" />
            </span>
          )}
        </div>
        <span className="list-item__file-count">{fileCountLabel}</span>
        <span className="list-item__date">{dateLabel}</span>
        {optionsButton}
      </div>
    );
  }

  return (
    <div
      className={`project-card project-card--folder ${isFavorite ? 'project-card--pinned' : ''} ${isSelected ? 'project-card--selected' : ''} ${states}`}
      style={{ '--folder-border-color': folder.borderColor }}
      {...interaction}
    >
      {isFavorite && (
        <div className="card-pin-badge" title={t('common.pin') || t('common.favorite')}>
          <Pin size={13} className="card-pin-icon" />
        </div>
      )}
      {checkbox}
      <div className="project-card__preview project-card__preview--folder">
        <Folder size={28} style={{ color: folder.borderColor }} />
      </div>
      <div className="project-card__info">
        <span className="project-card__name">{folder.name}</span>
        <span className="project-card__file-count">{fileCountLabel}</span>
        <span className="project-card__date">{t('dashboard.createdDate', { date: dateLabel })}</span>
      </div>
      {optionsButton}
    </div>
  );
}
