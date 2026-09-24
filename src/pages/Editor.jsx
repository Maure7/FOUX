import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  FilePlus,
  Save,
  FileCode,
  Settings,
  HelpCircle,
  Upload,
  User,
} from 'lucide-react';
import useIframeInspector from '../hooks/useIframeInspector';
import SidebarEstilos from '../components/SidebarEstilos';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Dashboard.css';

/* ===== HTML SANITIZER — neutralize navigation inside srcDoc ===== */
function neutralizeHtml(html) {
  const baseTag = '<base target="_blank">';
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  }
  return `<head>${baseTag}</head>${html}`;
}

/* ===== EDITABLE PROJECT NAME ===== */
function EditableProjectName({ name, onRename, t }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [prevName, setPrevName] = useState(name);
  const inputRef = useRef(null);

  if (name !== prevName) {
    setPrevName(name);
    setDraft(name);
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = draft.trim();
    onRename(trimmed || t('editor.untitledProject'));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="editor-header__name-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(name); setIsEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      className="editor-header__project-name"
      onClick={() => setIsEditing(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(true); }}
      title={t('editor.clickToRename')}
    >
      {name}
    </span>
  );
}

/* ===== EDITOR HEADER ===== */
function EditorHeader({ project, onRename, onNavigate, onAction, onNewFile, onOpenConfig, onOpenProfile, userProfile, t }) {
  return (
    <header className="editor-header">
      <div className="editor-header__left">
        <button
          className="editor-header__back"
          onClick={onNavigate}
          aria-label={t('editor.backToDashboard')}
        >
          <ArrowLeft size={15} />
          <span>{t('editor.backToDashboard')}</span>
        </button>

        <span
          className="editor-header__logo"
          onClick={onNavigate}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(); }}
        >
          FOUX
        </span>

        <div className="editor-header__separator" />

        <button className="editor-toolbar-btn" onClick={onNewFile}>
          <FilePlus size={14} />
          <span>{t('editor.newFile')}</span>
        </button>
        <button className="editor-toolbar-btn" onClick={() => onAction('Salvar Como')}>
          <Save size={14} />
          <span>{t('editor.saveAs')}</span>
        </button>
        <button className="editor-toolbar-btn" onClick={() => onAction('Importar CSS')}>
          <FileCode size={14} />
          <span>{t('editor.importCSS')}</span>
        </button>

        <div className="editor-header__separator" />

        <EditableProjectName name={project.name} onRename={onRename} t={t} />
      </div>

      <div className="editor-header__right">
        <button className="editor-header__icon-btn" onClick={onOpenConfig} aria-label={t('settings.title')}>
          <Settings size={16} />
        </button>
        <button className="editor-header__icon-btn" onClick={() => onAction('Ajuda')} aria-label={t('dashboard.help')}>
          <HelpCircle size={16} />
        </button>
        <div
          className="header__avatar-wrapper"
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          aria-label={t('profile.title')}
          title={userProfile?.name || t('profile.title')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpenProfile();
          }}
        >
          <div className="header__avatar-placeholder">
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt="Avatar" className="header__avatar-img" />
            ) : (
              <User size={15} />
            )}
          </div>
          <span className="header__avatar-status" />
        </div>
      </div>
    </header>
  );
}

/* ===== DROPZONE / CANVAS ===== */
function EditorCanvas({ initialHtml, onFileSelect, iframeRef, onIframeLoad, t }) {
  const fileInputRef = useRef(null);

  const safeHtml = useMemo(
    () => (initialHtml ? neutralizeHtml(initialHtml) : null),
    [initialHtml]
  );

  const handleClick = () => {
    if (!initialHtml) fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.html')) onFileSelect(file);
  };

  return (
    <div className="editor-canvas">
      {safeHtml ? (
        <iframe
          ref={iframeRef}
          className="editor-canvas__iframe"
          srcDoc={safeHtml}
          title="HTML Preview Canvas"
          sandbox="allow-same-origin"
          onLoad={onIframeLoad}
        />
      ) : (
        <div
          className="editor-dropzone"
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
        >
          <div className="editor-dropzone__icon-wrapper">
            <Upload size={36} />
          </div>
          <span className="editor-dropzone__title">
            {t('editor.dropzoneTitle')}
          </span>
          <span className="editor-dropzone__hint">
            {t('editor.dropzoneHint')}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            className="editor-dropzone__input"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
}

/* ===== MAIN EDITOR ===== */
export default function Editor({
  project,
  onUpdateProject,
  onRenameProject,
  onNavigate,
  showToast,
  userProfile = {},
}) {
  const { t } = useLanguage();
  const newFileInputRef = useRef(null);
  const iframeRef = useRef(null);

  const [initialHtml, setInitialHtml] = useState(() => project.htmlContent);
  const hasLoadedRef = useRef(!!project.htmlContent);

  /* ---- Iframe Inspector Hook ---- */
  const {
    selectedElement,
    selectedTagName,
    computedStyles,
    applyStyle,
    serializeDocument,
    injectFont,
    getElementsWithId,
    selectElementById,
    setupIframeListeners,
    assignHoverClass,
    injectHoverStyles,
  } = useIframeInspector(iframeRef);

  const handleIframeLoad = useCallback(() => {
    setupIframeListeners();
  }, [setupIframeListeners]);

  /* ---- Debounced auto-save ---- */
  const saveTimerRef = useRef(null);
  const onUpdateProjectRef = useRef(onUpdateProject);

  useEffect(() => {
    onUpdateProjectRef.current = onUpdateProject;
  }, [onUpdateProject]);

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const html = serializeDocument();
      if (html) {
        onUpdateProjectRef.current({ htmlContent: html });
      }
    }, 800);
  }, [serializeDocument]);

  const handleStyleChange = useCallback(() => {
    debouncedSave();
  }, [debouncedSave]);

  useEffect(() => {
    const iframe = iframeRef.current;
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (iframe?.contentDocument) {
        try {
          const doc = iframe.contentDocument;
          const els = doc.querySelectorAll('[data-foux-selected],[data-foux-hovered]');
          els.forEach((el) => {
            el.style.outline = '';
            el.style.outlineOffset = '';
            el.removeAttribute('data-foux-selected');
            el.removeAttribute('data-foux-hovered');
          });
          const html = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
          onUpdateProjectRef.current({ htmlContent: html });
        } catch {
          // iframe may already be detached
        }
      }
    };
  }, []);

  const handleToolbarAction = useCallback(
    () => {
      showToast(t('common.featureComingSoon'));
    },
    [showToast, t]
  );

  const handleFileSelect = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setInitialHtml(content);
      hasLoadedRef.current = true;
      onUpdateProjectRef.current({
        htmlFileName: file.name,
        htmlContent: content,
      });
    };
    reader.readAsText(file);
  }, []);

  const handleNewFile = useCallback(() => {
    newFileInputRef.current?.click();
  }, []);

  const handleNewFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const handleRename = useCallback((newName) => {
    if (onRenameProject) {
      onRenameProject(newName);
    } else {
      onUpdateProjectRef.current({ name: newName });
    }
  }, [onRenameProject]);

  const handleOpenConfig = useCallback(() => {
    const html = serializeDocument();
    if (html) {
      onUpdateProjectRef.current({ htmlContent: html });
    }
    onNavigate('settings');
  }, [serializeDocument, onNavigate]);

  const handleOpenProfile = useCallback(() => {
    const html = serializeDocument();
    if (html) {
      onUpdateProjectRef.current({ htmlContent: html });
    }
    onNavigate('profile');
  }, [serializeDocument, onNavigate]);

  return (
    <div className="editor-shell">
      <EditorHeader
        project={project}
        onRename={handleRename}
        onNavigate={() => onNavigate('dashboard')}
        onAction={handleToolbarAction}
        onNewFile={handleNewFile}
        onOpenConfig={handleOpenConfig}
        onOpenProfile={handleOpenProfile}
        userProfile={userProfile}
        t={t}
      />

      <input
        ref={newFileInputRef}
        type="file"
        accept=".html"
        style={{ display: 'none' }}
        onChange={handleNewFileChange}
      />

      <div className="editor-layout">
        <EditorCanvas
          initialHtml={initialHtml}
          onFileSelect={handleFileSelect}
          iframeRef={iframeRef}
          onIframeLoad={handleIframeLoad}
          t={t}
        />
        <SidebarEstilos
          isLocked={!initialHtml}
          selectedElement={selectedElement}
          selectedTagName={selectedTagName}
          computedStyles={computedStyles}
          applyStyle={applyStyle}
          injectFont={injectFont}
          getElementsWithId={getElementsWithId}
          selectElementById={selectElementById}
          onStyleChange={handleStyleChange}
          assignHoverClass={assignHoverClass}
          injectHoverStyles={injectHoverStyles}
        />
      </div>
    </div>
  );
}
