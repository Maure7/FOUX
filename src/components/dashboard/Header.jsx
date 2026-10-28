import { activateOnKey } from '../../utils/keyboard';
import { Search, Settings, FolderPlus, HelpCircle, User } from 'lucide-react';

export default function Header({ searchQuery, onSearchChange, onNewFolder, onOpenConfig, onOpenProfile, onOpenFaq, userProfile, t }) {
  return (
    <header className="header" id="header">
      <span className="header__logo">FOUX</span>

      <div className="header__controls">
        <div className="header__search">
          <Search className="header__search-icon" />
          <input
            className="header__search-input"
            type="text"
            placeholder={t('dashboard.searchPlaceholder')}
            aria-label={t('dashboard.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          className="header__icon-btn"
          aria-label={t('settings.title')}
          onClick={onOpenConfig}
        >
          <Settings size={17} />
        </button>

        <button
          className="header__new-folder"
          aria-label={t('dashboard.newFolder')}
          onClick={onNewFolder}
        >
          <FolderPlus size={15} />
          <span>{t('dashboard.newFolder')}</span>
        </button>

        <button
          className="header__icon-btn"
          aria-label={t('dashboard.help')}
          onClick={onOpenFaq}
        >
          <HelpCircle size={17} />
        </button>

        <div
          className="header__avatar-wrapper"
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          aria-label={t('profile.title')}
          title={t('profile.title')}
          onKeyDown={(event) => activateOnKey(event, () => onOpenProfile())}
        >
          <div className="header__avatar-placeholder">
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt="Avatar" className="header__avatar-img" />
            ) : (
              <User size={16} />
            )}
          </div>
          <span className="header__avatar-status" />
        </div>
      </div>
    </header>
  );
}

