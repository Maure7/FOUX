import { useState, useEffect, useMemo } from 'react';
import { X, Folder } from 'lucide-react';
import useModal from '../../hooks/useModal';
import { useLanguage } from '../../context/LanguageContext';
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from '../../utils/folderColors';
import ProjectPicker from './ProjectPicker';

export default function ModalNovaPasta({ isOpen, onClose, onCreate, existingFolders, projects = [] }) {
  const { t } = useLanguage();
  const { modalRef, present } = useModal(isOpen);
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_FOLDER_COLOR);
  const [selectedProjects, setSelectedProjects] = useState(() => new Set());

  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setFolderName('');
    setSelectedColor(DEFAULT_FOLDER_COLOR);
    setSelectedProjects(new Set());
  } else if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);


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
    const knownIds = new Set(projects.map((project) => project.id));
    onCreate(finalName, selectedColor, [...selectedProjects].filter((id) => knownIds.has(id)));
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
        <button className="modal-close" onClick={onClose} aria-label={t('common.close')}>
          <X size={18} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title" id="modal-folder-title">{t('modals.newFolder.title')}</h2>
          <p className="modal-subtitle">{t('modals.newFolder.subtitle')}</p>
        </div>

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

        <div className="modal-folder-colors">
          <span className="modal-name-label">{t('modals.newFolder.borderColorLabel')}</span>
          <div className="color-picker-grid">
            {FOLDER_COLORS.map(({ key, value: color }) => (
              <button
                key={color}
                className={`color-picker-swatch ${selectedColor === color ? 'color-picker-swatch--active' : ''}`}
                style={{ '--swatch-color': color }}
                onClick={() => setSelectedColor(color)}
                aria-label={t(`modals.colors.${key}`)}
                aria-pressed={selectedColor === color}
              />
            ))}
          </div>
        </div>

        {projects.length > 0 && (
          <fieldset className="modal-folder-projects">
            <legend className="modal-name-label">{t('modals.newFolder.projectsLabel')}</legend>
            <ProjectPicker
              projects={projects}
              folders={existingFolders}
              selectedIds={selectedProjects}
              onChange={setSelectedProjects}
            />
          </fieldset>
        )}

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
