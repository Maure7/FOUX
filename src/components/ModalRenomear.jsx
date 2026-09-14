import { useState, useEffect, useRef } from 'react';
import { X, Pencil } from 'lucide-react';

export default function ModalRenomear({ isOpen, onClose, onRename, currentName }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  /* Reset when modal opens */
  useEffect(() => {
    if (isOpen) {
      setName(currentName || '');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, currentName]);

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

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      onRename(trimmed);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--rename"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-rename-title"
      >
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-rename__header-row">
            <Pencil size={18} className="modal-rename__icon" />
            <h2 className="modal-title" id="modal-rename-title">Renomear</h2>
          </div>
          <p className="modal-subtitle">Digite o novo nome para este item</p>
        </div>

        {/* Input */}
        <div className="modal-name-field">
          <label className="modal-name-label" htmlFor="modal-rename-input">
            Novo Nome
          </label>
          <input
            ref={inputRef}
            id="modal-rename-input"
            className="modal-name-input"
            type="text"
            placeholder="Novo nome..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>

        {/* Footer */}
        <div className="modal-footer modal-footer--spread">
          <button className="modal-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="modal-create-btn" onClick={handleSubmit}>
            Renomear
          </button>
        </div>
      </div>
    </div>
  );
}
