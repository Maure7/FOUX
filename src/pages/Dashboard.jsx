import ProjectCard from '../components/dashboard/ProjectCard';
import FolderCard from '../components/dashboard/FolderCard';
import NewProjectCard from '../components/dashboard/NewProjectCard';
import Header from '../components/dashboard/Header';
import { useState, useCallback, useMemo } from 'react';
import {
  Inbox,
  Grid3X3,
  List,
  FolderOpen,
  FolderInput,
  Plus,
  SearchX,
  ListChecks,
} from 'lucide-react';
import ModalNovoProjeto from '../components/dashboard/ModalNovoProjeto';
import ModalNovaPasta from '../components/dashboard/ModalNovaPasta';
import ModalAdicionarProjetos from '../components/dashboard/ModalAdicionarProjetos';
import ModalConfirm from '../components/ui/ModalConfirm';
import ModalRenomear from '../components/ui/ModalRenomear';
import ContextMenu from '../components/dashboard/ContextMenu';
import FolderContextMenu from '../components/dashboard/FolderContextMenu';
import AtividadeRecente from '../components/dashboard/AtividadeRecente';
import FolderBanner from '../components/dashboard/FolderBanner';
import BatchActionBar from '../components/dashboard/BatchActionBar';
import FaqModal from '../components/ui/FaqModal';
import useDashboardSelection from '../hooks/useDashboardSelection';
import { useLanguage } from '../context/LanguageContext';
import { isFavorite } from '../utils/folderColors';
import '../styles/dashboard-selection.css';

// Menu aberto pelo teclado não tem coordenada do cursor: ancora no botão que abriu.
function menuPosition(event) {
  if (event.clientX || event.clientY) return { x: event.clientX, y: event.clientY };
  const bounds = event.currentTarget.getBoundingClientRect();
  return { x: bounds.left, y: bounds.bottom + 4 };
}

const byPinnedThen = (dateKey) => (a, b) => (
  Number(isFavorite(b)) - Number(isFavorite(a)) || new Date(b[dateKey] || 0) - new Date(a[dateKey] || 0)
);

function ProjectsEmptyState({ t }) {
  return (
    <div className="empty-state">
      <Inbox className="empty-state__icon" />
      <p className="empty-state__text">{t('dashboard.emptyRecentTitle')}</p>
      <p className="empty-state__hint">{t('dashboard.emptyRecentHint')}</p>
    </div>
  );
}

function FolderEmptyState({ onNewProject, onAddExisting, canAddExisting, t }) {
  return (
    <div className="folder-empty-state">
      <FolderOpen className="folder-empty-state__icon" aria-hidden="true" />
      <span className="folder-empty-state__text">{t('dashboard.emptyFolderTitle')}</span>
      <span className="folder-empty-state__hint">{t('dashboard.emptyFolderHint')}</span>
      <div className="folder-empty-state__actions">
        <button type="button" className="folder-empty-state__btn folder-empty-state__btn--primary" onClick={onNewProject}>
          <Plus size={15} aria-hidden="true" />
          {t('dashboard.newProject')}
        </button>
        <button
          type="button"
          className="folder-empty-state__btn"
          onClick={onAddExisting}
          disabled={!canAddExisting}
          title={canAddExisting ? undefined : t('dashboard.addExisting.empty')}
        >
          <FolderInput size={15} aria-hidden="true" />
          {t('dashboard.addExisting.button')}
        </button>
      </div>
    </div>
  );
}

function SearchEmptyState({ t }) {
  return (
    <div className="empty-state">
      <SearchX className="empty-state__icon" />
      <p className="empty-state__text">{t('dashboard.emptySearchTitle')}</p>
    </div>
  );
}

const CLOSED_CONFIRM = { isOpen: false, kind: 'project', ids: [], name: '' };

export default function Dashboard({
  projects,
  folders,
  activities,
  userProfile = {},
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDuplicateProject,
  onMoveProject,
  onCreateFolder,
  onToggleFolderFavorite,
  onRenameFolder,
  onChangeFolderColor,
  onToggleProjectFavorite,
  onNavigate,
  showToast,
  onClearActivities,
  onRemoveActivity,
  onCreateTutorialProject,
  currentFolderId = null,
  onFolderChange,
  onSetProjectsFavorite,
  onDuplicateProjects,
  onMoveProjects,
  onDeleteProjects,
  onSetFoldersFavorite,
  onChangeFoldersColor,
  onDeleteFolders,
}) {
  const { t, formatDate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isAddExistingOpen, setIsAddExistingOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [contextMenu, setContextMenu] = useState(null);
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState(CLOSED_CONFIRM);
  const [renameModal, setRenameModal] = useState({ isOpen: false, targetId: null, currentName: '', isFolder: false });

  const selection = useDashboardSelection({ projects, folders });
  const { cancel: cancelSelection, toggleMode: toggleSelection } = selection;

  const currentFolder = useMemo(
    () => folders.find((f) => f.id === currentFolderId) || null,
    [folders, currentFolderId]
  );
  const isInsideFolder = currentFolder !== null;
  const folderId = currentFolder?.id ?? null;

  const folderFileCounts = useMemo(() => {
    const counts = {};
    folders.forEach((f) => { counts[f.id] = 0; });
    projects.forEach((p) => {
      if (p.folderId && counts[p.folderId] !== undefined) counts[p.folderId]++;
    });
    return counts;
  }, [projects, folders]);

  const looseProjects = useMemo(() => projects.filter((p) => !p.folderId), [projects]);

  const { sortedFolders, sortedProjects } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let visibleProjects = isInsideFolder ? projects.filter((p) => p.folderId === folderId) : looseProjects;
    let visibleFolders = isInsideFolder ? [] : folders;
    if (query) {
      visibleProjects = visibleProjects.filter((p) => p.name.toLowerCase().includes(query));
      visibleFolders = visibleFolders.filter((f) => f.name.toLowerCase().includes(query));
    }
    return {
      sortedFolders: [...visibleFolders].sort(byPinnedThen('createdAt')),
      sortedProjects: [...visibleProjects].sort(byPinnedThen('updatedAt')),
    };
  }, [projects, looseProjects, folders, searchQuery, isInsideFolder, folderId]);

  const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const handleImportHTML = useCallback((projectName) => {
    setIsModalOpen(false);
    onCreateProject(projectName, folderId);
  }, [onCreateProject, folderId]);

  const handleOpenTutorial = useCallback(() => {
    setIsModalOpen(false);
    onCreateTutorialProject?.(folderId);
  }, [onCreateTutorialProject, folderId]);

  const enterFolder = useCallback((id) => {
    cancelSelection();
    onFolderChange(id);
    setSearchQuery('');
  }, [onFolderChange, cancelSelection]);

  const goToRoot = useCallback(() => {
    cancelSelection();
    onFolderChange(null);
    setSearchQuery('');
  }, [onFolderChange, cancelSelection]);

  const goHome = useCallback(() => {
    goToRoot();
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [goToRoot]);

  const toggleSelectionMode = useCallback(() => {
    setContextMenu(null);
    setFolderContextMenu(null);
    toggleSelection();
  }, [toggleSelection]);

  const handleContextMenu = useCallback((e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu(null);
    setContextMenu({ ...menuPosition(e), project });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleFolderContextMenu = useCallback((e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setFolderContextMenu({ ...menuPosition(e), folder });
  }, []);
  const closeFolderContextMenu = useCallback(() => setFolderContextMenu(null), []);

  const addExistingToFolder = useCallback((ids) => {
    if (!folderId || !ids.length) return;
    onMoveProjects(ids, folderId);
    const entity = ids.length === 1 ? t('dashboard.projectMovedSingular') : t('dashboard.projectMovedPlural');
    showToast(t('dashboard.movedSuccess', { count: ids.length, entity }));
  }, [folderId, onMoveProjects, showToast, t]);

  const selectedIds = selection.selectedItems.map((item) => item.id);
  const selectedCount = selectedIds.length;

  const batchFavorite = (favorite) => {
    if (selection.kind === 'project') onSetProjectsFavorite(selectedIds, favorite);
    else onSetFoldersFavorite(selectedIds, favorite);
    showToast(t(favorite ? 'dashboard.batch.favorited' : 'dashboard.batch.unfavorited', { count: selectedCount }));
  };

  const batchDuplicate = () => {
    const count = onDuplicateProjects(selectedIds);
    showToast(t(count === 1 ? 'dashboard.batch.duplicatedOne' : 'dashboard.batch.duplicatedMany', { count }));
    selection.cancel();
  };

  const batchMove = (targetId) => {
    onMoveProjects(selectedIds, targetId);
    const target = folders.find((f) => f.id === targetId);
    showToast(t(selectedCount === 1 ? 'dashboard.batch.movedOne' : 'dashboard.batch.movedMany', {
      count: selectedCount,
      folder: target ? target.name : t('dashboard.folderView.root'),
    }));
    selection.cancel();
  };

  const batchColor = (color) => {
    onChangeFoldersColor(selectedIds, color);
    showToast(t('dashboard.batch.colorChanged', { count: selectedCount }));
  };

  const batchDelete = () => {
    const single = selectedCount === 1 ? selection.selectedItems[0].name : '';
    setConfirmModal({ isOpen: true, kind: selection.kind, ids: selectedIds, name: single });
  };

  const confirmDelete = () => {
    const { kind, ids } = confirmModal;
    if (kind === 'folder') onDeleteFolders(ids);
    else onDeleteProjects(ids);
    if (selection.active) selection.cancel();
  };

  const confirmText = (() => {
    const { kind, ids, name } = confirmModal;
    const many = ids.length > 1;
    if (kind === 'folder') {
      return {
        title: t(many ? 'dashboard.batch.deleteFoldersTitle' : 'dashboard.deleteFolderTitle'),
        message: many ? t('dashboard.batch.deleteFoldersConfirm', { count: ids.length }) : t('dashboard.deleteFolderConfirm', { name }),
      };
    }
    return {
      title: t(many ? 'dashboard.batch.deleteProjectsTitle' : 'dashboard.deleteProjectTitle'),
      message: many ? t('dashboard.batch.deleteProjectsConfirm', { count: ids.length }) : t('dashboard.deleteProjectConfirm', { name }),
    };
  })();

  const hasItems = sortedProjects.length > 0 || sortedFolders.length > 0;
  const isSearching = searchQuery.trim().length > 0;
  const isFolderEmpty = isInsideFolder && sortedProjects.length === 0 && !isSearching;
  const selectionActive = selection.active;
  const canSelect = sortedProjects.length > 0 || sortedFolders.length > 0;

  const sectionActions = (
    <>
      <button
        type="button"
        className={`dashboard-tool-btn select-toggle ${selectionActive ? 'is-active' : ''}`}
        onClick={toggleSelectionMode}
        aria-pressed={selectionActive}
        disabled={!canSelect && !selectionActive}
        title={selectionActive ? t('dashboard.batch.exitHint') : undefined}
      >
        <ListChecks size={14} aria-hidden="true" />
        <span>{selectionActive ? t('dashboard.batch.done') : t('dashboard.batch.select')}</span>
      </button>
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
    </>
  );

  return (
    <div className="app-shell">
      <Header
        onGoHome={goHome}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewFolder={() => setIsFolderModalOpen(true)}
        onOpenConfig={() => onNavigate('settings')}
        onOpenProfile={() => onNavigate('profile')}
        userProfile={userProfile}
        onOpenFaq={() => setIsFaqOpen(true)}
        t={t}
      />

      <main className={`main-content ${selectionActive ? 'main-content--batch' : ''}`} id="main-content">
        {isInsideFolder ? (
          <FolderBanner
            folder={currentFolder}
            projectCount={folderFileCounts[currentFolder.id] || 0}
            onBack={goToRoot}
            onRename={(name) => onRenameFolder(currentFolder.id, name)}
            onChangeColor={(color) => onChangeFolderColor(currentFolder.id, color)}
            onAddExisting={() => setIsAddExistingOpen(true)}
            canAddExisting={!isFolderEmpty && looseProjects.length > 0 && !selectionActive}
            actions={sectionActions}
          />
        ) : (
          <div className="section-header">
            <div className="section-header__left" />
            <div className="section-header__actions">{sectionActions}</div>
          </div>
        )}

        <div className="projects-area">
          {isFolderEmpty ? (
            <FolderEmptyState
              onNewProject={handleOpenModal}
              onAddExisting={() => setIsAddExistingOpen(true)}
              canAddExisting={looseProjects.length > 0}
              t={t}
            />
          ) : (
            <div className={viewMode === 'list' ? 'projects-list' : 'projects-grid'} id="projects-grid">
              {!selectionActive && <NewProjectCard onClick={handleOpenModal} viewMode={viewMode} t={t} />}

              {sortedFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={enterFolder}
                  viewMode={viewMode}
                  fileCount={folderFileCounts[folder.id] || 0}
                  onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                  selectionMode={selectionActive}
                  isSelected={selection.isSelected('folder', folder.id)}
                  blocked={selection.isBlocked('folder')}
                  blockedHint={t('dashboard.batch.blockedFolder')}
                  onToggleSelect={(id) => selection.toggle('folder', id)}
                  t={t}
                  formatDate={formatDate}
                />
              ))}

              {sortedProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={onOpenProject}
                  onContextMenu={(e) => handleContextMenu(e, p)}
                  viewMode={viewMode}
                  selectionMode={selectionActive}
                  isSelected={selection.isSelected('project', p.id)}
                  blocked={selection.isBlocked('project')}
                  blockedHint={t('dashboard.batch.blockedProject')}
                  onToggleSelect={(id) => selection.toggle('project', id)}
                  t={t}
                  formatDate={formatDate}
                />
              ))}

              {!hasItems && !isInsideFolder && !isSearching && <ProjectsEmptyState t={t} />}
              {isSearching && !hasItems && <SearchEmptyState t={t} />}
            </div>
          )}
        </div>

        {!isInsideFolder && (
          <AtividadeRecente
            activities={activities}
            onClearActivities={onClearActivities}
            onRemoveActivity={onRemoveActivity}
          />
        )}
      </main>

      {selectionActive && (
        <BatchActionBar
          kind={selection.kind}
          items={selection.selectedItems}
          folders={folders}
          currentFolderId={folderId}
          onFavorite={batchFavorite}
          onDuplicate={batchDuplicate}
          onMove={batchMove}
          onDelete={batchDelete}
          onChangeColor={batchColor}
          onCancel={selection.cancel}
        />
      )}

      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} t={t} />

      <footer className="footer" id="footer">
        <span className="footer__copyright">
          © 2026 FANCY AND ORGANIZED UX INC
        </span>
      </footer>

      <ModalNovoProjeto
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onImportHTML={handleImportHTML}
        onOpenTutorial={handleOpenTutorial}
      />

      <ModalNovaPasta
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreate={(name, color, projectIds) => {
          onCreateFolder(name, color, projectIds);
          if (projectIds.length) {
            const entity = projectIds.length === 1 ? t('dashboard.projectMovedSingular') : t('dashboard.projectMovedPlural');
            showToast(t('dashboard.movedSuccess', { count: projectIds.length, entity }));
          }
        }}
        existingFolders={folders}
        projects={projects}
      />

      <ModalAdicionarProjetos
        isOpen={isAddExistingOpen}
        onClose={() => setIsAddExistingOpen(false)}
        folder={currentFolder}
        projects={looseProjects}
        onConfirm={addExistingToFolder}
      />

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
            setConfirmModal({ isOpen: true, kind: 'project', ids: [contextMenu.project.id], name: contextMenu.project.name });
          }}
          onToggleFavorite={onToggleProjectFavorite ? () => onToggleProjectFavorite(contextMenu.project.id) : undefined}
          isFavorite={isFavorite(contextMenu.project)}
          folders={folders}
          currentFolderId={contextMenu.project.folderId}
        />
      )}

      {folderContextMenu && (
        <FolderContextMenu
          x={folderContextMenu.x}
          y={folderContextMenu.y}
          folder={folderContextMenu.folder}
          onClose={closeFolderContextMenu}
          onDelete={() => {
            setConfirmModal({ isOpen: true, kind: 'folder', ids: [folderContextMenu.folder.id], name: folderContextMenu.folder.name });
          }}
          onRename={() => {
            setRenameModal({
              isOpen: true,
              targetId: folderContextMenu.folder.id,
              currentName: folderContextMenu.folder.name,
              isFolder: true,
            });
          }}
          onChangeColor={(color) => onChangeFolderColor(folderContextMenu.folder.id, color)}
          onToggleFavorite={() => onToggleFolderFavorite(folderContextMenu.folder.id)}
        />
      )}

      <ModalConfirm
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((current) => ({ ...current, isOpen: false }))}
        onConfirm={confirmDelete}
        title={confirmText.title}
        message={confirmText.message}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
      />

      <ModalRenomear
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, targetId: null, currentName: '', isFolder: false })}
        onRename={(newName) => {
          if (renameModal.isFolder) onRenameFolder(renameModal.targetId, newName);
          else onRenameProject(renameModal.targetId, newName);
        }}
        currentName={renameModal.currentName}
      />
    </div>
  );
}
