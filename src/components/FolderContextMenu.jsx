import { useEffect, useRef, useState } from 'react';
import {
  Trash2,
  Pencil,
  Palette,
  Star,
  StarOff,
  ChevronRight,
} from 'lucide-react';

/* ===================================================================
   FolderContextMenu — Menu de contexto para pastas com opções:
   Excluir, Renomear, Mudar Cor, Favoritar/Desfavoritar
   =================================================================== */

const COLOR_PALETTE = [
  { name: 'Dourado', value: '#e59843' },
  { name: 'Roxo', value: '#8b31d9' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Rosa', value: '#ec4899' },
];

export default function FolderContextMenu({
  x,
  y,
  folder,
  onClose,
  onDelete,
  onRename,
  onChangeColor,
  onToggleFavorite,
}) {
  const menuRef = useRef(null);
  const [showColors, setShowColors] = useState(false);

  /* Close on click outside */
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
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
  const menuHeight = 200;

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

  const isFavorite = folder?.favorite;

  return (
    <div className="context-menu" ref={menuRef} style={style}>
      {/* Favoritar / Desfavoritar */}
      <button
        className="context-menu__item"
        onClick={() => { onToggleFavorite(); onClose(); }}
      >
        {isFavorite ? <StarOff size={14} /> : <Star size={14} />}
        <span>{isFavorite ? 'Remover dos favoritos' : 'Favoritar'}</span>
      </button>

      {/* Renomear */}
      <button
        className="context-menu__item"
        onClick={() => { onRename(); onClose(); }}
      >
        <Pencil size={14} />
        <span>Renomear</span>
      </button>

      {/* Mudar Cor */}
      <div className="context-menu__submenu-wrapper">
        <button
          className="context-menu__item context-menu__item--submenu"
          onClick={() => setShowColors(!showColors)}
        >
          <Palette size={14} />
          <span>Mudar Cor</span>
          <ChevronRight size={12} className="context-menu__chevron" />
        </button>
        {showColors && (
          <div className="context-menu__submenu context-menu__submenu--colors">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                className="context-menu__color-item"
                onClick={() => { onChangeColor(c.value); onClose(); }}
              >
                <div
                  className="context-menu__color-swatch"
                  style={{ backgroundColor: c.value }}
                />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="context-menu__divider" />

      {/* Excluir */}
      <button
        className="context-menu__item context-menu__item--danger"
        onClick={() => { onDelete(); onClose(); }}
      >
        <Trash2 size={14} />
        <span>Excluir</span>
      </button>
    </div>
  );
}
