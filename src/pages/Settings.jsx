import { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { calculateStorageUsage, formatBytes, clearAllStorage } from '../utils/storage';
import ModalConfirm from '../components/ModalConfirm';
import '../styles/Dashboard.css';

/* ===================================================================
   Settings — Página dedicada de configurações (tela inteira).
   Design limpo FOUX, reativo, com suporte a troca de idiomas (i18n)
   e gerenciamento real de cache/armazenamento local.
   =================================================================== */

const THEMES = [
  { id: 'dark' },
  { id: 'light' },
  { id: 'solarized' },
];

export default function Settings({
  onNavigate,
  previousScreen,
  currentTheme,
  onThemeChange,
  showToast,
  onClearCache,
}) {
  const { language, setLanguage, t } = useLanguage();
  // Calcula o tamanho real consumido em bytes no carregamento da tela
  const [storageBytes, setStorageBytes] = useState(() => calculateStorageUsage());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const refreshStorageSize = useCallback(() => {
    const bytes = calculateStorageUsage();
    setStorageBytes(bytes);
  }, []);

  const handleBack = () => {
    onNavigate(previousScreen || 'dashboard');
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    // Atualiza imediatamente o cálculo de bytes pois a nova chave é salva
    setTimeout(refreshStorageSize, 50);
  };

  const handleThemeSelect = (newTheme) => {
    onThemeChange(newTheme);
    setTimeout(refreshStorageSize, 50);
  };

  const handleConfirmClear = () => {
    // 1. Executa a limpeza física do armazenamento local
    clearAllStorage();

    // 2. Notifica a aplicação para redefinir o estado de projetos, pastas e atividades
    if (onClearCache) {
      onClearCache();
    }

    // 3. Zera o contador exibido na tela
    setStorageBytes(0);

    // 4. Exibe o toast discreto de sucesso com o texto no idioma atual
    showToast(t('settings.clearSuccessToast'));
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <header className="settings-page__header">
        <button
          className="settings-page__back"
          onClick={handleBack}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
        <h1 className="settings-page__title">{t('settings.title')}</h1>
      </header>

      <div className="settings-page__body">
        {/* ── TEMA DA INTERFACE ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">{t('settings.themeTitle')}</h2>
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="theme-select">
              {t('settings.themeSelectLabel')}
            </label>
            <select
              id="theme-select"
              className="settings-select"
              value={currentTheme}
              onChange={(e) => handleThemeSelect(e.target.value)}
            >
              {THEMES.map((th) => (
                <option key={th.id} value={th.id}>
                  {t(`settings.themes.${th.id}`)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="settings-divider" />

        {/* ── IDIOMA (i18n Interativo) ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">{t('settings.languageTitle')}</h2>
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="language-select">
              {t('settings.languageSelectLabel')}
            </label>
            <select
              id="language-select"
              className="settings-select"
              value={language}
              onChange={handleLanguageChange}
            >
              <option value="pt">{t('settings.languages.pt')}</option>
              <option value="es">{t('settings.languages.es')}</option>
            </select>
          </div>
        </section>

        <div className="settings-divider" />

        {/* ── DADOS LOCAIS & LIMPEZA DE CACHE ── */}
        <section className="settings-section">
          <h2 className="settings-section__title">{t('settings.storageTitle')}</h2>
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">{t('settings.storageClearLabel')}</span>
              <span className="settings-row__hint">
                {t('settings.storageUsage', { size: formatBytes(storageBytes) })}
              </span>
            </div>
            <button
              className="settings-row__btn settings-row__btn--danger"
              onClick={() => setIsConfirmOpen(true)}
            >
              {t('settings.storageClearBtn')}
            </button>
          </div>
        </section>
      </div>

      {/* Modal de Confirmação para Limpeza de Cache */}
      <ModalConfirm
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmClear}
        title={t('settings.clearConfirmTitle')}
        message={t('settings.clearConfirmMessage')}
        confirmLabel={t('settings.clearConfirmBtn')}
        cancelLabel={t('common.cancel')}
      />
    </div>
  );
}
