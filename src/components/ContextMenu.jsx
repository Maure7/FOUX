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
} from 'lucide-react';

export default function ContextMenu({
  x,
  y,
  onClose,
  onOpen,
  onRename,
  onMoveTo,
  onDuplicate,
  onDelete,
  folders = [],
  currentFolderId = null,
}) {
  const menuRef = useRef(null);
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

  /* Viewport-aware positioning */
  const style = {};
  const menuWidth = 200;
  const menuHeight = 220;

  if (x + menuWidth > window.innerWidth) {
    style.right = `${window.innerWidth - x}px`;
  } else {
    style.left = `${x}px`;
  }
  if (y + menuHeight > window.innerHeight) {
    style.bottom = `${window.innerHeight - y}px`;
  } else {
    style.top = `${y}px`;
  }

  /* Move-to destinations: all folders except the one the project is already in, plus "Raiz" */
  const moveDestinations = [];
  if (currentFolderId !== null) {
    moveDestinations.push({ id: null, name: 'Raiz', icon: Home });
  }
  folders.forEach((f) => {
    if (f.id !== currentFolderId) {
      moveDestinations.push({ id: f.id, name: f.name, icon: FolderOpen, color: f.borderColor });
    }
  });

  return (
    <div className="context-menu" ref={menuRef} style={style}>
      {/* Open */}
      <button className="context-menu__item" onClick={() => { onOpen(); onClose(); }}>
        <ExternalLink size={14} />
        <span>Abrir</span>
      </button>

      {/* Rename */}
      <button className="context-menu__item" onClick={() => { onRename(); onClose(); }}>
        <Pencil size={14} />
        <span>Renomear</span>
      </button>

      {/* Move to */}
      {moveDestinations.length > 0 && (
        <div className="context-menu__submenu-wrapper">
          <button className="context-menu__item context-menu__item--submenu">
            <FolderInput size={14} />
            <span>Mover para</span>
            <ChevronRight size={12} className="context-menu__chevron" />
          </button>
          <div className="context-menu__submenu" ref={subMenuRef}>
            {moveDestinations.map((dest) => {
              const Icon = dest.icon;
              return (
                <button
                  key={dest.id ?? 'root'}
                  className="context-menu__item"
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
      <button className="context-menu__item" onClick={() => { onDuplicate(); onClose(); }}>
        <Copy size={14} />
        <span>Duplicar</span>
      </button>

      {/* Delete */}
      <button className="context-menu__item context-menu__item--danger" onClick={() => { onDelete(); onClose(); }}>
        <Trash2 size={14} />
        <span>Excluir</span>
      </button>
    </div>
  );
}
