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
import ModalConfirm from '../components/ui/ModalConfirm';
import CanvasOverlay from '../components/editor/CanvasOverlay';
import EyedropperOverlay from '../components/editor/EyedropperOverlay';
import useEyedropper, { EyedropperContext } from '../hooks/useEyedropper';
import ChallengeHud from '../components/editor/challenges/ChallengeHud';
import ChallengeVictory from '../components/editor/challenges/ChallengeVictory';
import useChallengeMode from '../hooks/useChallengeMode';
import { findTarget } from '../challenges/engine';
import { useLanguage } from '../context/LanguageContext';
import { isTutorialProject as isTutorial, localizeTutorialHtml } from '../utils/tutorialI18n';
import { describeElement, historyActionLabel } from '../utils/historyLabels';
import '../styles/learning.css';
import '../styles/editor-actions.css';
import '../styles/color-tools.css';

const AUTOSAVE_DELAY_MS = 800;

export default function Editor({
  project,
  onUpdateProject,
  onRenameProject,
  onNavigate,
  onGoHome,
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
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const openFaq = useCallback(() => setIsFaqOpen(true), []);
  const closeFaq = useCallback(() => setIsFaqOpen(false), []);
  const isTutorialProject = isTutorial(project);
  const [tourStep, setTourStep] = useState(() => (
    isTutorialProject && globalTutorialTips && project.showTutorialTips !== false && !hasCompletedTutorial() ? 0 : null
  ));
  const [iframeReady, setIframeReady] = useState(false);
  const [documentVersion, setDocumentVersion] = useState(0);
  // Conta cada documento carregado no iframe (inclui a troca de idioma, que não muda documentVersion).
  const [loadCount, setLoadCount] = useState(0);
  // Área do box model apontada pelos controles de espaçamento ('margin' | 'padding').
  const [boxFocus, setBoxFocus] = useState(null);
  // Incrementado ao restaurar o elemento, para os controles com estado se ressincronizarem.
  const [elementRevision, setElementRevision] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  const [initialHtml, setInitialHtml] = useState(() => isTutorialProject
    ? localizeTutorialHtml(project.htmlContent, language) : project.htmlContent);
  // O App usa o id do projeto como key do <Editor> e só esta tela grava htmlContent,
  // então o HTML inicial nunca precisa ser ressincronizado a partir das props.
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
    restoreAll,
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
    // O canvas fixo também serve de alternativa quando a tela cheia nativa não existe.
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
    setLoadCount((count) => count + 1);
    setIframeReady(true);
    documentLoaded();
    checkChallenge();
  }, [setupIframeListeners, documentLoaded, checkChallenge]);

  const tutorialLanguageRef = useRef(null);
  useEffect(() => {
    if (!isTutorialProject || tutorialLanguageRef.current === language) return;
    const previousLanguage = tutorialLanguageRef.current;
    tutorialLanguageRef.current = language;
    // Na primeira carga o initialHtml já está no idioma ativo. Numa troca ao vivo,
    // traduz o documento atual antes que o salvamento automático rode.
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

  // Serializar o documento inteiro é caro (fontes em base64) e regrava a lista de projetos,
  // que no desktop ainda cruza um IPC síncrono; o autosave espera uma pausa na edição em
  // vez de rodar durante um arraste.
  const debouncedSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const html = serializeDocument();
      if (html && hasLoaded) onUpdateProjectRef.current({ htmlContent: html });
    }, AUTOSAVE_DELAY_MS);
  }, [serializeDocument, hasLoaded]);

  // Chamado antes de cada edição chegar ao documento; ver useEditorHistory.recordChange.
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

  const openClearConfirm = useCallback(() => setIsClearConfirmOpen(true), []);
  const closeClearConfirm = useCallback(() => setIsClearConfirmOpen(false), []);

  // Um único passo no histórico, para o Ctrl+Z trazer a página inteira de volta.
  const handleClearCanvas = useCallback(() => {
    if (!recordAction({ labelKey: 'history.props.clearCanvas' }, restoreAll)) {
      showToast(t('editor.clearCanvas.nothing'));
      return;
    }
    setElementRevision((revision) => revision + 1);
    debouncedSave();
    checkChallenge();
    showToast(t('editor.clearCanvas.success'));
  }, [recordAction, restoreAll, debouncedSave, checkChallenge, showToast, t]);

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

  // Aqui o iframe já está sendo desmontado; só cancela o trabalho pendente.
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

  // Sair do editor (ou fechar a janela) desmonta o iframe, então o documento vivo
  // é salvo antes. Um documento ainda carregando vem de pendingDocumentRef, não
  // do about:blank provisório.
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

  const handleGoHome = useCallback(() => {
    flushCurrentDocument();
    onGoHome();
  }, [flushCurrentDocument, onGoHome]);

  // Concluir ou dispensar o tour impede que ele abra sozinho nas próximas visitas.
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
  // Conta-gotas: os ColorFields pedem a cor, a camada sobre o canvas amostra o documento do aluno.
  const eyedropper = useEyedropper();

  return (
    <div className="editor-shell">
      <EditorHeader
        projectName={project.name}
        onRename={handleRename}
        onNavigate={handleBackToDashboard}
        onGoHome={handleGoHome}
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
        onClearCanvas={openClearConfirm}
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

      <EyedropperContext.Provider value={eyedropper.context}>
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

          {/* O iframe engoliria os eventos de mousemove enquanto a sidebar é redimensionada. */}
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
            documentKey={loadCount}
            onRestoreElement={handleRestoreElement}
            onBoxFocus={setBoxFocus}
            projectId={project.id}
          />
        </div>
        {eyedropper.active && iframeReady && !isPreview && (
          <EyedropperOverlay iframeRef={iframeRef} onPick={eyedropper.pick} onCancel={eyedropper.cancel} t={t} />
        )}
      </EyedropperContext.Provider>

      <FaqModal isOpen={isFaqOpen} onClose={closeFaq} t={t} />
      <ModalConfirm
        isOpen={isClearConfirmOpen}
        onClose={closeClearConfirm}
        onConfirm={handleClearCanvas}
        title={t('editor.clearCanvas.title')}
        message={t('editor.clearCanvas.message')}
        confirmLabel={t('editor.clearCanvas.confirm')}
        cancelLabel={t('common.cancel')}
        variant="compact"
      />
      <ChallengeVictory result={challengeResult} onClose={dismissChallengeResult} t={t} />
      {tourStep !== null && iframeReady && hasLoaded && <TutorialTour stepIndex={tourStep} onStepChange={setTourStep} onFinish={finishTour} />}
    </div>
  );
}
