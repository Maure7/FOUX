import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import useModal from '../../hooks/useModal';
import { useLanguage } from '../../context/LanguageContext';

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
  const { modalRef, present } = useModal(isOpen);

  const content = {
    title: title || t('common.confirm'),
    message,
    confirmLabel: confirmLabel || t('common.delete'),
    cancelLabel: cancelLabel || t('common.cancel'),
  };
  // Parents may clear the selected item immediately. Keep the outgoing dialog
  // intact until its exit finishes instead of changing its text mid-transition.
  const [lastOpenContent, setLastOpenContent] = useState(content);
  if (isOpen && Object.keys(content).some(key => content[key] !== lastOpenContent[key])) {
    setLastOpenContent(content);
  }
  const displayed = isOpen ? content : lastOpenContent;

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);


  if (!present) return null;

  return (
    <div className="modal-overlay" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} onClick={onClose}>
      <div
        className="modal-card modal-card--confirm"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-confirm-title"
        aria-describedby={displayed.message ? 'modal-confirm-message' : undefined}
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
        <h2 className="modal-title" id="modal-confirm-title">{displayed.title}</h2>
        {displayed.message && <p className="modal-confirm__message" id="modal-confirm-message">{displayed.message}</p>}

        {/* Actions */}
        <div className="modal-footer modal-footer--spread">
          <button className="modal-cancel-btn" onClick={onClose}>
            {displayed.cancelLabel}
          </button>
          <button
            className="modal-confirm__delete-btn"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {displayed.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
