import { useState, useEffect, useRef } from 'react';
import { X, Pencil } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ModalRenomear({ isOpen, onClose, onRename, currentName }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setName(currentName || '');
  } else if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  /* Auto-focus input when modal opens */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
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
        <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-rename__header-row">
            <Pencil size={18} className="modal-rename__icon" />
            <h2 className="modal-title" id="modal-rename-title">{t('modals.rename.title')}</h2>
          </div>
          <p className="modal-subtitle">{t('modals.rename.subtitle')}</p>
        </div>

        {/* Input */}
        <div className="modal-name-field">
          <label className="modal-name-label" htmlFor="modal-rename-input">
            {t('modals.rename.newNameLabel')}
          </label>
          <input
            ref={inputRef}
            id="modal-rename-input"
            className="modal-name-input"
            type="text"
            placeholder={currentName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>

        {/* Footer */}
        <div className="modal-footer modal-footer--spread">
          <button className="modal-cancel-btn" onClick={onClose}>{t('common.cancel')}</button>
          <button className="modal-create-btn" onClick={handleSubmit}>
            {t('modals.rename.renameBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
