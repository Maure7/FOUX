import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  FilePlus,
  Save,
  FileCode,
  Settings,
  HelpCircle,
  Upload,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Square,
  Maximize,
} from 'lucide-react';
import '../styles/Dashboard.css';

/* ===== HTML SANITIZER — neutralize navigation inside srcDoc ===== */
function neutralizeHtml(html) {
  // Inject <base target="_blank"> so all links target a popup.
  // Since the sandbox does NOT include allow-popups, the browser
  // silently blocks every link click — zero navigation side-effects.
  const baseTag = '<base target="_blank">';
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  }
  // No <head> or <html> — prepend
  return `<head>${baseTag}</head>${html}`;
}

/* ===== EDITABLE PROJECT NAME ===== */
function EditableProjectName({ name, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(name);
  }, [name]);

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
          if (e.key === 'Escape') {
            setDraft(name);
            setIsEditing(false);
          }
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
      onKeyDown={(e) => {
        if (e.key === 'Enter') setIsEditing(true);
      }}
      title="Clique para renomear"
    >
      {name}
    </span>
  );
}

/* ===== EDITOR HEADER ===== */
function EditorHeader({ project, onRename, onNavigate, onAction, onNewFile }) {
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') onNavigate();
          }}
        >
          FOUX
        </span>

        <div className="editor-header__separator" />

        {/* Toolbar actions */}
        <button className="editor-toolbar-btn" onClick={onNewFile}>
          <FilePlus size={14} />
          <span>Novo</span>
        </button>
        <button className="editor-toolbar-btn" onClick={() => onAction('Salvar')}>
          <Save size={14} />
          <span>Salvar</span>
        </button>
        <button className="editor-toolbar-btn" onClick={() => onAction('Importar CSS')}>
          <FileCode size={14} />
          <span>Importar CSS</span>
        </button>

        <div className="editor-header__separator" />

        {/* Editable project name */}
        <EditableProjectName name={project.name} onRename={onRename} />
      </div>

      <div className="editor-header__right">
        <button className="editor-header__icon-btn" onClick={() => onAction('Configurações')} aria-label="Configurações">
          <Settings size={16} />
        </button>
        <button className="editor-header__icon-btn" onClick={() => onAction('Ajuda')} aria-label="Ajuda">
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}

/* ===== DROPZONE / CANVAS ===== */
function EditorCanvas({ htmlContent, htmlFileName, onFileSelect }) {
  const fileInputRef = useRef(null);

  // Neutralize the HTML so links/forms can't navigate
  const safeHtml = useMemo(
    () => (htmlContent ? neutralizeHtml(htmlContent) : null),
    [htmlContent]
  );

  const handleClick = () => {
    if (!htmlContent) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.html')) {
      onFileSelect(file);
    }
  };

  return (
    <div className="editor-canvas">
      {safeHtml ? (
        /* ---- Isolated HTML preview via sandboxed iframe ---- */
        <iframe
          className="editor-canvas__iframe"
          srcDoc={safeHtml}
          title="HTML Preview Canvas"
          sandbox="allow-same-origin"
        />
      ) : (
        /* ---- Dropzone state ---- */
        <div
          className="editor-dropzone"
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleClick();
          }}
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

/* ===== COLLAPSIBLE SECTION ===== */
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="sidebar-section">
      <button
        className="sidebar-section__header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="sidebar-section__header-left">
          {Icon && <Icon size={14} className="sidebar-section__icon" />}
          <span className="sidebar-section__title">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isOpen && (
        <div className="sidebar-section__body">
          {children}
        </div>
      )}
    </div>
  );
}

/* ===== SIDEBAR STYLES PANEL ===== */
function StylesSidebar({ isLocked, onInteract }) {
  const [activeTab, setActiveTab] = useState('estilos');
  const [fontSize, setFontSize] = useState(18);
  const [borderRadius, setBorderRadius] = useState(8);
  const [padding, setPadding] = useState(24);
  const [margin, setMargin] = useState(0);
  const [borderColor, setBorderColor] = useState('#CBD5E1');
  const [activeAlign, setActiveAlign] = useState('left');

  const handleInteraction = useCallback(() => {
    if (!isLocked) {
      onInteract();
    }
  }, [isLocked, onInteract]);

  return (
    <aside className={`editor-sidebar ${isLocked ? 'editor-sidebar--locked' : ''}`}>
      {/* Locked overlay message */}
      {isLocked && (
        <div className="editor-sidebar__locked-overlay">
          <span className="editor-sidebar__locked-text">
            Esperando o carregamento do HTML
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="sidebar-tabs">
        {['Estilos', 'Layout', 'Eventos'].map((tab) => (
          <button
            key={tab}
            className={`sidebar-tab ${activeTab === tab.toLowerCase() ? 'sidebar-tab--active' : ''}`}
            onClick={() => {
              setActiveTab(tab.toLowerCase());
              handleInteraction();
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="sidebar-content">
        {/* ── TIPOGRAFIA ── */}
        <CollapsibleSection title="TIPOGRAFIA" icon={Type}>
          {/* Font Size */}
          <div className="sidebar-control">
            <div className="sidebar-control__label-row">
              <span className="sidebar-control__label">Tamanho da Fonte</span>
              <span className="sidebar-control__value">{fontSize}px</span>
            </div>
            <input
              type="range"
              className="sidebar-slider"
              min="8"
              max="72"
              value={fontSize}
              onChange={(e) => {
                setFontSize(Number(e.target.value));
                handleInteraction();
              }}
            />
          </div>

          {/* Alignment */}
          <div className="sidebar-control">
            <span className="sidebar-control__label">Alinhamento</span>
            <div className="sidebar-align-group">
              {[
                { value: 'left', Icon: AlignLeft },
                { value: 'center', Icon: AlignCenter },
                { value: 'right', Icon: AlignRight },
                { value: 'justify', Icon: AlignJustify },
              ].map(({ value, Icon }) => (
                <button
                  key={value}
                  className={`sidebar-align-btn ${activeAlign === value ? 'sidebar-align-btn--active' : ''}`}
                  onClick={() => {
                    setActiveAlign(value);
                    handleInteraction();
                  }}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* ── BORDAS E FORMAS ── */}
        <CollapsibleSection title="BORDAS E FORMAS" icon={Square}>
          {/* Border Radius */}
          <div className="sidebar-control">
            <div className="sidebar-control__label-row">
              <span className="sidebar-control__label">Arredondamento (Radius)</span>
              <span className="sidebar-control__value">{borderRadius}px</span>
            </div>
            <input
              type="range"
              className="sidebar-slider"
              min="0"
              max="50"
              value={borderRadius}
              onChange={(e) => {
                setBorderRadius(Number(e.target.value));
                handleInteraction();
              }}
            />
          </div>

          {/* Border Color */}
          <div className="sidebar-control">
            <span className="sidebar-control__label">Cor da Borda</span>
            <div className="sidebar-color-input">
              <input
                type="color"
                className="sidebar-color-picker"
                value={borderColor}
                onChange={(e) => {
                  setBorderColor(e.target.value);
                  handleInteraction();
                }}
              />
              <input
                type="text"
                className="sidebar-color-text"
                value={borderColor}
                onChange={(e) => {
                  setBorderColor(e.target.value);
                  handleInteraction();
                }}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── ESPAÇAMENTO ── */}
        <CollapsibleSection title="ESPAÇAMENTO" icon={Maximize}>
          <div className="sidebar-control sidebar-control--row">
            <div className="sidebar-control__half">
              <span className="sidebar-control__label">Padding (px)</span>
              <input
                type="number"
                className="sidebar-number-input"
                value={padding}
                min="0"
                onChange={(e) => {
                  setPadding(Number(e.target.value));
                  handleInteraction();
                }}
              />
            </div>
            <div className="sidebar-control__half">
              <span className="sidebar-control__label">Margin (px)</span>
              <input
                type="number"
                className="sidebar-number-input"
                value={margin}
                min="0"
                onChange={(e) => {
                  setMargin(Number(e.target.value));
                  handleInteraction();
                }}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── PREVIEW BOX ── */}
        <div className="sidebar-section sidebar-section--preview">
          <span className="sidebar-section__title sidebar-section__title--small">PREVIEW BOX</span>
          <div
            className="sidebar-preview-box"
            style={{
              borderRadius: `${borderRadius}px`,
              padding: `${padding}px`,
              margin: `${margin}px`,
              borderColor: borderColor,
              fontSize: `${fontSize}px`,
            }}
          >
            <div className="sidebar-preview-box__inner" />
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ===== MAIN EDITOR ===== */
export default function Editor({ project, onUpdateProject, onNavigate, showToast }) {
  const newFileInputRef = useRef(null);

  const handleToolbarAction = useCallback(
    (actionName) => {
      showToast('Função ainda não implementada');
    },
    [showToast]
  );

  const handleSidebarInteraction = useCallback(() => {
    showToast('Função ainda não implementada');
  }, [showToast]);

  /* Read file with FileReader and auto-save to project */
  const handleFileSelect = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdateProject({
        htmlFileName: file.name,
        htmlContent: e.target.result,
      });
    };
    reader.readAsText(file);
  }, [onUpdateProject]);

  /* "Novo" button opens native file picker */
  const handleNewFile = useCallback(() => {
    newFileInputRef.current?.click();
  }, []);

  const handleNewFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  /* Rename project (auto-saved via onUpdateProject) */
  const handleRename = useCallback((newName) => {
    onUpdateProject({ name: newName });
  }, [onUpdateProject]);

  return (
    <div className="editor-shell">
      <EditorHeader
        project={project}
        onRename={handleRename}
        onNavigate={onNavigate}
        onAction={handleToolbarAction}
        onNewFile={handleNewFile}
      />

      {/* Hidden file input for "Novo" toolbar button */}
      <input
        ref={newFileInputRef}
        type="file"
        accept=".html"
        style={{ display: 'none' }}
        onChange={handleNewFileChange}
      />

      <div className="editor-layout">
        <EditorCanvas
          htmlContent={project.htmlContent}
          htmlFileName={project.htmlFileName}
          onFileSelect={handleFileSelect}
        />
        <StylesSidebar
          isLocked={!project.htmlContent}
          onInteract={handleSidebarInteraction}
        />
      </div>
    </div>
  );
}
