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
import AtividadeRecente from '../components/AtividadeRecente';
import '../styles/Dashboard.css';

/* ===== HEADER ===== */
function Header({ searchQuery, onSearchChange, onNewFolder, onNotImplemented }) {
  return (
    <header className="header" id="header">
      <span className="header__logo">FOUX</span>

      <div className="header__controls">
        {/* Search */}
        <div className="header__search">
          <Search className="header__search-icon" />
          <input
            className="header__search-input"
            type="text"
            placeholder="Pesquisar projetos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Settings */}
        <button
          className="header__icon-btn"
          aria-label="Configurações"
          onClick={() => onNotImplemented('Configurações')}
        >
          <Settings size={17} />
        </button>

        {/* New Folder */}
        <button
          className="header__new-folder"
          aria-label="Nova Pasta"
          onClick={onNewFolder}
        >
          <FolderPlus size={15} />
          <span>Nova Pasta</span>
        </button>

        {/* Help */}
        <button
          className="header__icon-btn"
          aria-label="Ajuda"
          onClick={() => onNotImplemented('Ajuda')}
        >
          <HelpCircle size={17} />
        </button>

        {/* Avatar */}
        <div
          className="header__avatar-wrapper"
          onClick={() => onNotImplemented('Perfil de Usuário')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onNotImplemented('Perfil de Usuário');
          }}
        >
          <div className="header__avatar-placeholder">
            <User size={16} />
          </div>
          <span className="header__avatar-status" />
        </div>
      </div>
    </header>
  );
}

/* ===== NEW PROJECT CARD ===== */
function NewProjectCard({ onClick, viewMode }) {
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
      <span className="new-project__title">Novo Projeto</span>
      {viewMode !== 'list' && (
        <span className="new-project__subtitle">Começar do zero</span>
      )}
    </div>
  );
}

/* ===== FOLDER CARD ===== */
function FolderCard({ folder, onClick, viewMode, onContextMenu }) {
  const dateLabel = new Date(folder.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

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
        <span className="project-card__date">Criada {dateLabel}</span>
      </div>
    </div>
  );
}

/* ===== PROJECT CARD (existing project) ===== */
function ProjectCard({
  project,
  onClick,
  onContextMenu,
  viewMode,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  const dateLabel = new Date(project.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

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
        <span className="list-item__date">Editado {dateLabel}</span>
        {!selectionMode && (
          <button
            className="list-item__options"
            onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
            aria-label="Opções"
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
        <span className="project-card__date">Editado {dateLabel}</span>
      </div>
    </div>
  );
}

/* ===== EMPTY STATE ===== */
function ProjectsEmptyState() {
  return (
    <div className="empty-state">
      <Inbox className="empty-state__icon" />
      <p className="empty-state__text">
        Nenhum projeto recente encontrado.
      </p>
      <p className="empty-state__hint">
        Crie seu primeiro projeto clicando ao lado.
      </p>
    </div>
  );
}

/* ===== FOLDER EMPTY STATE ===== */
function FolderEmptyState({ onAddContent }) {
  return (
    <div className="folder-empty-state" onClick={onAddContent} role="button" tabIndex={0}>
      <FolderOpen className="folder-empty-state__icon" />
      <span className="folder-empty-state__text">Pasta vazia, adicionar conteúdo</span>
      <span className="folder-empty-state__hint">Clique para selecionar projetos</span>
    </div>
  );
}

/* ===== SEARCH EMPTY STATE ===== */
function SearchEmptyState() {
  return (
    <div className="empty-state">
      <SearchX className="empty-state__icon" />
      <p className="empty-state__text">
        Nenhum item encontrado para sua pesquisa
      </p>
    </div>
  );
}

/* ===== MAIN DASHBOARD ===== */
export default function Dashboard({
  projects,
  folders,
  activities,
  onCreateProject,
  onOpenProject,
  onUpdateProject,
  onRenameProject,
  onDeleteProject,
  onDuplicateProject,
  onMoveProject,
  onCreateFolder,
  onDeleteFolder,
  showToast,
}) {
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

  /* Confirmation modal state */
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, projectId: null, projectName: '' });

  /* Rename modal state */
  const [renameModal, setRenameModal] = useState({ isOpen: false, projectId: null, currentName: '' });

  const handleNotImplemented = useCallback(
    (featureName) => {
      showToast(`"${featureName}" ainda não foi implementado.`);
    },
    [showToast]
  );

  /* Current folder object */
  const currentFolder = useMemo(
    () => folders.find((f) => f.id === currentFolderId) || null,
    [folders, currentFolderId]
  );

  /* Filtered items based on current directory and search */
  const { filteredProjects, filteredFolders } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let visibleProjects;
    let visibleFolders;

    if (selectionMode) {
      // In selection mode, show root-level projects only
      visibleProjects = projects.filter((p) => p.folderId === null);
      visibleFolders = [];
    } else if (currentFolderId) {
      // Inside a folder
      visibleProjects = projects.filter((p) => p.folderId === currentFolderId);
      visibleFolders = [];
    } else {
      // Root level
      visibleProjects = projects.filter((p) => p.folderId === null);
      visibleFolders = folders;
    }

    if (query) {
      visibleProjects = visibleProjects.filter((p) =>
        p.name.toLowerCase().includes(query)
      );
      visibleFolders = visibleFolders.filter((f) =>
        f.name.toLowerCase().includes(query)
      );
    }

    return { filteredProjects: visibleProjects, filteredFolders: visibleFolders };
  }, [projects, folders, searchQuery, currentFolderId, selectionMode]);

  /* Modal handlers */
  const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const handleImportHTML = useCallback((projectName) => {
    setIsModalOpen(false);
    onCreateProject(projectName, currentFolderId);
  }, [onCreateProject, currentFolderId]);

  const handleOpenTutorial = useCallback(() => {
    showToast('Esta funcionalidade ainda não foi implementada.');
  }, [showToast]);

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
    showToast(`${count} ${count === 1 ? 'projeto movido' : 'projetos movidos'} com sucesso.`);
    setSelectionMode(false);
    setCurrentFolderId(selectionTargetFolderId);
    setSelectionTargetFolderId(null);
    setSelectedProjectIds(new Set());
  }, [selectedProjectIds, selectionTargetFolderId, onMoveProject, showToast]);

  /* Context menu */
  const handleContextMenu = useCallback((e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      project,
    });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  /* Section title */
  const sectionTitle = selectionMode
    ? 'Selecione projetos para mover'
    : currentFolder
      ? currentFolder.name
      : 'Bem-vindo de volta!';

  const hasItems = filteredProjects.length > 0 || filteredFolders.length > 0;
  const isSearching = searchQuery.trim().length > 0;
  const isInsideFolder = currentFolderId !== null && !selectionMode;
  const isFolderEmpty = isInsideFolder && filteredProjects.length === 0 && !isSearching;

  return (
    <div className="app-shell">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewFolder={() => setIsFolderModalOpen(true)}
        onNotImplemented={handleNotImplemented}
      />

      <main className="main-content" id="main-content">
        {/* Section header */}
        <div className="section-header">
          <div className="section-header__left">
            {(isInsideFolder || selectionMode) && (
              <button
                className="section-header__back"
                onClick={selectionMode ? cancelSelectionMode : goToRoot}
                aria-label="Voltar"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
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
                Grade
              </button>
              <button
                className={`view-toggle__btn ${viewMode === 'list' ? 'view-toggle__btn--active' : 'view-toggle__btn--inactive'}`}
                onClick={() => setViewMode('list')}
              >
                <List size={13} />
                Lista
              </button>
            </div>
          )}
        </div>

        {/* Projects area */}
        <div className="projects-area">
          {isFolderEmpty ? (
            <FolderEmptyState onAddContent={() => startSelectionMode(currentFolderId)} />
          ) : (
            <div className={viewMode === 'list' ? 'projects-list' : 'projects-grid'} id="projects-grid">
              {!selectionMode && !isInsideFolder && (
                <NewProjectCard onClick={handleOpenModal} viewMode={viewMode} />
              )}

              {/* Folders (only at root level) */}
              {filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={enterFolder}
                  viewMode={viewMode}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Simple folder context: just delete
                    setContextMenu(null);
                    // Use a confirm for folder deletion
                    setConfirmModal({
                      isOpen: true,
                      projectId: folder.id,
                      projectName: folder.name,
                      isFolder: true,
                    });
                  }}
                />
              ))}

              {/* Projects */}
              {filteredProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={onOpenProject}
                  onContextMenu={(e) => handleContextMenu(e, p)}
                  viewMode={viewMode}
                  selectionMode={selectionMode}
                  isSelected={selectedProjectIds.has(p.id)}
                  onToggleSelect={toggleProjectSelection}
                />
              ))}

              {/* Empty states */}
              {!hasItems && !selectionMode && !isInsideFolder && <ProjectsEmptyState />}
              {isSearching && !hasItems && <SearchEmptyState />}
            </div>
          )}
        </div>

        {/* Selection mode floating bar */}
        {selectionMode && (
          <div className="selection-bar">
            <span className="selection-bar__count">
              {selectedProjectIds.size} {selectedProjectIds.size === 1 ? 'projeto selecionado' : 'projetos selecionados'}
            </span>
            <div className="selection-bar__actions">
              <button className="selection-bar__cancel" onClick={cancelSelectionMode}>
                Cancelar
              </button>
              <button
                className="selection-bar__confirm"
                onClick={confirmSelection}
                disabled={selectedProjectIds.size === 0}
              >
                Confirmar e Mover
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {!selectionMode && (
          <AtividadeRecente activities={activities} />
        )}
      </main>

      {/* Footer */}
      <footer className="footer" id="footer">
        <span className="footer__copyright">
          © 2026 FANCY AND ORGANIZED UX INC
        </span>
        <nav className="footer__links">
          <a className="footer__link" href="#" onClick={(e) => e.preventDefault()}>
            TERMOS
          </a>
          <a className="footer__link" href="#" onClick={(e) => e.preventDefault()}>
            PRIVACIDADE
          </a>
          <a className="footer__link" href="#" onClick={(e) => e.preventDefault()}>
            SUPORTE
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onOpen={() => onOpenProject(contextMenu.project.id)}
          onRename={() => {
            setRenameModal({
              isOpen: true,
              projectId: contextMenu.project.id,
              currentName: contextMenu.project.name,
            });
          }}
          onMoveTo={(targetFolderId) => {
            onMoveProject(contextMenu.project.id, targetFolderId);
            const targetFolder = folders.find((f) => f.id === targetFolderId);
            showToast(`Projeto movido para '${targetFolder ? targetFolder.name : 'Raiz'}'.`);
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

      {/* Confirmation Modal */}
      <ModalConfirm
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, projectId: null, projectName: '' })}
        onConfirm={() => {
          if (confirmModal.isFolder) {
            onDeleteFolder(confirmModal.projectId);
          } else {
            onDeleteProject(confirmModal.projectId);
          }
        }}
        title={confirmModal.isFolder ? 'Excluir pasta' : 'Excluir projeto'}
        message={`Tem certeza que deseja excluir "${confirmModal.projectName}"? ${confirmModal.isFolder ? 'Os projetos dentro dela serão movidos para a raiz.' : 'Esta ação não pode ser desfeita.'}`}
      />

      {/* Rename Modal */}
      <ModalRenomear
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, projectId: null, currentName: '' })}
        onRename={(newName) => onRenameProject(renameModal.projectId, newName)}
        currentName={renameModal.currentName}
      />
    </div>
  );
}
