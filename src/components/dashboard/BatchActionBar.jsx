import { useEffect, useRef, useState } from 'react';
import { Copy, FolderInput, Folder, LayoutDashboard, Pin, PinOff, Trash2, X } from 'lucide-react';
import FolderColorPicker from './FolderColorPicker';
import { isFavorite } from '../../utils/folderColors';
import { useLanguage } from '../../context/LanguageContext';

function MoveMenu({ folders, currentFolderId, onMove }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const targets = [
    ...(currentFolderId ? [{ id: null, name: t('dashboard.batch.moveToRoot'), root: true }] : []),
    ...folders.filter((folder) => folder.id !== currentFolderId),
  ];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    rootRef.current?.querySelector('.batch-bar__menu-item')?.focus();
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const onKeyDown = (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...rootRef.current.querySelectorAll('.batch-bar__menu-item')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div className="batch-bar__menu" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="batch-bar__btn"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={!targets.length}
        title={targets.length ? undefined : t('dashboard.batch.noFolders')}
      >
        <FolderInput size={15} aria-hidden="true" />
        <span>{t('dashboard.batch.moveTo')}</span>
      </button>
      {open && (
        <div className="batch-bar__popover" role="menu" aria-label={t('dashboard.batch.moveTo')}>
          {targets.map((target) => (
            <button
              key={target.id ?? 'root'}
              type="button"
              role="menuitem"
              className="batch-bar__menu-item"
              onClick={() => { setOpen(false); onMove(target.id); }}
            >
              {target.root
                ? <LayoutDashboard size={14} aria-hidden="true" />
                : <Folder size={14} style={{ color: target.borderColor }} aria-hidden="true" />}
              <span>{target.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BatchActionBar({
  kind,
  items,
  folders,
  currentFolderId,
  onFavorite,
  onDuplicate,
  onMove,
  onDelete,
  onChangeColor,
  onCancel,
}) {
  const { t } = useLanguage();
  const count = items.length;
  const allFavorite = count > 0 && items.every(isFavorite);
  const sharedColor = kind === 'folder' && items.every((item) => item.borderColor === items[0]?.borderColor)
    ? items[0]?.borderColor
    : null;

  let summary = t('dashboard.batch.hint');
  if (kind === 'project') summary = t(count === 1 ? 'dashboard.selectionCount' : 'dashboard.selectionCountPlural', { count });
  if (kind === 'folder') summary = t(count === 1 ? 'dashboard.batch.foldersOne' : 'dashboard.batch.foldersMany', { count });

  return (
    <div className="batch-bar" role="toolbar" aria-label={t('dashboard.batch.label')}>
      <span className="batch-bar__count" aria-live="polite">{summary}</span>

      {kind && (
        <div className="batch-bar__actions">
          {kind === 'folder' && (
            <FolderColorPicker value={sharedColor} onChange={onChangeColor} variant="button" placement="top" />
          )}
          <button type="button" className="batch-bar__btn" onClick={() => onFavorite(!allFavorite)} aria-pressed={allFavorite}>
            {allFavorite ? <PinOff size={15} aria-hidden="true" /> : <Pin size={15} aria-hidden="true" />}
            <span>{allFavorite ? t('dashboard.batch.unfavorite') : t('dashboard.batch.favorite')}</span>
          </button>
          {kind === 'project' && (
            <>
              <button type="button" className="batch-bar__btn" onClick={onDuplicate}>
                <Copy size={15} aria-hidden="true" />
                <span>{t('common.duplicate')}</span>
              </button>
              <MoveMenu folders={folders} currentFolderId={currentFolderId} onMove={onMove} />
            </>
          )}
          <button type="button" className="batch-bar__btn batch-bar__btn--danger" onClick={onDelete}>
            <Trash2 size={15} aria-hidden="true" />
            <span>{t('common.delete')}</span>
          </button>
        </div>
      )}

      <button type="button" className="batch-bar__close" onClick={onCancel} aria-label={t('dashboard.batch.exit')} title={t('dashboard.batch.exit')}>
        <X size={16} />
      </button>
    </div>
  );
}
