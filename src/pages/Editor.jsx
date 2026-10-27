import EditorHeader from '../components/editor/EditorHeader';
import EditorCanvas from '../components/editor/EditorCanvas';
import useEditorHistory from '../hooks/useEditorHistory';
import useSidebarResize from '../hooks/useSidebarResize';
import { useState, useRef, useCallback, useEffect } from 'react';
import useIframeInspector from '../hooks/useIframeInspector';
import SidebarEstilos from '../components/editor/SidebarEstilos';
import TutorialTour from '../components/editor/TutorialTour';
import { TOUR_STEPS, hasCompletedTutorial, completeTutorial } from '../utils/tutorialTour';
import FaqModal from '../components/ui/FaqModal';
import { useLanguage } from '../context/LanguageContext';
import { isTutorialProject as isTutorial, localizeTutorialHtml } from '../utils/tutorialI18n';

export default function Editor({
  project,
  onUpdateProject,
  onRenameProject,
  onNavigate,
  showToast,
  userProfile = {},
  globalTutorialTips = true,
}) {
  const { t, language } = useLanguage();
  const newFileInputRef = useRef(null);
  const fileReaderRef = useRef(null);
  const iframeRef = useRef(null);
  const pendingDocumentRef = useRef(null);
  const canvasRef = useRef(null);
  const expandButtonRef = useRef(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const isTutorialProject = isTutorial(project);
  const [tourStep, setTourStep] = useState(() => (
    isTutorialProject && globalTutorialTips && project.showTutorialTips !== false && !hasCompletedTutorial() ? 0 : null
  ));
  const [iframeReady, setIframeReady] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(0);

  const [initialHtml, setInitialHtml] = useState(() => isTutorialProject
    ? localizeTutorialHtml(project.htmlContent, language) : project.htmlContent);
  const [hasLoaded, setHasLoaded] = useState(() => !!project.htmlContent);
  const [prevProjectId, setPrevProjectId] = useState(project.id);
  const [prevProjectHtml, setPrevProjectHtml] = useState(project.htmlContent);

  // Sincroniza initialHtml caso o projeto ativo ou seu conteúdo mude externamente
  if (project.id !== prevProjectId || (project.htmlContent && project.htmlContent !== prevProjectHtml && !hasLoaded)) {
    setPrevProjectId(project.id);
    setPrevProjectHtml(project.htmlContent);
    setInitialHtml(isTutorialProject ? localizeTutorialHtml(project.htmlContent, language) : project.htmlContent);
    setHasLoaded(!!project.htmlContent);
  }

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

  const saveTimerRef = useRef(null);
  const onUpdateProjectRef = useRef(onUpdateProject);
  useEffect(() => { onUpdateProjectRef.current = onUpdateProject; }, [onUpdateProject]);
  const restoreDocument = useCallback((html) => {
    clearTimeout(saveTimerRef.current);
    pendingDocumentRef.current = html;
    setIframeReady(false);
    setInitialHtml(html);
    setDocumentVersion(version => version + 1);
    onUpdateProjectRef.current({ htmlContent: html });
  }, []);
  const history = useEditorHistory(iframeRef, serializeDocument, restoreDocument);
  const { undo: handleUndo, redo: handleRedo, recordChange: pushUndoState,
    documentLoaded, reset: resetHistory, translate: translateHistory } = history;

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
      const { downloadCss, generateProjectCss, getCssFileName } = await import('../utils/exportCss');
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
    pendingDocumentRef.current = null;
    setIframeReady(true);
    documentLoaded();
  }, [setupIframeListeners, documentLoaded]);

  const tutorialLanguageRef = useRef(null);
  useEffect(() => {
    if (!isTutorialProject || tutorialLanguageRef.current === language) return;
    const previousLanguage = tutorialLanguageRef.current;
    tutorialLanguageRef.current = language;
    // On first load initialHtml already uses the active language. For a live
    // switch, translate the current document before the autosave can run.
    const html = previousLanguage === null ? initialHtml : localizeTutorialHtml(serializeDocument() || initialHtml, language);
    if (previousLanguage !== null) {
      clearTimeout(saveTimerRef.current);
      pendingDocumentRef.current = html;
      setIframeReady(false);
      setInitialHtml(html);
      translateHistory((state) => localizeTutorialHtml(state, language));
    }
    if (html !== project.htmlContent) onUpdateProjectRef.current({ htmlContent: html });
  }, [isTutorialProject, language, initialHtml, project.htmlContent, serializeDocument, translateHistory]);

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
      fileReaderRef.current?.abort();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = useCallback((file) => {
    if (!/\.html?$/i.test(file.name)) {
      showToast(t('editor.fileReadError'));
      return;
    }
    fileReaderRef.current?.abort();
    const reader = new FileReader();
    fileReaderRef.current = reader;
    reader.onload = (e) => {
      const content = e.target.result;
      if (typeof content !== 'string' || !content.trim()) {
        showToast(t('editor.fileReadError'));
        return;
      }
      clearTimeout(saveTimerRef.current);
      pendingDocumentRef.current = content;
      resetHistory();
      setDocumentVersion(version => version + 1);
      setIframeReady(false);
      setInitialHtml(content);
      setHasLoaded(true);
      onUpdateProjectRef.current({
        htmlFileName: file.name,
        htmlContent: content,
      });
    };
    reader.onerror = () => showToast(t('editor.fileReadError'));
    reader.readAsText(file);
  }, [resetHistory, showToast, t]);

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
    const html = pendingDocumentRef.current || serializeDocument();
    if (html && hasLoaded) {
      onUpdateProjectRef.current({ htmlContent: html });
    }
  }, [serializeDocument, hasLoaded]);

  useEffect(() => {
    window.addEventListener('foux:before-close', flushCurrentDocument);
    return () => {
      window.removeEventListener('foux:before-close', flushCurrentDocument);
    };
  }, [flushCurrentDocument]);

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
    const example = doc.getElementById('titulo-ejercicio') || doc.getElementById('titulo-exercicio') || doc.querySelector('h1, h2, h3, p, div, section') || doc.body;
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

  const { width: sidebarWidth, isResizing: isResizingSidebar, onResizeStart: handleResizeStart } = useSidebarResize();

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
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isTutorialProject={isTutorialProject}
        showTipsLocal={tourStep !== null}
        onToggleTips={toggleLocalTips}
        onExportCss={handleExportCss}
        onExpand={handleExpand}
        hasLoaded={hasLoaded && iframeReady}
        isExporting={isExporting}
      />

      <input
        ref={newFileInputRef}
        type="file"
        accept=".html,.htm"
        style={{ display: 'none' }}
        onChange={handleNewFileChange}
      />

      <div className={`editor-layout ${isResizingSidebar ? 'is-resizing' : ''}`}>
        <EditorCanvas
          documentVersion={documentVersion}
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
          isLocked={!initialHtml || !iframeReady}
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
