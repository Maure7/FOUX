import { useState, useEffect, useMemo } from 'react';
import { X, Folder } from 'lucide-react';

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
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);

  /* Reset state when modal opens */
  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setSelectedColor(COLOR_PALETTE[0]);
    }
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* Prevent body scroll */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* Generate fallback name */
  const fallbackName = useMemo(() => {
    if (!existingFolders) return 'Pasta nova (1)';
    const pattern = /^Pasta nova \((\d+)\)$/;
    let maxNum = 0;
    existingFolders.forEach((f) => {
      const match = f.name.match(pattern);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    });
    // Also count plain "Pasta nova" entries
    const hasPlain = existingFolders.some((f) => f.name === 'Pasta nova');
    const nextNum = hasPlain ? Math.max(maxNum + 1, 2) : maxNum + 1;
    return `Pasta nova (${nextNum})`;
  }, [existingFolders]);

  const handleCreate = () => {
    const finalName = folderName.trim() || fallbackName;
    onCreate(finalName, selectedColor);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--folder"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-folder-title"
      >
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Fechar modal">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="modal-folder-title">Nova Pasta</h2>
          <p className="modal-subtitle">Escolha um nome e uma cor de contorno</p>
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
            Nome da Pasta
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
            autoFocus
          />
        </div>

        {/* Color picker */}
        <div className="modal-folder-colors">
          <span className="modal-name-label">Cor do Contorno</span>
          <div className="color-picker-grid">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                className={`color-picker-swatch ${selectedColor === color ? 'color-picker-swatch--active' : ''}`}
                style={{ '--swatch-color': color }}
                onClick={() => setSelectedColor(color)}
                aria-label={`Cor ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer modal-footer--spread">
          <button className="modal-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="modal-create-btn" onClick={handleCreate}>
            Criar Pasta
          </button>
        </div>
      </div>
    </div>
  );
}
