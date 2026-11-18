import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { calculateStorageUsage, formatBytes, clearAllStorage } from '../utils/storage';
import ModalConfirm from '../components/ui/ModalConfirm';


const THEMES = [
  { id: 'dark' },
  { id: 'light' },
  { id: 'solarized' },
  { id: 'liquid-glass' },
];

export default function Settings({
  onNavigate,
  previousScreen,
  currentTheme,
  onThemeChange,
  showToast,
  onClearCache,
  globalTutorialTips = true,
  onGlobalTutorialTipsChange,
  onRestartTutorial,
}) {
  const { language, setLanguage, t } = useLanguage();
  const [storageBytes, setStorageBytes] = useState(() => calculateStorageUsage());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const refreshStorageSize = useCallback(() => {
    const bytes = calculateStorageUsage();
    setStorageBytes(bytes);
  }, []);

  // O tema é gravado num efeito do App, que roda depois dos desta tela, então a releitura
  // do tamanho espera um pouco; sair da tela antes cancela o timer.
  const refreshTimerRef = useRef(null);
  const scheduleStorageRefresh = () => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(refreshStorageSize, 50);
  };
  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);

  const handleBack = () => {
    onNavigate(previousScreen || 'dashboard');
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    scheduleStorageRefresh();
  };

  const handleThemeSelect = (newTheme) => {
    onThemeChange(newTheme);
    scheduleStorageRefresh();
  };

  const handleConfirmClear = () => {
    clearAllStorage();

    if (onClearCache) {
      onClearCache();
    }

    setStorageBytes(0);

    showToast(t('settings.clearSuccessToast'));
  };

  return (
    <div className="settings-page">
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

        <section className="settings-section">
          <h2 className="settings-section__title">{t('settings.tutorialTitle')}</h2>
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">{t('settings.tutorialTipsLabel')}</span>
              <span className="settings-row__hint">{t('settings.tutorialTipsHint')}</span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                aria-label={t('settings.tutorialTipsLabel')}
                checked={globalTutorialTips}
                onChange={(e) => {
                  if (onGlobalTutorialTipsChange) {
                    onGlobalTutorialTipsChange(e.target.checked);
                  }
                }}
              />
              <span className="settings-switch__slider" />
            </label>
          </div>
          <button type="button" className="settings-row__btn" onClick={() => {
            onRestartTutorial?.();
            showToast(t('tour.resetSuccess'));
          }}>{t('tour.restart')}</button>
        </section>

        <div className="settings-divider" />

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
