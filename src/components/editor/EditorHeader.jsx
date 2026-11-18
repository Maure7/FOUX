import { memo } from 'react';
import { ArrowLeft, FilePlus, Download, Maximize, Settings, HelpCircle, User, Undo2, Redo2, Lightbulb, LightbulbOff, Trophy, Eraser } from 'lucide-react';
import EditableProjectName from './EditableProjectName';
import FouxLogo from '../ui/FouxLogo';

function EditorHeader({
  projectName, onRename, onNavigate, onGoHome, onOpenFaq, onNewFile,
  onOpenConfig, onOpenProfile, userProfile, t,
  canUndo, canRedo, onUndo, onRedo, undoLabel, redoLabel,
  isTutorialProject, showTipsLocal, onToggleTips, challengeActive, onToggleChallenges,
  onExportCss, onExpand, onClearCanvas, hasLoaded, isExporting,
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

        <button
          type="button"
          className="editor-header__logo"
          onClick={onGoHome}
          aria-label={t('dashboard.goHome')}
          title={t('dashboard.goHome')}
        >
          <FouxLogo decorative />
        </button>

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

        <EditableProjectName name={projectName} onRename={onRename} t={t} />

        <div className="editor-header__separator" />
        <button
          className="editor-header__icon-btn editor-undo-redo-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('editor.undo')}
          data-tooltip={undoLabel}
        >
          <Undo2 size={16} />
        </button>
        <button
          className="editor-header__icon-btn editor-undo-redo-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t('editor.redo')}
          data-tooltip={redoLabel}
        >
          <Redo2 size={16} />
        </button>

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
            <button
              className={`editor-header__tutorial-btn editor-header__challenge-btn ${challengeActive ? 'is-active' : ''}`}
              onClick={onToggleChallenges}
              disabled={!hasLoaded}
              aria-pressed={challengeActive}
              aria-label={t(challengeActive ? 'challenges.quit' : 'challenges.start')}
              data-tooltip={t(challengeActive ? 'challenges.quit' : 'challenges.start')}
            >
              <Trophy size={14} className="editor-header__tutorial-icon" />
              <span className="editor-header__tutorial-text">{t('challenges.button')}</span>
            </button>
          </>
        )}
      </div>

      <div className="editor-header__right">
        <button
          type="button"
          className="editor-toolbar-btn editor-toolbar-btn--danger"
          onClick={onClearCanvas}
          disabled={!hasLoaded}
          aria-label={t('editor.clearCanvas.button')}
          data-tooltip={t('editor.clearCanvas.hint')}
        >
          <Eraser size={14} aria-hidden="true" />
          <span>{t('editor.clearCanvas.button')}</span>
        </button>
        <div className="editor-header__separator" />
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
        <button
          type="button"
          className="header__avatar-wrapper"
          onClick={onOpenProfile}
          aria-label={t('profile.title')}
          title={t('profile.title')}
        >
          <span className="header__avatar-placeholder">
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt="Avatar" className="header__avatar-img" />
            ) : (
              <User size={15} />
            )}
          </span>
          <span className="header__avatar-status" />
        </button>
      </div>
    </header>
  );
}

export default memo(EditorHeader);
