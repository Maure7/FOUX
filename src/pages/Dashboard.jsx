import ProjectCard from '../components/dashboard/ProjectCard';
import FolderCard from '../components/dashboard/FolderCard';
import NewProjectCard from '../components/dashboard/NewProjectCard';
import Header from '../components/dashboard/Header';
import { useState, useCallback, useMemo } from 'react';
import {
  Inbox,
  ArrowLeft,
  Grid3X3,
  List,
  FolderOpen,
  SearchX,
} from 'lucide-react';
import ModalNovoProjeto from '../components/dashboard/ModalNovoProjeto';
import ModalNovaPasta from '../components/dashboard/ModalNovaPasta';
import ModalConfirm from '../components/ui/ModalConfirm';
import ModalRenomear from '../components/ui/ModalRenomear';
import ContextMenu from '../components/dashboard/ContextMenu';
import FolderContextMenu from '../components/dashboard/FolderContextMenu';
import AtividadeRecente from '../components/dashboard/AtividadeRecente';
import FaqModal from '../components/ui/FaqModal';
import { useLanguage } from '../context/LanguageContext';

function menuPosition(event) {
  if (event.clientX || event.clientY) return { x: event.clientX, y: event.clientY };
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: bounds.left, y: bounds.bottom + 4 };
}
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
  onToggleProjectFavorite,
  onNavigate,
  showToast,
  onClearActivities,
  onRemoveActivity,
  onCreateTutorialProject,
}) {
  const { t, formatDate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
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

    // Sort: favoritos primeiro, depois data mais recente
    const sf = [...visibleFolders].sort((a, b) => {
      const aFav = !!(a.favorite || a.isFavorite);
      const bFav = !!(b.favorite || b.isFavorite);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const sp = [...visibleProjects].sort((a, b) => {
      const aFav = !!(a.favorite || a.isFavorite);
      const bFav = !!(b.favorite || b.isFavorite);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
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
    setIsModalOpen(false);
    if (onCreateTutorialProject) onCreateTutorialProject();
  }, [onCreateTutorialProject]);

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
      ...menuPosition(e),
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
      ...menuPosition(e),
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
        onOpenFaq={() => setIsFaqOpen(true)}
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
                aria-pressed={viewMode === 'grid'}
              >
                <Grid3X3 size={13} />
                {t('dashboard.viewGrid')}
              </button>
              <button
                className={`view-toggle__btn ${viewMode === 'list' ? 'view-toggle__btn--active' : 'view-toggle__btn--inactive'}`}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
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

      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} t={t} />

      {/* Footer */}
      <footer className="footer" id="footer">
        <span className="footer__copyright">
          © 2026 FANCY AND ORGANIZED UX INC
        </span>
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
          onToggleFavorite={onToggleProjectFavorite ? () => onToggleProjectFavorite(contextMenu.project.id) : undefined}
          isFavorite={!!(contextMenu.project.favorite || contextMenu.project.isFavorite)}
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
