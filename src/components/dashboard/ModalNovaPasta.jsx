import { useState, useEffect, useMemo } from 'react';
import { X, Folder } from 'lucide-react';
import useModal from '../../hooks/useModal';
import { useLanguage } from '../../context/LanguageContext';

const COLOR_PALETTE = [
  '#e59843', // gold
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export default function ModalNovaPasta({ isOpen, onClose, onCreate, existingFolders }) {
  const { t } = useLanguage();
  const { modalRef, present } = useModal(isOpen);
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);

  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setFolderName('');
    setSelectedColor(COLOR_PALETTE[0]);
  } else if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);


  /* Generate fallback name */
  const fallbackName = useMemo(() => {
    const prefix = t('modals.newFolder.defaultNamePrefix');
    if (!existingFolders) return `${prefix} (1)`;
    const pattern = new RegExp(`^${prefix} \\((\\d+)\\)$`);
    let maxNum = 0;
    existingFolders.forEach((f) => {
      const match = f.name.match(pattern);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    });
    const hasPlain = existingFolders.some((f) => f.name === prefix);
    const nextNum = hasPlain ? Math.max(maxNum + 1, 2) : maxNum + 1;
    return `${prefix} (${nextNum})`;
  }, [existingFolders, t]);

  const handleCreate = () => {
    const finalName = folderName.trim() || fallbackName;
    onCreate(finalName, selectedColor);
    onClose();
  };

  if (!present) return null;

  return (
    <div className="modal-overlay" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} onClick={onClose}>
      <div
        className="modal-card modal-card--folder"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-folder-title"
      >
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="modal-folder-title">{t('modals.newFolder.title')}</h2>
          <p className="modal-subtitle">{t('modals.newFolder.subtitle')}</p>
        </div>

        {/* Preview */}
        <div className="modal-folder-preview">
          <Folder
            size={48}
            className="modal-folder-preview__icon"
            style={{ color: selectedColor }}
          />
          <span className="modal-folder-preview__name">
            {folderName.trim() || fallbackName}
          </span>
        </div>

        {/* Name input */}
        <div className="modal-name-field">
          <label className="modal-name-label" htmlFor="modal-folder-name">
            {t('modals.newFolder.folderNameLabel')}
          </label>
          <input
            id="modal-folder-name"
            className="modal-name-input"
            type="text"
            placeholder={fallbackName}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
        </div>

        {/* Color picker */}
        <div className="modal-folder-colors">
          <span className="modal-name-label">{t('modals.newFolder.borderColorLabel')}</span>
          <div className="color-picker-grid">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                className={`color-picker-swatch ${selectedColor === color ? 'color-picker-swatch--active' : ''}`}
                style={{ '--swatch-color': color }}
                onClick={() => setSelectedColor(color)}
                aria-label={t('common.color', { color })}
                aria-pressed={selectedColor === color}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer modal-footer--spread">
          <button className="modal-cancel-btn" onClick={onClose}>{t('common.cancel')}</button>
          <button className="modal-create-btn" onClick={handleCreate}>
            {t('modals.newFolder.createFolderBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
