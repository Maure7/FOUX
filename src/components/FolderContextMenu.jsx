import { useEffect, useRef, useState } from 'react';
import {
  Trash2,
  Pencil,
  Palette,
  Star,
  StarOff,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* ===================================================================
   FolderContextMenu — Menu de contexto para pastas com opções:
   Excluir, Renomear, Mudar Cor (paleta visual em grid 3x2), Favoritar/Desfavoritar
   =================================================================== */

const COLOR_KEYS = [
  { key: 'gold', value: '#e59843' },
  { key: 'purple', value: '#8b31d9' },
  { key: 'blue', value: '#3b82f6' },
  { key: 'green', value: '#22c55e' },
  { key: 'red', value: '#ef4444' },
  { key: 'pink', value: '#ec4899' },
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
  const { t } = useLanguage();
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
        <span>{isFavorite ? t('common.unfavorite') : t('common.favorite')}</span>
      </button>

      {/* Renomear */}
      <button
        className="context-menu__item"
        onClick={() => { onRename(); onClose(); }}
      >
        <Pencil size={14} />
        <span>{t('common.rename')}</span>
      </button>

      {/* Mudar Cor (Submenu moderno com paleta em grid 3x2) */}
      <div
        className="context-menu__submenu-wrapper"
        onMouseEnter={() => setShowColors(true)}
        onMouseLeave={() => setShowColors(false)}
      >
        <button
          className="context-menu__item context-menu__item--submenu"
          onClick={() => setShowColors((prev) => !prev)}
        >
          <Palette size={14} />
          <span>{t('common.changeColor')}</span>
          <ChevronRight size={12} className="context-menu__chevron" />
        </button>
        {showColors && (
          <div className="context-menu__submenu context-menu__submenu--colors">
            <div className="context-menu__color-grid">
              {COLOR_KEYS.map((c) => {
                const isSelected = folder?.borderColor === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`context-menu__color-swatch ${isSelected ? 'context-menu__color-swatch--active' : ''}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => { onChangeColor(c.value); onClose(); }}
                    title={t(`modals.colors.${c.key}`)}
                    aria-label={t(`modals.colors.${c.key}`)}
                  />
                );
              })}
            </div>
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
        <span>{t('common.delete')}</span>
      </button>
    </div>
  );
}
