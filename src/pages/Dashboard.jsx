import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Settings,
  FolderPlus,
  HelpCircle,
  Plus,
  User,
  ClipboardList,
  Inbox,
  Clock,
  Info,
} from 'lucide-react';
import '../styles/Dashboard.css';

/* ===== TOAST SYSTEM ===== */
let toastIdCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const showToast = useCallback((message) => {
    const id = ++toastIdCounter;

    setToasts((prev) => [...prev, { id, message, exiting: false }]);

    // Start exit animation after 2.5s, remove after 2.75s
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timersRef.current[id];
      }, 250);
    }, 2500);

    return id;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return { toasts, showToast };
}

function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.exiting ? 'toast--exiting' : ''}`}
        >
          <Info className="toast__icon" />
          <span className="toast__message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ===== HEADER ===== */
function Header({ searchQuery, onSearchChange, onNotImplemented }) {
  return (
    <header className="header" id="header">
      <span className="header__logo">FOUX</span>

      <div className="header__controls">
        {/* Search — controlled input */}
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

/* ===== ACTIVITY EMPTY STATE ===== */
function ActivityEmptyState() {
  return (
    <div className="activity-empty">
      <div className="activity-empty__icon-wrapper">
        <Clock className="activity-empty__icon" />
      </div>
      <span className="activity-empty__text">
        Nenhuma atividade recente registrada.
      </span>
    </div>
  );
}

/* ===== MAIN DASHBOARD ===== */
export default function Dashboard({ onNavigate }) {
  const [projects] = useState([]);
  const [activities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toasts, showToast } = useToast();

  const handleNotImplemented = useCallback(
    (featureName) => {
      showToast(`"${featureName}" ainda não foi implementado.`);
    },
    [showToast]
  );

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
            <NewProjectCard onClick={() => onNavigate('editor')} />

            {projects.length > 0 ? (
              projects.map((p) => (
                <div className="project-card" key={p.id}>
                  <span>{p.title}</span>
                </div>
              ))
            ) : (
              <ProjectsEmptyState />
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <section className="activity-section" id="activity-section">
          <div className="activity-header">
            <div className="activity-header__left">
              <ClipboardList className="activity-header__icon" />
              <h2 className="activity-header__title">Atividade Recente</h2>
            </div>
            <a
              className="activity-header__link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleNotImplemented('Histórico completo');
              }}
            >
              Ver histórico completo
            </a>
          </div>

          {activities.length > 0 ? (
            activities.map((item) => (
              <div className="activity-item" key={item.id}>
                <span>{item.text}</span>
              </div>
            ))
          ) : (
            <ActivityEmptyState />
          )}
        </section>
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

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
