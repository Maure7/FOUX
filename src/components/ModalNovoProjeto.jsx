import { useState, useEffect } from 'react';
import { X, FileUp, BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ModalNovoProjeto({
  isOpen,
  onClose,
  onImportHTML,
  onOpenTutorial,
}) {
  const { t } = useLanguage();
  const [projectName, setProjectName] = useState('');

  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setProjectName('');
  } else if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const finalName = projectName.trim() || t('editor.untitledProject');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          className="modal-close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">
            {t('modals.newProject.title')}
          </h2>
          <p className="modal-subtitle">
            {t('modals.newProject.subtitle')}
          </p>
        </div>

        {/* Project name input */}
        <div className="modal-name-field">
          <label className="modal-name-label" htmlFor="modal-project-name">
            {t('modals.newProject.projectNameLabel')}
          </label>
          <input
            id="modal-project-name"
            className="modal-name-input"
            type="text"
            placeholder={t('editor.untitledProject')}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onImportHTML(finalName);
            }}
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="modal-action-btn modal-action-btn--primary"
            onClick={() => onImportHTML(finalName)}
          >
            <div className="modal-action-btn__icon-wrapper">
              <FileUp size={24} />
            </div>
            <div className="modal-action-btn__text">
              <span className="modal-action-btn__title">
                {t('modals.newProject.importHtmlTitle')}
              </span>
              <span className="modal-action-btn__desc">
                {t('modals.newProject.importHtmlDesc')}
              </span>
            </div>
          </button>

          <button
            className="modal-action-btn modal-action-btn--secondary"
            onClick={() => onOpenTutorial()}
          >
            <div className="modal-action-btn__icon-wrapper">
              <BookOpen size={24} />
            </div>
            <div className="modal-action-btn__text">
              <span className="modal-action-btn__title">
                {t('modals.newProject.openTutorialTitle')}
              </span>
              <span className="modal-action-btn__desc">
                {t('modals.newProject.openTutorialDesc')}
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
