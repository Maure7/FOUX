import { ArrowLeft } from 'lucide-react';
import '../styles/Dashboard.css';

/* ===================================================================
   Settings — Página dedicada de configurações.
   Sem emojis, sem descrições verbosas. Design limpo FOUX.
   =================================================================== */

const THEMES = [
  { id: 'dark', name: 'Padrão FOUX' },
  { id: 'light', name: 'Padrão Light' },
  { id: 'solarized', name: 'Osaka Solarized Pro' },
];

export default function Settings({ onNavigate, currentTheme, onThemeChange, showToast }) {
  return (
    <div className="settings-page">
      {/* Header */}
      <header className="settings-page__header">
        <button
          className="settings-page__back"
          onClick={() => onNavigate('dashboard')}
          aria-label="Voltar"
        >
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
        <h1 className="settings-page__title">Configurações</h1>
      </header>

      <div className="settings-page__body">
        {/* ── TEMA ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">Tema da Interface</h2>
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="theme-select">
              Selecione o tema
            </label>
            <select
              id="theme-select"
              className="settings-select"
              value={currentTheme}
              onChange={(e) => onThemeChange(e.target.value)}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </section>

        <div className="settings-divider" />

        {/* ── IDIOMA ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">Idioma</h2>
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Português (BR)</span>
              <span className="settings-row__badge">Em Breve</span>
            </div>
            <button
              className="settings-row__btn"
              onClick={() => showToast('Função ainda não implementada')}
            >
              Alterar
            </button>
          </div>
        </section>

        <div className="settings-divider" />

        {/* ── DADOS LOCAIS ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">Dados Locais</h2>
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">Limpar cache local</span>
              <span className="settings-row__hint">Remove dados temporários do navegador</span>
            </div>
            <button
              className="settings-row__btn settings-row__btn--danger"
              onClick={() => showToast('Função ainda não implementada')}
            >
              Limpar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
