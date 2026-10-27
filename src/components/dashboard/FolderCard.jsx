import { Folder, Pin } from 'lucide-react';

export default function FolderCard({ folder, onClick, viewMode, onContextMenu, fileCount, t, formatDate }) {
  const isFavorite = !!(folder.favorite || folder.isFavorite);
  const dateLabel = formatDate(folder.createdAt);
  const fileCountLabel = fileCount === 1 ? t('dashboard.oneFile') : t('dashboard.filesCount', { count: fileCount });

  if (viewMode === 'list') {
    return (
      <div
        className={`list-item list-item--folder ${isFavorite ? 'list-item--pinned' : ''}`}
        onClick={() => onClick(folder.id)}
        onContextMenu={onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick(folder.id); }}
      >
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
      </div>
    );
  }

  return (
    <div
      className={`project-card project-card--folder ${isFavorite ? 'project-card--pinned' : ''}`}
      style={{ '--folder-border-color': folder.borderColor }}
      onClick={() => onClick(folder.id)}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(folder.id); }}
    >
      {isFavorite && (
        <div className="card-pin-badge" title={t('common.pin') || t('common.favorite')}>
          <Pin size={13} className="card-pin-icon" />
        </div>
      )}
      <div className="project-card__preview project-card__preview--folder">
        <Folder size={28} style={{ color: folder.borderColor }} />
      </div>
      <div className="project-card__info">
        <span className="project-card__name">{folder.name}</span>
        <span className="project-card__file-count">{fileCountLabel}</span>
        <span className="project-card__date">{t('dashboard.createdDate', { date: dateLabel })}</span>
      </div>
    </div>
  );
}

