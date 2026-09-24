import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ModalConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
}) {
  const { t } = useLanguage();

  const finalTitle = title || t('common.confirm');
  const finalConfirmLabel = confirmLabel || t('common.delete');
  const finalCancelLabel = cancelLabel || t('common.cancel');

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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--confirm"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-confirm-title"
      >
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="modal-confirm__icon-wrapper">
          <AlertTriangle size={28} />
        </div>

        {/* Content */}
        <h2 className="modal-title" id="modal-confirm-title">{finalTitle}</h2>
        {message && <p className="modal-confirm__message">{message}</p>}

        {/* Actions */}
        <div className="modal-footer modal-footer--spread">
          <button className="modal-cancel-btn" onClick={onClose}>
            {finalCancelLabel}
          </button>
          <button
            className="modal-confirm__delete-btn"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {finalConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
