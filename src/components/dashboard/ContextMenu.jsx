import { useEffect, useRef } from 'react';
import {
  ExternalLink,
  Pencil,
  FolderInput,
  Copy,
  Trash2,
  ChevronRight,
  FolderOpen,
  Home,
  Pin,
  PinOff,
} from 'lucide-react';
import useFloatingMenu from '../../hooks/useFloatingMenu';
import { useLanguage } from '../../context/LanguageContext';

export default function ContextMenu({
  x,
  y,
  onClose,
  onOpen,
  onRename,
  onMoveTo,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  isFavorite = false,
  folders = [],
  currentFolderId = null,
}) {
  const { t } = useLanguage();
  const menuRef = useRef(null);
  useFloatingMenu(menuRef, x, y);
  const subMenuRef = useRef(null);

  /* Close on click outside */
  useEffect(() => {
    const handleClick = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        (!subMenuRef.current || !subMenuRef.current.contains(e.target))
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  /* Close on Escape */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /* Move-to destinations: all folders except the one the project is already in, plus "Raiz" */
  const moveDestinations = [];
  if (currentFolderId !== null) {
    moveDestinations.push({ id: null, name: t('common.root'), icon: Home });
  }
  folders.forEach((f) => {
    if (f.id !== currentFolderId) {
      moveDestinations.push({ id: f.id, name: f.name, icon: FolderOpen, color: f.borderColor });
    }
  });

  return (
    <div className="context-menu" ref={menuRef} style={{ left: x, top: y }} role="menu" aria-label={t('common.options')}>
      {/* Open */}
      <button role="menuitem" className="context-menu__item" onClick={() => { onOpen(); onClose(); }}>
        <ExternalLink size={14} />
        <span>{t('common.open')}</span>
      </button>

      {/* Fixar / Desafixar Favorito */}
      {onToggleFavorite && (
        <button role="menuitem" className="context-menu__item" onClick={() => { onToggleFavorite(); onClose(); }}>
          {isFavorite ? <PinOff size={14} /> : <Pin size={14} />}
          <span>{isFavorite ? (t('common.unpin') || t('common.unfavorite')) : (t('common.pin') || t('common.favorite'))}</span>
        </button>
      )}

      {/* Rename */}
      <button role="menuitem" className="context-menu__item" onClick={() => { onRename(); onClose(); }}>
        <Pencil size={14} />
        <span>{t('common.rename')}</span>
      </button>

      {/* Move to */}
      {moveDestinations.length > 0 && (
        <div className="context-menu__submenu-wrapper">
          <button role="menuitem" className="context-menu__item context-menu__item--submenu" aria-haspopup="menu">
            <FolderInput size={14} />
            <span>{t('common.moveTo')}</span>
            <ChevronRight size={12} className="context-menu__chevron" />
          </button>
          <div className="context-menu__submenu" ref={subMenuRef} role="menu">
            {moveDestinations.map((dest) => {
              const Icon = dest.icon;
              return (
                <button
                  key={dest.id ?? 'root'}
                  role="menuitem" className="context-menu__item"
                  onClick={() => { onMoveTo(dest.id); onClose(); }}
                >
                  <Icon size={14} style={dest.color ? { color: dest.color } : undefined} />
                  <span>{dest.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="context-menu__divider" />

      {/* Duplicate */}
      <button role="menuitem" className="context-menu__item" onClick={() => { onDuplicate(); onClose(); }}>
        <Copy size={14} />
        <span>{t('common.duplicate')}</span>
      </button>

      {/* Delete */}
      <button role="menuitem" className="context-menu__item context-menu__item--danger" onClick={() => { onDelete(); onClose(); }}>
        <Trash2 size={14} />
        <span>{t('common.delete')}</span>
      </button>
    </div>
  );
}
