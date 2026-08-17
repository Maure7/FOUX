import { ArrowLeft, FileText } from 'lucide-react';
import '../styles/Dashboard.css';

export default function Editor({ onNavigate }) {
  return (
    <div className="editor-shell">
      {/* Editor Header */}
      <header className="editor-header">
        <div className="editor-header__left">
          <button
            className="editor-header__back"
            onClick={() => onNavigate('dashboard')}
            aria-label="Voltar ao Dashboard"
          >
            <ArrowLeft size={15} />
            <span>Voltar</span>
          </button>

          <span
            className="editor-header__logo"
            onClick={() => onNavigate('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNavigate('dashboard');
            }}
          >
            FOUX
          </span>

          <span className="editor-header__title">Novo Projeto</span>
        </div>
      </header>

      {/* Editor Body — blank workspace */}
      <main className="editor-body">
        <div className="editor-body__empty">
          <FileText className="editor-body__icon" />
          <h2 className="editor-body__heading">
            Tela ainda não disponivel.
          </h2>
          <p className="editor-body__sub">
            Função ainda não implementada, volte mais tarde.
          </p>
        </div>
      </main>
    </div>
  );
}
