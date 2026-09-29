import { useEffect } from 'react';
import { X, Sun, Moon, Monitor, Globe, Trash2, Sparkles } from 'lucide-react';

/* ===================================================================
   ConfigModal — Modal de configurações com seletor de temas,
   idioma (em breve) e limpar cache (em breve).
   =================================================================== */

const THEMES = [
  {
    id: 'dark',
    name: 'Padrão FOUX',
    description: 'Dark mode pra editar e descansar a visão',
    icon: Moon,
    colors: ['#17141c', '#211d28', '#d4903f', '#e5a45c'],
  },
  {
    id: 'light',
    name: 'Padrão Light',
    description: 'Modo de alto contraste para telas mais escuras',
    icon: Sun,
    colors: ['#ffffff', '#0a0a0a', '#f4f4f5', '#27272a'],
  },
  {
    id: 'solarized',
    name: 'Osaka Solarized Pro',
    description: 'Visual moderno e chill para quem gosta de algo diferente',
    icon: Monitor,
    colors: ['#002b36', '#073642', '#268bd2', '#2aa198'],
  },
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    description: 'Visual apenas para debug e testes, fora da versão final',
    icon: Sparkles,
    colors: ['#070919', '#151638', '#a855f7', '#f59e0b'],
  },
];

export default function ConfigModal({ isOpen, onClose, currentTheme, onThemeChange, showToast }) {
  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* Prevent body scroll */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card foux-config-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-modal-title"
      >
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="config-modal-title">Configurações</h2>
          <p className="modal-subtitle">Personalize sua experiência no FOUX</p>
        </div>

        {/* ── TEMAS ── */}
        <div className="foux-config-section">
          <h3 className="foux-config-section__title">Tema da Interface</h3>
          <div className="foux-config-themes">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              const isActive = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  className={`foux-config-theme-card ${isActive ? 'foux-config-theme-card--active' : ''}`}
                  onClick={() => onThemeChange(theme.id)}
                >
                  <div className="foux-config-theme-card__preview">
                    {theme.colors.map((c, i) => (
                      <div
                        key={i}
                        className="foux-config-theme-card__swatch"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="foux-config-theme-card__info">
                    <div className="foux-config-theme-card__name-row">
                      <Icon size={14} />
                      <span className="foux-config-theme-card__name">{theme.name}</span>
                    </div>
                    <span className="foux-config-theme-card__desc">{theme.description}</span>
                  </div>
                  {isActive && <div className="foux-config-theme-card__check">✓</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── IDIOMA ── */}
        <div className="foux-config-section">
          <h3 className="foux-config-section__title">
            <Globe size={15} />
            Idioma
          </h3>
          <div className="foux-config-row">
            <div className="foux-config-row__info">
              <span className="foux-config-row__label">Português (BR)</span>
              <span className="foux-config-row__badge">[Em Breve]</span>
            </div>
            <button
              className="foux-config-row__btn"
              onClick={() => showToast('Função ainda não implementada')}
            >
              Alterar
            </button>
          </div>
        </div>

        {/* ── LIMPAR CACHE ── */}
        <div className="foux-config-section">
          <h3 className="foux-config-section__title">
            <Trash2 size={15} />
            Dados Locais
          </h3>
          <div className="foux-config-row">
            <div className="foux-config-row__info">
              <span className="foux-config-row__label">Limpar cache local</span>
              <span className="foux-config-row__hint">Remove dados temporários do navegador</span>
            </div>
            <button
              className="foux-config-row__btn foux-config-row__btn--danger"
              onClick={() => showToast('Função ainda não implementada')}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
