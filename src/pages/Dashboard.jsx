import { useState, useCallback } from 'react';
import {
  Search,
  Settings,
  FolderPlus,
  HelpCircle,
  Plus,
  User,
  Inbox,
  FileCode,
} from 'lucide-react';
import ModalNovoProjeto from '../components/ModalNovoProjeto';
import AtividadeRecente from '../components/AtividadeRecente';
import '../styles/Dashboard.css';

/* ===== HEADER ===== */
function Header({ searchQuery, onSearchChange, onNotImplemented }) {
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
          onClick={() => onNotImplemented('Nova Pasta')}
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
function NewProjectCard({ onClick }) {
  return (
    <div
      className="project-card project-card--new"
      id="card-new-project"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <div className="new-project__icon">
        <Plus size={22} />
      </div>
      <span className="new-project__title">Novo Projeto</span>
      <span className="new-project__subtitle">Começar do zero</span>
    </div>
  );
}

/* ===== PROJECT CARD (existing project) ===== */
function ProjectCard({ project, onClick }) {
  const dateLabel = new Date(project.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div
      className="project-card project-card--saved"
      onClick={() => onClick(project.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick(project.id);
      }}
    >
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

/* ===== EMPTY STATE (projects) ===== */
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

/* ===== MAIN DASHBOARD ===== */
export default function Dashboard({
  projects,
  onCreateProject,
  onOpenProject,
  activities,
  showToast,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNotImplemented = useCallback(
    (featureName) => {
      showToast(`"${featureName}" ainda não foi implementado.`);
    },
    [showToast]
  );

  /* Modal handlers */
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleImportHTML = useCallback((projectName) => {
    setIsModalOpen(false);
    onCreateProject(projectName);
  }, [onCreateProject]);

  const handleOpenTutorial = useCallback(() => {
    // Tutorial not available — show toast, do NOT navigate or create project
    showToast('Esta funcionalidade ainda não foi implementada.');
  }, [showToast]);

  /* Filter projects by search */
  const filteredProjects = searchQuery.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  return (
    <div className="app-shell">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNotImplemented={handleNotImplemented}
      />

      <main className="main-content" id="main-content">
        {/* Section header */}
        <div className="section-header">
          <h1 className="section-header__title">Bem-vindo de volta!</h1>
          <div className="view-toggle" id="view-toggle">
            <button
              className="view-toggle__btn view-toggle__btn--active"
              onClick={() => handleNotImplemented('Visualização em Grade')}
            >
              Grade
            </button>
            <button
              className="view-toggle__btn view-toggle__btn--inactive"
              onClick={() => handleNotImplemented('Visualização em Lista')}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Projects area */}
        <div className="projects-area">
          <div className="projects-grid" id="projects-grid">
            <NewProjectCard onClick={handleOpenModal} />

            {filteredProjects.length > 0 ? (
              filteredProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={onOpenProject}
                />
              ))
            ) : (
              <ProjectsEmptyState />
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <AtividadeRecente
          activities={activities}
          onNotImplemented={handleNotImplemented}
        />
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
    </div>
  );
}
