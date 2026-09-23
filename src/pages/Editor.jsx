import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  FilePlus,
  Save,
  FileCode,
  Settings,
  HelpCircle,
  Upload,
} from 'lucide-react';
import useIframeInspector from '../hooks/useIframeInspector';
import SidebarEstilos from '../components/SidebarEstilos';
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
function EditableProjectName({ name, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(name); }, [name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    const trimmed = draft.trim();
    onRename(trimmed || 'Projeto sem título');
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
      title="Clique para renomear"
    >
      {name}
    </span>
  );
}

/* ===== EDITOR HEADER ===== */
function EditorHeader({ project, onRename, onNavigate, onAction, onNewFile, onOpenConfig }) {
  return (
    <header className="editor-header">
      <div className="editor-header__left">
        <button
          className="editor-header__back"
          onClick={onNavigate}
          aria-label="Voltar ao Dashboard"
        >
          <ArrowLeft size={15} />
          <span>Voltar</span>
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
          <span>Novo</span>
        </button>
        <button className="editor-toolbar-btn" onClick={() => onAction('Salvar Como')}>
          <Save size={14} />
          <span>Salvar Como</span>
        </button>
        <button className="editor-toolbar-btn" onClick={() => onAction('Importar CSS')}>
          <FileCode size={14} />
          <span>Importar CSS</span>
        </button>

        <div className="editor-header__separator" />

        <EditableProjectName name={project.name} onRename={onRename} />
      </div>

      <div className="editor-header__right">
        <button className="editor-header__icon-btn" onClick={onOpenConfig} aria-label="Configurações">
          <Settings size={16} />
        </button>
        <button className="editor-header__icon-btn" onClick={() => onAction('Ajuda')} aria-label="Ajuda">
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}

/* ===== DROPZONE / CANVAS =====
   FIX CRÍTICO: O iframe usa initialHtml (ref estável) como srcDoc.
   Mudanças subsequentes de estilo NÃO alteram srcDoc — elas mutam
   diretamente os nós do DOM dentro do contentDocument.
   Assim o iframe nunca é remontado durante a edição.
   ============================================================= */
function EditorCanvas({ initialHtml, onFileSelect, iframeRef, onIframeLoad }) {
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
            Clique aqui para importar seu arquivo HTML
          </span>
          <span className="editor-dropzone__hint">
            ou arraste e solte o arquivo nesta área
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
  addActivity,
  currentTheme,
  onThemeChange,
}) {
  const newFileInputRef = useRef(null);
  const iframeRef = useRef(null);

  /*
   * FIX CRÍTICO: initialHtmlRef armazena o HTML que será usado APENAS
   * para o primeiro srcDoc do iframe. Uma vez carregado, o iframe
   * permanece estável — as edições mutam o DOM diretamente.
   * O auto-save serializa o DOM vivo e persiste sem re-montar o iframe.
   */
  const [initialHtml, setInitialHtml] = useState(() => project.htmlContent);
  const hasLoadedRef = useRef(!!project.htmlContent);

  /* ---- Iframe Inspector Hook ---- */
  const {
    selectedElement,
    selectedTagName,
    computedStyles,
    applyStyle,
    clearSelection,
    serializeDocument,
    injectFont,
    getElementsWithId,
    selectElementById,
    setupIframeListeners,
    assignHoverClass,
    getHoverClass,
    injectHoverStyles,
  } = useIframeInspector(iframeRef);

  /* ---- FIX #1: Editabilidade imediata no primeiro upload ----
     Quando o iframe termina de carregar (incluindo o primeiro upload),
     reinicializa os listeners de inspeção imediatamente. */
  const handleIframeLoad = useCallback(() => {
    setupIframeListeners();
  }, [setupIframeListeners]);

  /* ---- Debounced auto-save ----
     Serializa o DOM vivo do iframe e persiste no projeto.
     IMPORTANTE: onUpdateProject é chamado com um wrapper que NÃO
     re-seta initialHtml, assim o iframe nunca é remontado. */
  const saveTimerRef = useRef(null);
  const onUpdateProjectRef = useRef(onUpdateProject);
  onUpdateProjectRef.current = onUpdateProject;

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const html = serializeDocument();
      if (html) {
        onUpdateProjectRef.current({ htmlContent: html });
      }
    }, 800);
  }, [serializeDocument]);

  /* Callback para SidebarEstilos: notifica que um estilo mudou */
  const handleStyleChange = useCallback(() => {
    debouncedSave();
  }, [debouncedSave]);

  /* Auto-save ao desmontar (sair do editor) */
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const iframe = iframeRef.current;
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
    (actionName) => {
      showToast('Função ainda não implementada');
    },
    [showToast]
  );

  /* Importar novo HTML — este É o caso onde devemos atualizar o srcDoc */
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

  /* Navegar para Configurações como tela */
  const handleOpenConfig = useCallback(() => {
    // Salvar antes de navegar
    const html = serializeDocument();
    if (html) {
      onUpdateProjectRef.current({ htmlContent: html });
    }
    onNavigate('settings');
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
          getHoverClass={getHoverClass}
          injectHoverStyles={injectHoverStyles}
          iframeRef={iframeRef}
        />
      </div>
    </div>
  );
}
