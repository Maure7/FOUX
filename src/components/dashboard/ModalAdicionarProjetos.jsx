import { useEffect, useState } from 'react';
import { FolderInput, X } from 'lucide-react';
import useModal from '../../hooks/useModal';
import { useLanguage } from '../../context/LanguageContext';
import ProjectPicker from './ProjectPicker';

export default function ModalAdicionarProjetos({ isOpen, onClose, folder, projects, onConfirm }) {
  const { t } = useLanguage();
  const { modalRef, present } = useModal(isOpen);
  const [selected, setSelected] = useState(() => new Set());
  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setSelected(new Set());
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!present) return null;

  const confirm = () => {
    if (!selected.size) return;
    onConfirm([...selected]);
    onClose();
  };

  return (
    <div className="modal-overlay" data-state={isOpen ? 'open' : 'closed'} inert={!isOpen} onClick={onClose}>
      <div
        className="modal-card modal-card--add-projects"
        onClick={(event) => event.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-projects-title"
        style={{ '--folder-accent-color': folder?.borderColor }}
      >
        <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title" id="modal-add-projects-title">{t('dashboard.addExisting.title')}</h2>
          <p className="modal-subtitle">{t('dashboard.addExisting.subtitle', { folder: folder?.name || '' })}</p>
        </div>

        <ProjectPicker
          projects={projects}
          selectedIds={selected}
          onChange={setSelected}
          emptyLabel={t('dashboard.addExisting.empty')}
        />

        <div className="modal-footer modal-footer--spread">
          <button className="modal-cancel-btn" onClick={onClose}>{t('common.cancel')}</button>
          <button className="modal-create-btn" onClick={confirm} disabled={!selected.size}>
            <FolderInput size={15} aria-hidden="true" />
            {selected.size > 1
              ? t('dashboard.addExisting.confirmMany', { count: selected.size })
              : t('dashboard.addExisting.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
