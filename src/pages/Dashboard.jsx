import { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Settings,
  FolderPlus,
  HelpCircle,
  Plus,
  User,
  Inbox,
  FileCode,
  Folder,
  ArrowLeft,
  CheckSquare,
  MoreHorizontal,
  Grid3X3,
  List,
  FolderOpen,
  SearchX,
} from 'lucide-react';
import ModalNovoProjeto from '../components/ModalNovoProjeto';
import ModalNovaPasta from '../components/ModalNovaPasta';
import ModalConfirm from '../components/ModalConfirm';
import ModalRenomear from '../components/ModalRenomear';
import ContextMenu from '../components/ContextMenu';
import FolderContextMenu from '../components/FolderContextMenu';
import AtividadeRecente from '../components/AtividadeRecente';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Dashboard.css';

/* ===== HEADER ===== */
function Header({ searchQuery, onSearchChange, onNewFolder, onOpenConfig, onOpenProfile, userProfile, onNotImplemented, t }) {
  return (
    <header className="header" id="header">
      <span className="header__logo">FOUX</span>

      <div className="header__controls">
        <div className="header__search">
          <Search className="header__search-icon" />
          <input
            className="header__search-input"
            type="text"
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          className="header__icon-btn"
          aria-label={t('settings.title')}
          onClick={onOpenConfig}
        >
          <Settings size={17} />
        </button>

        <button
          className="header__new-folder"
          aria-label={t('dashboard.newFolder')}
          onClick={onNewFolder}
        >
          <FolderPlus size={15} />
          <span>{t('dashboard.newFolder')}</span>
        </button>

        <button
          className="header__icon-btn"
          aria-label={t('dashboard.help')}
          onClick={() => onNotImplemented(t('dashboard.help'))}
        >
          <HelpCircle size={17} />
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
              <User size={16} />
            )}
          </div>
          <span className="header__avatar-status" />
        </div>
      </div>
    </header>
  );
}

/* ===== NEW PROJECT CARD ===== */
function NewProjectCard({ onClick, viewMode, t }) {
  return (
    <div
      className={`project-card project-card--new ${viewMode === 'list' ? 'project-card--list-new' : ''}`}
      id="card-new-project"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <div className="new-project__icon">
        <Plus size={viewMode === 'list' ? 16 : 22} />
      </div>
      <span className="new-project__title">{t('dashboard.newProject')}</span>
      {viewMode !== 'list' && (
        <span className="new-project__subtitle">{t('dashboard.startFromScratch')}</span>
      )}
    </div>
  );
}

/* ===== FOLDER CARD ===== */
function FolderCard({ folder, onClick, viewMode, onContextMenu, fileCount, t, formatDate }) {
  const dateLabel = formatDate(folder.createdAt);
  const fileCountLabel = fileCount === 1 ? t('dashboard.oneFile') : t('dashboard.filesCount', { count: fileCount });

  if (viewMode === 'list') {
    return (
      <div
        className="list-item list-item--folder"
        onClick={() => onClick(folder.id)}
        onContextMenu={onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick(folder.id); }}
      >
        <Folder size={18} className="list-item__icon" style={{ color: folder.borderColor }} />
        <span className="list-item__name">{folder.name}</span>
        <span className="list-item__file-count">{fileCountLabel}</span>
        <span className="list-item__date">{dateLabel}</span>
      </div>
    );
  }

  return (
    <div
      className="project-card project-card--folder"
      style={{ '--folder-border-color': folder.borderColor }}
      onClick={() => onClick(folder.id)}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(folder.id); }}
    >
      <div className="project-card__preview project-card__preview--folder">
        <Folder size={28} style={{ color: folder.borderColor }} />
      </div>
      <div className="project-card__info">
        <span className="project-card__name">{folder.name}</span>
        <span className="project-card__file-count">{fileCountLabel}</span>
        <span className="project-card__date">{t('dashboard.createdDate', { date: dateLabel })}</span>
      </div>
    </div>
  );
}

/* ===== PROJECT CARD ===== */
function ProjectCard({
  project,
  onClick,
  onContextMenu,
  viewMode,
  selectionMode,
  isSelected,
  onToggleSelect,
  t,
  formatDate,
}) {
  const dateLabel = formatDate(project.updatedAt);

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect(project.id);
    } else {
      onClick(project.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`list-item ${selectionMode ? 'list-item--selectable' : ''} ${isSelected ? 'list-item--selected' : ''}`}
        onClick={handleClick}
        onContextMenu={selectionMode ? undefined : onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      >
        {selectionMode && (
          <div className={`selection-checkbox ${isSelected ? 'selection-checkbox--checked' : ''}`}>
            {isSelected && <CheckSquare size={16} />}
          </div>
        )}
        <FileCode size={18} className="list-item__icon" />
        <span className="list-item__name">{project.name}</span>
        <span className="list-item__date">{t('dashboard.editedDate', { date: dateLabel })}</span>
        {!selectionMode && (
          <button
            className="list-item__options"
            onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
            aria-label={t('common.options')}
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`project-card project-card--saved ${selectionMode ? 'project-card--selectable' : ''} ${isSelected ? 'project-card--selected' : ''}`}
      onClick={handleClick}
      onContextMenu={selectionMode ? undefined : onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      {selectionMode && (
        <div className={`selection-checkbox selection-checkbox--card ${isSelected ? 'selection-checkbox--checked' : ''}`}>
          {isSelected && <CheckSquare size={18} />}
        </div>
      )}
      <div className="project-card__preview">
        {project.htmlContent ? (
          <FileCode size={24} className="project-card__preview-icon project-card__preview-icon--active" />
        ) : (
          <FileCode size={24} className="project-card__preview-icon" />
        )}
      </div>
      <div className="project-card__info">
        <span className="project-card__name">{project.name}</span>
        <span className="project-card__date">{t('dashboard.editedDate', { date: dateLabel })}</span>
      </div>
    </div>
  );
}

/* ===== EMPTY STATES ===== */
function ProjectsEmptyState({ t }) {
  return (
    <div className="empty-state">
      <Inbox className="empty-state__icon" />
      <p className="empty-state__text">
        {t('dashboard.emptyRecentTitle')}
      </p>
      <p className="empty-state__hint">
        {t('dashboard.emptyRecentHint')}
      </p>
    </div>
  );
}

function FolderEmptyState({ onAddContent, t }) {
  return (
    <div className="folder-empty-state" onClick={onAddContent} role="button" tabIndex={0}>
      <FolderOpen className="folder-empty-state__icon" />
      <span className="folder-empty-state__text">{t('dashboard.emptyFolderTitle')}</span>
      <span className="folder-empty-state__hint">{t('dashboard.emptyFolderHint')}</span>
    </div>
  );
}

function SearchEmptyState({ t }) {
  return (
    <div className="empty-state">
      <SearchX className="empty-state__icon" />
      <p className="empty-state__text">
        {t('dashboard.emptySearchTitle')}
      </p>
    </div>
  );
}

/* ===== MAIN DASHBOARD ===== */
export default function Dashboard({
  projects,
  folders,
  activities,
  userProfile = {},
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
  onDuplicateProject,
  onMoveProject,
  onCreateFolder,
  onDeleteFolder,
  onToggleFolderFavorite,
  onRenameFolder,
  onChangeFolderColor,
  onNavigate,
  showToast,
  onClearActivities,
  onRemoveActivity,
}) {
  const { t, formatDate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [currentFolderId, setCurrentFolderId] = useState(null);

  /* Selection mode state */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionTargetFolderId, setSelectionTargetFolderId] = useState(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState(new Set());

  /* Context menu state */
  const [contextMenu, setContextMenu] = useState(null);

  /* Folder context menu state */
  const [folderContextMenu, setFolderContextMenu] = useState(null);

  /* Confirmation modal state */
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, projectId: null, projectName: '', isFolder: false });

  /* Rename modal state */
  const [renameModal, setRenameModal] = useState({ isOpen: false, targetId: null, currentName: '', isFolder: false });

  const handleNotImplemented = useCallback(
    (featureName) => {
      showToast(t('common.notImplemented', { feature: featureName }));
    },
    [showToast, t]
  );

  /* Current folder object */
  const currentFolder = useMemo(
    () => folders.find((f) => f.id === currentFolderId) || null,
    [folders, currentFolderId]
  );

  /* Pre-compute file counts for each folder */
  const folderFileCounts = useMemo(() => {
    const counts = {};
    folders.forEach((f) => { counts[f.id] = 0; });
    projects.forEach((p) => {
      if (p.folderId && counts[p.folderId] !== undefined) {
        counts[p.folderId]++;
      }
    });
    return counts;
  }, [projects, folders]);

  /* Filtered and sorted items */
  const { sortedFolders, sortedProjects } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let visibleProjects;
    let visibleFolders;

    if (selectionMode) {
      visibleProjects = projects.filter((p) => p.folderId === null);
      visibleFolders = [];
    } else if (currentFolderId) {
      visibleProjects = projects.filter((p) => p.folderId === currentFolderId);
      visibleFolders = [];
    } else {
      visibleProjects = projects.filter((p) => p.folderId === null);
      visibleFolders = [...folders];
    }

    if (query) {
      visibleProjects = visibleProjects.filter((p) =>
        p.name.toLowerCase().includes(query)
      );
      visibleFolders = visibleFolders.filter((f) =>
        f.name.toLowerCase().includes(query)
      );
    }

    // Sort: favoritos primeiro
    const sf = visibleFolders.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return 0;
    });

    const sp = visibleProjects.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return 0;
    });

    return { sortedFolders: sf, sortedProjects: sp };
  }, [projects, folders, searchQuery, currentFolderId, selectionMode]);

  /* Modal handlers */
  const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const handleImportHTML = useCallback((projectName) => {
    setIsModalOpen(false);
    onCreateProject(projectName, currentFolderId);
  }, [onCreateProject, currentFolderId]);

  const handleOpenTutorial = useCallback(() => {
    showToast(t('common.featureComingSoon'));
  }, [showToast, t]);

  /* Folder navigation */
  const enterFolder = useCallback((folderId) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  }, []);

  const goToRoot = useCallback(() => {
    setCurrentFolderId(null);
    setSearchQuery('');
  }, []);

  /* Selection mode */
  const startSelectionMode = useCallback((targetFolderId) => {
    setSelectionMode(true);
    setSelectionTargetFolderId(targetFolderId);
    setSelectedProjectIds(new Set());
    setCurrentFolderId(null);
  }, []);

  const cancelSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectionTargetFolderId(null);
    setSelectedProjectIds(new Set());
  }, []);

  const toggleProjectSelection = useCallback((projectId) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const confirmSelection = useCallback(() => {
    selectedProjectIds.forEach((pid) => {
      onMoveProject(pid, selectionTargetFolderId);
    });
    const count = selectedProjectIds.size;
    const entity = count === 1 ? t('dashboard.projectMovedSingular') : t('dashboard.projectMovedPlural');
    showToast(t('dashboard.movedSuccess', { count, entity }));
    setSelectionMode(false);
    setCurrentFolderId(selectionTargetFolderId);
    setSelectionTargetFolderId(null);
    setSelectedProjectIds(new Set());
  }, [selectedProjectIds, selectionTargetFolderId, onMoveProject, showToast, t]);

  /* Project context menu */
  const handleContextMenu = useCallback((e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu(null);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      project,
    });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  /* Folder context menu */
  const handleFolderContextMenu = useCallback((e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setFolderContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder,
    });
  }, []);

  const closeFolderContextMenu = useCallback(() => setFolderContextMenu(null), []);

  /* Section title */
  const sectionTitle = selectionMode
    ? t('dashboard.selectionTitle')
    : currentFolder
      ? currentFolder.name
      : t('dashboard.welcome');

  const hasItems = sortedProjects.length > 0 || sortedFolders.length > 0;
  const isSearching = searchQuery.trim().length > 0;
  const isInsideFolder = currentFolderId !== null && !selectionMode;
  const isFolderEmpty = isInsideFolder && sortedProjects.length === 0 && !isSearching;

  return (
    <div className="app-shell">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewFolder={() => setIsFolderModalOpen(true)}
        onOpenConfig={() => onNavigate('settings')}
        onOpenProfile={() => onNavigate('profile')}
        userProfile={userProfile}
        onNotImplemented={handleNotImplemented}
        t={t}
      />

      <main className="main-content" id="main-content">
        {/* Section header */}
        <div className="section-header">
          <div className="section-header__left">
            {(isInsideFolder || selectionMode) && (
              <button
                className="section-header__back"
                onClick={selectionMode ? cancelSelectionMode : goToRoot}
                aria-label={t('common.back')}
              >
                <ArrowLeft size={16} />
                <span>{t('common.back')}</span>
              </button>
            )}
            <h1 className="section-header__title">{sectionTitle}</h1>
          </div>
          {!selectionMode && (
            <div className="view-toggle" id="view-toggle">
              <button
                className={`view-toggle__btn ${viewMode === 'grid' ? 'view-toggle__btn--active' : 'view-toggle__btn--inactive'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={13} />
                {t('dashboard.viewGrid')}
              </button>
              <button
                className={`view-toggle__btn ${viewMode === 'list' ? 'view-toggle__btn--active' : 'view-toggle__btn--inactive'}`}
                onClick={() => setViewMode('list')}
              >
                <List size={13} />
                {t('dashboard.viewList')}
              </button>
            </div>
          )}
        </div>

        {/* Projects area */}
        <div className="projects-area">
          {isFolderEmpty ? (
            <FolderEmptyState onAddContent={() => startSelectionMode(currentFolderId)} t={t} />
          ) : (
            <div className={viewMode === 'list' ? 'projects-list' : 'projects-grid'} id="projects-grid">
              {!selectionMode && !isInsideFolder && (
                <NewProjectCard onClick={handleOpenModal} viewMode={viewMode} t={t} />
              )}

              {/* Folders (sorted: fav first) */}
              {sortedFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={enterFolder}
                  viewMode={viewMode}
                  fileCount={folderFileCounts[folder.id] || 0}
                  onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                  t={t}
                  formatDate={formatDate}
                />
              ))}

              {/* Projects (sorted: fav first) */}
              {sortedProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={onOpenProject}
                  onContextMenu={(e) => handleContextMenu(e, p)}
                  viewMode={viewMode}
                  selectionMode={selectionMode}
                  isSelected={selectedProjectIds.has(p.id)}
                  onToggleSelect={toggleProjectSelection}
                  t={t}
                  formatDate={formatDate}
                />
              ))}

              {!hasItems && !selectionMode && !isInsideFolder && <ProjectsEmptyState t={t} />}
              {isSearching && !hasItems && <SearchEmptyState t={t} />}
            </div>
          )}
        </div>

        {/* Selection mode floating bar */}
        {selectionMode && (
          <div className="selection-bar">
            <span className="selection-bar__count">
              {selectedProjectIds.size === 1
                ? t('dashboard.selectionCount', { count: 1 })
                : t('dashboard.selectionCountPlural', { count: selectedProjectIds.size })}
            </span>
            <div className="selection-bar__actions">
              <button className="selection-bar__cancel" onClick={cancelSelectionMode}>
                {t('common.cancel')}
              </button>
              <button
                className="selection-bar__confirm"
                onClick={confirmSelection}
                disabled={selectedProjectIds.size === 0}
              >
                {t('dashboard.confirmAndMove')}
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {!selectionMode && (
          <AtividadeRecente
            activities={activities}
            onClearActivities={onClearActivities}
            onRemoveActivity={onRemoveActivity}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="footer" id="footer">
        <span className="footer__copyright">
          © 2026 FANCY AND ORGANIZED UX INC
        </span>
        <nav className="footer__links">
          <a className="footer__link" href="#" onClick={(e) => e.preventDefault()}>
            {t('dashboard.terms')}
          </a>
          <a className="footer__link" href="#" onClick={(e) => e.preventDefault()}>
            {t('dashboard.privacy')}
          </a>
          <a className="footer__link" href="#" onClick={(e) => e.preventDefault()}>
            {t('dashboard.support')}
          </a>
        </nav>
      </footer>

      {/* Modal Novo Projeto */}
      <ModalNovoProjeto
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onImportHTML={handleImportHTML}
        onOpenTutorial={handleOpenTutorial}
      />

      {/* Modal Nova Pasta */}
      <ModalNovaPasta
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreate={onCreateFolder}
        existingFolders={folders}
      />

      {/* Project Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onOpen={() => onOpenProject(contextMenu.project.id)}
          onRename={() => {
            setRenameModal({
              isOpen: true,
              targetId: contextMenu.project.id,
              currentName: contextMenu.project.name,
              isFolder: false,
            });
          }}
          onMoveTo={(targetFolderId) => {
            onMoveProject(contextMenu.project.id, targetFolderId);
            const targetFolder = folders.find((f) => f.id === targetFolderId);
            showToast(t('dashboard.movedToFolder', { folder: targetFolder ? targetFolder.name : t('common.root') }));
          }}
          onDuplicate={() => onDuplicateProject(contextMenu.project.id)}
          onDelete={() => {
            setConfirmModal({
              isOpen: true,
              projectId: contextMenu.project.id,
              projectName: contextMenu.project.name,
              isFolder: false,
            });
          }}
          folders={folders}
          currentFolderId={contextMenu.project.folderId}
        />
      )}

      {/* Folder Context Menu */}
      {folderContextMenu && (
        <FolderContextMenu
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          folder={folderContextMenu.folder}
          onClose={closeFolderContextMenu}
          onDelete={() => {
            setConfirmModal({
              isOpen: true,
              projectId: folderContextMenu.folder.id,
              projectName: folderContextMenu.folder.name,
              isFolder: true,
            });
          }}
          onRename={() => {
            setRenameModal({
              isOpen: true,
              targetId: folderContextMenu.folder.id,
              currentName: folderContextMenu.folder.name,
              isFolder: true,
            });
          }}
          onChangeColor={(color) => {
            onChangeFolderColor(folderContextMenu.folder.id, color);
          }}
          onToggleFavorite={() => {
            onToggleFolderFavorite(folderContextMenu.folder.id);
          }}
        />
      )}

      {/* Confirmation Modal */}
      <ModalConfirm
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, projectId: null, projectName: '', isFolder: false })}
        onConfirm={() => {
          if (confirmModal.isFolder) {
            onDeleteFolder(confirmModal.projectId);
          } else {
            onDeleteProject(confirmModal.projectId);
          }
        }}
        title={confirmModal.isFolder ? t('dashboard.deleteFolderTitle') : t('dashboard.deleteProjectTitle')}
        message={confirmModal.isFolder ? t('dashboard.deleteFolderConfirm', { name: confirmModal.projectName }) : t('dashboard.deleteProjectConfirm', { name: confirmModal.projectName })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
      />

      {/* Rename Modal (projects + folders) */}
      <ModalRenomear
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, targetId: null, currentName: '', isFolder: false })}
        onRename={(newName) => {
          if (renameModal.isFolder) {
            onRenameFolder(renameModal.targetId, newName);
          } else {
            onRenameProject(renameModal.targetId, newName);
          }
        }}
        currentName={renameModal.currentName}
      />
    </div>
  );
}
