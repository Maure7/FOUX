import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Folder, FolderInput, Pencil } from 'lucide-react';
import FolderColorPicker from './FolderColorPicker';
import { useLanguage } from '../../context/LanguageContext';

function InlineFolderName({ name, onRename }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const skipBlur = useRef(false);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const begin = () => {
    setDraft(name);
    skipBlur.current = false;
    setEditing(true);
  };

  const finish = (save) => {
    if (skipBlur.current) return;
    skipBlur.current = true;
    const next = draft.trim();
    if (save && next && next !== name) onRename(next);
    setEditing(false);
    requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="folder-banner__name-input"
        value={draft}
        maxLength={120}
        aria-label={t('dashboard.folderView.renameLabel')}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); finish(true); }
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(false); }
        }}
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="folder-banner__name"
      onClick={begin}
      title={t('dashboard.folderView.renameHint')}
    >
      <span className="folder-banner__name-text">{name}</span>
      <Pencil size={14} className="folder-banner__name-icon" aria-hidden="true" />
    </button>
  );
}

export default function FolderBanner({
  folder,
  projectCount,
  onBack,
  onRename,
  onChangeColor,
  onAddExisting,
  canAddExisting,
  actions,
}) {
  const { t } = useLanguage();
  const countLabel = projectCount === 0
    ? t('dashboard.folderView.countNone')
    : t(projectCount === 1 ? 'dashboard.folderView.countOne' : 'dashboard.folderView.countMany', { count: projectCount });

  return (
    <section
      className="section-header folder-banner"
      style={{ '--folder-accent-color': folder.borderColor }}
      aria-labelledby="folder-banner-title"
    >
      <div className="folder-banner__top">
        <button type="button" className="section-header__back folder-banner__back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t('dashboard.folderView.back')}</span>
        </button>
        <nav className="folder-banner__breadcrumb" aria-label={t('dashboard.folderView.breadcrumb')}>
          <ol>
            <li>
              <button type="button" className="folder-banner__crumb" onClick={onBack}>{t('dashboard.folderView.root')}</button>
            </li>
            <li aria-hidden="true" className="folder-banner__separator"><ChevronRight size={13} /></li>
            <li className="folder-banner__crumb-current" aria-current="page">
              <Folder size={13} aria-hidden="true" />
              <span>{folder.name}</span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="folder-banner__body">
        <span className="folder-banner__icon" aria-hidden="true">
          <Folder size={26} />
        </span>
        <div className="section-header__left folder-banner__heading">
          <div className="folder-banner__title-row">
            <h1 className="section-header__title folder-banner__title" id="folder-banner-title">
              <InlineFolderName name={folder.name} onRename={onRename} />
            </h1>
            <FolderColorPicker value={folder.borderColor} onChange={onChangeColor} label={t('dashboard.folderView.colorLabel')} />
          </div>
          <p className="folder-banner__count">{countLabel}</p>
        </div>
        <div className="section-header__actions">
          {canAddExisting && (
            <button type="button" className="dashboard-tool-btn" onClick={onAddExisting}>
              <FolderInput size={14} aria-hidden="true" />
              <span>{t('dashboard.addExisting.button')}</span>
            </button>
          )}
          {actions}
        </div>
      </div>
    </section>
  );
}
