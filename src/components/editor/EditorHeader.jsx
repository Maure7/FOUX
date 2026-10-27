import { ArrowLeft, FilePlus, Download, Maximize, Settings, HelpCircle, User, Undo2, Redo2, Lightbulb, LightbulbOff } from 'lucide-react';
import EditableProjectName from './EditableProjectName';

export default function EditorHeader({
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

        <button className="editor-toolbar-btn" onClick={onNewFile} aria-label={t('editor.newFile')}>
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

