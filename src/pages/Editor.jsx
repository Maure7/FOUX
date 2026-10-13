import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  FilePlus,
  Download,
  Maximize,
  Settings,
  HelpCircle,
  Upload,
  User,
  Undo2,
  Redo2,
  Lightbulb,
  LightbulbOff,
} from 'lucide-react';
import useIframeInspector from '../hooks/useIframeInspector';
import SidebarEstilos from '../components/SidebarEstilos';
import TutorialTour from '../components/TutorialTour';
import { TOUR_STEPS, hasCompletedTutorial, completeTutorial } from '../utils/tutorialTour';
import FaqModal from '../components/FaqModal';
import { useLanguage } from '../context/LanguageContext';
import { TUTORIAL_PROJECT_NAME } from '../utils/tutorialTemplate';
import { downloadCss, generateProjectCss, getCssFileName } from '../utils/exportCss';
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

/* ===== EDITOR HEADER with Undo/Redo and Tutorial Toggle ===== */
function EditorHeader({
  project, onRename, onNavigate, onOpenFaq, onNewFile,
  onOpenConfig, onOpenProfile, userProfile, t,
  canUndo, canRedo, onUndo, onRedo,
  isTutorialProject, showTipsLocal, onToggleTips,
  onExportCss, onExpand, hasLoaded, isExporting,
}) {
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
          aria-label={t('editor.backToDashboard')}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(); }}
        >
          FOUX
        </span>

        <div className="editor-header__separator" />

        <button className="editor-toolbar-btn" onClick={onNewFile}>
          <FilePlus size={14} />
          <span>{t('editor.newFile')}</span>
        </button>
        <button
          className="editor-toolbar-btn"
          onClick={onExportCss}
          disabled={!hasLoaded || isExporting}
          title={t('editor.exportCSS')}
          aria-label={t('editor.exportCSS')}
          aria-busy={isExporting}
        >
          <Download size={14} />
          <span>{t('editor.exportCSS')}</span>
        </button>

        <div className="editor-header__separator" />

        <EditableProjectName name={project.name} onRename={onRename} t={t} />

        {/* ── Undo / Redo ── */}
        <div className="editor-header__separator" />
        <button
          className="editor-header__icon-btn editor-undo-redo-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('editor.undo')}
          title={t('editor.undo')}
        >
          <Undo2 size={16} />
        </button>
        <button
          className="editor-header__icon-btn editor-undo-redo-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t('editor.redo')}
          title={t('editor.redo')}
        >
          <Redo2 size={16} />
        </button>

        {/* ── Botão de Dicas do Tutorial (exclusivo para TUTORIAL, entre Undo/Redo e Configurações) ── */}
        {isTutorialProject && (
          <>
            <div className="editor-header__separator" />
            <button
              className={`editor-header__tutorial-btn ${showTipsLocal ? 'is-active' : ''}`}
              onClick={onToggleTips}
              title={showTipsLocal ? t('tour.close') : t('tour.restart')}
              aria-label={showTipsLocal ? t('tour.close') : t('tour.restart')}
            >
              {showTipsLocal ? (
                <Lightbulb size={14} className="editor-header__tutorial-icon" />
              ) : (
                <LightbulbOff size={14} className="editor-header__tutorial-icon" />
              )}
              <span className="editor-header__tutorial-text">
                {t('tour.button')}
              </span>
            </button>
          </>
        )}
      </div>

      <div className="editor-header__right">
        <button
          className="editor-header__icon-btn"
          onClick={onExpand}
          disabled={!hasLoaded}
          aria-label={t('editor.fullscreen')}
          title={t('editor.fullscreenHint')}
        >
          <Maximize size={16} />
        </button>
        <button className="editor-header__icon-btn" onClick={onOpenConfig} aria-label={t('settings.title')}>
          <Settings size={16} />
        </button>
        <button className="editor-header__icon-btn" onClick={onOpenFaq} aria-label={t('dashboard.help')} title={t('dashboard.help')}>
          <HelpCircle size={16} />
        </button>
        <div
          className="header__avatar-wrapper"
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          aria-label={t('profile.title')}
          title={t('profile.title')}
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
function EditorCanvas({ initialHtml, onFileSelect, iframeRef, onIframeLoad, canvasRef, isPreview, t }) {
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
    <div ref={canvasRef} className={`editor-canvas${isPreview ? ' editor-canvas--expanded' : ''}`}>
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
  globalTutorialTips = true,
}) {
  const { t } = useLanguage();
  const newFileInputRef = useRef(null);
  const iframeRef = useRef(null);
  const canvasRef = useRef(null);
  const expandButtonRef = useRef(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const isTutorialProject = project.name === TUTORIAL_PROJECT_NAME;
  const [tourStep, setTourStep] = useState(() => (
    isTutorialProject && globalTutorialTips && project.showTutorialTips !== false && !hasCompletedTutorial() ? 0 : null
  ));
  const [iframeReady, setIframeReady] = useState(false);

  const [initialHtml, setInitialHtml] = useState(() => project.htmlContent);
  const [hasLoaded, setHasLoaded] = useState(() => !!project.htmlContent);
  const [prevProjectId, setPrevProjectId] = useState(project.id);
  const [prevProjectHtml, setPrevProjectHtml] = useState(project.htmlContent);

  // Sincroniza initialHtml caso o projeto ativo ou seu conteúdo mude externamente
  if (project.id !== prevProjectId || (project.htmlContent && project.htmlContent !== prevProjectHtml && !hasLoaded)) {
    setPrevProjectId(project.id);
    setPrevProjectHtml(project.htmlContent);
    setInitialHtml(project.htmlContent);
    setHasLoaded(!!project.htmlContent);
  }

  /* ===== UNDO / REDO STACK with Persistent Hover Snapshotting ===== */
  const [pastStates, setPastStates] = useState([]);
  const [futureStates, setFutureStates] = useState([]);
  const isUndoRedoRef = useRef(false);
  const currentDocSnapshotRef = useRef(null);
  const isScrubbingRef = useRef(false);
  const scrubTimerRef = useRef(null);

  // Reset undo/redo when project changes
  const [prevUndoProjectId, setPrevUndoProjectId] = useState(project.id);
  if (project.id !== prevUndoProjectId) {
    setPrevUndoProjectId(project.id);
    setPastStates([]);
    setFutureStates([]);
  }

  useEffect(() => {
    currentDocSnapshotRef.current = null;
  }, [project.id]);

  const pushUndoState = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;
    if (!doc.body || !doc.body.innerHTML.trim()) return;

    // Se não estiver em um gesto contínuo, salva o snapshot anterior
    if (!isScrubbingRef.current) {
      const snapToSave = currentDocSnapshotRef.current || doc.documentElement.outerHTML;
      setPastStates((prev) => [...prev.slice(-50), snapToSave]);
      setFutureStates([]);
      isScrubbingRef.current = true;
    }

    if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
    scrubTimerRef.current = setTimeout(() => {
      isScrubbingRef.current = false;
      if (iframeRef.current?.contentDocument?.documentElement) {
        currentDocSnapshotRef.current = iframeRef.current.contentDocument.documentElement.outerHTML;
      }
    }, 350);
  }, []);

  const handleUndo = useCallback(() => {
    if (pastStates.length === 0) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const currentSnapshot = iframe.contentDocument.documentElement.outerHTML;
    const previousSnapshot = pastStates[pastStates.length - 1];

    isUndoRedoRef.current = true;
    setPastStates((prev) => prev.slice(0, -1));
    setFutureStates((prev) => [currentSnapshot, ...prev]);
    currentDocSnapshotRef.current = previousSnapshot;

    // Rewrite iframe
    setInitialHtml(`<!DOCTYPE html>\n${previousSnapshot}`);
    setTimeout(() => { isUndoRedoRef.current = false; }, 300);
  }, [pastStates]);

  const handleRedo = useCallback(() => {
    if (futureStates.length === 0) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const currentSnapshot = iframe.contentDocument.documentElement.outerHTML;
    const nextSnapshot = futureStates[0];

    isUndoRedoRef.current = true;
    setFutureStates((prev) => prev.slice(1));
    setPastStates((prev) => [...prev, currentSnapshot]);
    currentDocSnapshotRef.current = nextSnapshot;

    // Rewrite iframe
    setInitialHtml(`<!DOCTYPE html>\n${nextSnapshot}`);
    setTimeout(() => { isUndoRedoRef.current = false; }, 300);
  }, [futureStates]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e) => {
      if (document.querySelector('.tutorial-tour[open]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

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
    getHoverRules,
    setPreviewMode,
  } = useIframeInspector(iframeRef);

  const handleExpand = useCallback((event) => {
    if (!iframeRef.current?.contentDocument?.body || !hasLoaded) return;
    expandButtonRef.current = event.currentTarget;
    setPreviewMode(true);
    setIsPreview(true);
    // The fixed canvas also provides a fallback when native fullscreen is unavailable.
    const request = canvasRef.current?.requestFullscreen?.();
    request?.catch(() => {});
    iframeRef.current.focus();
  }, [hasLoaded, setPreviewMode]);

  useEffect(() => {
    if (!isPreview) return;
    const canvas = canvasRef.current;
    const iframe = iframeRef.current;
    let iframeDoc;
    const finishPreview = () => {
      setPreviewMode(false);
      setIsPreview(false);
      expandButtonRef.current?.focus();
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (document.fullscreenElement === canvas) {
        document.exitFullscreen().catch(() => {});
      } else {
        finishPreview();
      }
    };
    const onFullscreenChange = () => {
      if (document.fullscreenElement !== canvas) finishPreview();
    };
    const bindIframeKeys = () => {
      iframeDoc?.removeEventListener('keydown', onKeyDown);
      iframeDoc = iframe?.contentDocument;
      iframeDoc?.addEventListener('keydown', onKeyDown);
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    iframe?.addEventListener('load', bindIframeKeys);
    bindIframeKeys();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      iframe?.removeEventListener('load', bindIframeKeys);
      iframeDoc?.removeEventListener('keydown', onKeyDown);
      setPreviewMode(false);
      if (document.fullscreenElement === canvas) document.exitFullscreen().catch(() => {});
    };
  }, [isPreview, setPreviewMode]);

  const handleExportCss = useCallback(async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!hasLoaded || !doc?.body || isExporting) return;
    setIsExporting(true);
    try {
      const css = await generateProjectCss(doc);
      downloadCss(css, getCssFileName(project.name));
      showToast(t('editor.exportSuccess'));
    } catch {
      showToast(t('editor.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [hasLoaded, isExporting, project.name, showToast, t]);

  const handleIframeLoad = useCallback(() => {
    setupIframeListeners();
    setIframeReady(true);
    if (iframeRef.current?.contentDocument?.documentElement) {
      currentDocSnapshotRef.current = iframeRef.current.contentDocument.documentElement.outerHTML;
    }
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
      // Salva apenas se houver documento válido e o projeto já tiver arquivo carregado
      if (html && hasLoaded) {
        onUpdateProjectRef.current({ htmlContent: html });
      }
    }, 800);
  }, [serializeDocument, hasLoaded]);

  const handleStyleChange = useCallback(() => {
    pushUndoState();
    debouncedSave();
  }, [debouncedSave, pushUndoState]);

  // Cleanup limpo: cancela timers pendentes sem ler do iframe em processo de desmontagem
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setInitialHtml(content);
      setHasLoaded(true);
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

  // Salva de forma segura antes de navegar
  const flushCurrentDocument = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const html = serializeDocument();
    if (html && hasLoaded) {
      onUpdateProjectRef.current({ htmlContent: html });
    }
  }, [serializeDocument, hasLoaded]);

  const handleOpenConfig = useCallback(() => {
    flushCurrentDocument();
    onNavigate('settings');
  }, [flushCurrentDocument, onNavigate]);

  const handleOpenProfile = useCallback(() => {
    flushCurrentDocument();
    onNavigate('profile');
  }, [flushCurrentDocument, onNavigate]);

  const handleBackToDashboard = useCallback(() => {
    flushCurrentDocument();
    onNavigate('dashboard');
  }, [flushCurrentDocument, onNavigate]);

  /* Completion and dismissal both suppress automatic tours on later visits. */
  const finishTour = useCallback(() => {
    completeTutorial();
    setTourStep(null);
    onUpdateProjectRef.current({ showTutorialTips: false });
  }, []);
  const selectTourExample = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    const example = doc.getElementById('titulo-exercicio') || doc.querySelector('h1, h2, h3, p, div, section') || doc.body;
    if (example.id) selectElementById(example.id);
    else example.click();
  }, [selectElementById]);
  const toggleLocalTips = useCallback(() => {
    if (tourStep !== null) return finishTour();
    selectTourExample();
    setTourStep(0);
  }, [tourStep, finishTour, selectTourExample]);

  useEffect(() => {
    if (tourStep !== null && iframeReady && !selectedElement) selectTourExample();
  }, [tourStep, iframeReady, selectedElement, selectTourExample]);

  /* ===== RESIZABLE SIDEBAR ===== */
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('foux_sidebar_width');
      const parsed = parseInt(saved, 10);
      if (Number.isFinite(parsed) && parsed >= 300 && parsed <= 700) {
        return parsed;
      }
    } catch { /* Use the default width if storage is unavailable. */ }
    return 340;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const isResizingSidebarRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(340);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingSidebarRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    setIsResizingSidebar(true);

    const handleMouseMove = (moveEvent) => {
      if (!isResizingSidebarRef.current) return;
      const delta = startXRef.current - moveEvent.clientX;
      const proposedWidth = startWidthRef.current + delta;
      const minW = 300;
      const maxW = Math.min(600, Math.floor(window.innerWidth * 0.45));
      const clamped = Math.max(minW, Math.min(maxW, proposedWidth));
      setSidebarWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isResizingSidebarRef.current) {
        isResizingSidebarRef.current = false;
        setIsResizingSidebar(false);
        setSidebarWidth((finalW) => {
          try {
            localStorage.setItem('foux_sidebar_width', String(finalW));
          } catch { /* Keep the current width when storage is unavailable. */ }
          return finalW;
        });
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  return (
    <div className="editor-shell">
      <EditorHeader
        project={project}
        onRename={handleRename}
        onNavigate={handleBackToDashboard}
        onOpenFaq={() => setIsFaqOpen(true)}
        onNewFile={handleNewFile}
        onOpenConfig={handleOpenConfig}
        onOpenProfile={handleOpenProfile}
        userProfile={userProfile}
        t={t}
        canUndo={pastStates.length > 0}
        canRedo={futureStates.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isTutorialProject={isTutorialProject}
        showTipsLocal={tourStep !== null}
        onToggleTips={toggleLocalTips}
        onExportCss={handleExportCss}
        onExpand={handleExpand}
        hasLoaded={hasLoaded}
        isExporting={isExporting}
      />

      <input
        ref={newFileInputRef}
        type="file"
        accept=".html"
        style={{ display: 'none' }}
        onChange={handleNewFileChange}
      />

      <div className={`editor-layout ${isResizingSidebar ? 'is-resizing' : ''}`}>
        <EditorCanvas
          initialHtml={initialHtml}
          onFileSelect={handleFileSelect}
          iframeRef={iframeRef}
          onIframeLoad={handleIframeLoad}
          canvasRef={canvasRef}
          isPreview={isPreview}
          t={t}
        />

        {/* Overlay transparente para evitar que o iframe capture mousemove durante o redimensionamento */}
        {isResizingSidebar && <div className="editor-resize-glass-overlay" />}

        <SidebarEstilos
          tourStep={tourStep === null ? null : TOUR_STEPS[tourStep]}
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
          getHoverRules={getHoverRules}
          width={sidebarWidth}
          isResizing={isResizingSidebar}
          onResizeStart={handleResizeStart}
        />
      </div>

      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} t={t} />
      {tourStep !== null && iframeReady && hasLoaded && <TutorialTour stepIndex={tourStep} onStepChange={setTourStep} onFinish={finishTour} />}
    </div>
  );
}
