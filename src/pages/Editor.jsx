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
import CanvasOverlay from '../components/editor/CanvasOverlay';
import ChallengeHud from '../components/editor/challenges/ChallengeHud';
import ChallengeVictory from '../components/editor/challenges/ChallengeVictory';
import useChallengeMode from '../hooks/useChallengeMode';
import { findTarget } from '../challenges/engine';
import { useLanguage } from '../context/LanguageContext';
import { isTutorialProject as isTutorial, localizeTutorialHtml } from '../utils/tutorialI18n';
import { describeElement, historyActionLabel } from '../utils/historyLabels';
import '../styles/learning.css';

const AUTOSAVE_DELAY_MS = 800;

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
  const openFaq = useCallback(() => setIsFaqOpen(true), []);
  const closeFaq = useCallback(() => setIsFaqOpen(false), []);
  const isTutorialProject = isTutorial(project);
  const [tourStep, setTourStep] = useState(() => (
    isTutorialProject && globalTutorialTips && project.showTutorialTips !== false && !hasCompletedTutorial() ? 0 : null
  ));
  const [iframeReady, setIframeReady] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(0);
  // Which box-model area the spacing controls are pointing at ('margin' | 'padding').
  const [boxFocus, setBoxFocus] = useState(null);
  // Bumped when the selected element is restored, so stateful controls resync.
  const [elementRevision, setElementRevision] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  const [initialHtml, setInitialHtml] = useState(() => isTutorialProject
    ? localizeTutorialHtml(project.htmlContent, language) : project.htmlContent);
  // App keys <Editor> by project id, and only this screen writes htmlContent,
  // so the initial project HTML never needs to be re-synchronized from props.
  const [hasLoaded, setHasLoaded] = useState(() => !!project.htmlContent);

  const {
    selectedElement,
    computedStyles,
    applyStyle,
    serializeDocument,
    injectFont,
    getImportedFonts,
    getElementsWithId,
    selectElementById,
    setupIframeListeners,
    assignHoverClass,
    injectHoverStyles,
    getHoverRules,
    setPreviewMode,
    restoreSelected,
  } = useIframeInspector(iframeRef);
  const {
    session: challengeSession, result: challengeResult, start: startChallenges, stop: stopChallenges,
    skip: skipChallenge, scheduleCheck: checkChallenge, dismissResult: dismissChallengeResult,
  } = useChallengeMode({ iframeRef, getHoverRules });

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
  const { undo: handleUndo, redo: handleRedo, recordChange: pushUndoState, recordAction,
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
    checkChallenge();
  }, [setupIframeListeners, documentLoaded, checkChallenge]);

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

  // On desktop every save is a synchronous write to disk, so it waits for a
  // pause in editing instead of running during a drag.
  const debouncedSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const html = serializeDocument();
      if (html && hasLoaded) onUpdateProjectRef.current({ htmlContent: html });
    }, AUTOSAVE_DELAY_MS);
  }, [serializeDocument, hasLoaded]);

  // Called before each edit reaches the document; see useEditorHistory.recordChange.
  const handleStyleChange = useCallback((meta) => {
    pushUndoState(meta);
    debouncedSave();
    checkChallenge();
  }, [debouncedSave, pushUndoState, checkChallenge]);

  const handleRestoreElement = useCallback(() => {
    const meta = { labelKey: 'history.props.restore', target: describeElement(selectedElement) };
    if (!recordAction(meta, restoreSelected)) {
      showToast(t('sidebar.restoreNothing'));
      return;
    }
    setElementRevision((revision) => revision + 1);
    debouncedSave();
    checkChallenge();
    showToast(t('sidebar.restoreSuccess'));
  }, [selectedElement, recordAction, restoreSelected, debouncedSave, checkChallenge, showToast, t]);

  const toggleChallenges = useCallback(() => {
    if (challengeSession) {
      stopChallenges();
      return;
    }
    if (tourStep !== null) return;
    if (!startChallenges()) showToast(t('challenges.noneLeft'));
  }, [challengeSession, stopChallenges, startChallenges, tourStep, showToast, t]);

  const highlightChallengeTarget = useCallback(() => {
    const challenge = challengeSession?.queue[0];
    const target = challenge && findTarget(iframeRef.current?.contentDocument, challenge);
    if (!target) return;
    selectElementById(target.id);
    setFlashKey((key) => key + 1);
  }, [challengeSession, selectElementById]);

  // The iframe is already being torn down here; only cancel pending work.
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

  // Leaving the editor (or closing the window) unmounts the iframe, so the
  // live document is persisted first. A document still loading is taken from
  // pendingDocumentRef instead of the about:blank placeholder.
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
        projectName={project.name}
        onRename={handleRename}
        onNavigate={handleBackToDashboard}
        onOpenFaq={openFaq}
        onNewFile={handleNewFile}
        onOpenConfig={handleOpenConfig}
        onOpenProfile={handleOpenProfile}
        userProfile={userProfile}
        t={t}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoLabel={history.canUndo ? historyActionLabel('undo', history.undoMeta, t) : undefined}
        redoLabel={history.canRedo ? historyActionLabel('redo', history.redoMeta, t) : undefined}
        isTutorialProject={isTutorialProject}
        showTipsLocal={tourStep !== null}
        onToggleTips={toggleLocalTips}
        challengeActive={!!challengeSession}
        onToggleChallenges={toggleChallenges}
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

        <CanvasOverlay
          iframeRef={iframeRef}
          element={selectedElement}
          boxMode={boxFocus}
          flashKey={flashKey}
          values={computedStyles}
          t={t}
        />

        {challengeSession && (
          <ChallengeHud
            session={challengeSession}
            language={language}
            onHighlight={highlightChallengeTarget}
            onSkip={skipChallenge}
            onQuit={stopChallenges}
            t={t}
          />
        )}

        {/* The iframe would swallow mousemove events while the sidebar is resized. */}
        {isResizingSidebar && <div className="editor-resize-glass-overlay" />}

        <SidebarEstilos
          tourStep={tourStep === null ? null : TOUR_STEPS[tourStep]}
          isLocked={!initialHtml || !iframeReady}
          selectedElement={selectedElement}
          computedStyles={computedStyles}
          applyStyle={applyStyle}
          injectFont={injectFont}
          getImportedFonts={getImportedFonts}
          getElementsWithId={getElementsWithId}
          selectElementById={selectElementById}
          onStyleChange={handleStyleChange}
          assignHoverClass={assignHoverClass}
          injectHoverStyles={injectHoverStyles}
          getHoverRules={getHoverRules}
          width={sidebarWidth}
          isResizing={isResizingSidebar}
          onResizeStart={handleResizeStart}
          revision={elementRevision}
          onRestoreElement={handleRestoreElement}
          onBoxFocus={setBoxFocus}
        />
      </div>

      <FaqModal isOpen={isFaqOpen} onClose={closeFaq} t={t} />
      <ChallengeVictory result={challengeResult} onClose={dismissChallengeResult} t={t} />
      {tourStep !== null && iframeReady && hasLoaded && <TutorialTour stepIndex={tourStep} onStepChange={setTourStep} onFinish={finishTour} />}
    </div>
  );
}
