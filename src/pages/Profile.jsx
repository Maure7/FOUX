import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Camera, Trash2, Folder, FileCode, Save, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Dashboard.css';

/* ===================================================================
   Profile — Tela de Perfil do Usuário em página inteira.
   Permite edição de foto (avatar), nome, biografia (máx 300 caracteres)
   e exibe métricas reais calculadas do localStorage.
   =================================================================== */

export default function Profile({
  onNavigate,
  previousScreen,
  totalFolders = 0,
  totalProjects = 0,
  userProfile = {},
  onUpdateProfile,
  showToast,
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(() => userProfile.name || 'Usuário FOUX');
  const [bio, setBio] = useState(() => userProfile.bio || '');
  const [avatar, setAvatar] = useState(() => userProfile.avatar || null);

  const handleBack = () => {
    onNavigate(previousScreen || 'dashboard');
  };

  const handlePhotoSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setAvatar(base64);
        if (onUpdateProfile) {
          onUpdateProfile({ avatar: base64 });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [onUpdateProfile, showToast]);

  const handleRemovePhoto = useCallback(() => {
    setAvatar(null);
    if (onUpdateProfile) {
      onUpdateProfile({ avatar: null });
    }
  }, [onUpdateProfile]);

  const handleBioChange = (e) => {
    const val = e.target.value;
    if (val.length <= 300) {
      setBio(val);
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim() || t('profile.defaultName');
    const updated = {
      name: trimmedName,
      bio: bio.trim(),
      avatar,
    };
    setName(trimmedName);
    if (onUpdateProfile) {
      onUpdateProfile(updated);
    }
    if (showToast) {
      showToast(t('profile.savedSuccess'));
    }
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-page__header">
        <button
          className="profile-page__back"
          onClick={handleBack}
          aria-label={t('common.back')}
        >
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
        <h1 className="profile-page__title">{t('profile.title')}</h1>
      </header>

      {/* Body */}
      <main className="profile-page__body">
        {/* Card do Topo: Avatar e Identificação */}
        <section className="profile-card profile-card--hero">
          <div className="profile-avatar-container">
            <div className="profile-avatar-wrapper">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="profile-avatar__image"
                />
              ) : (
                <div className="profile-avatar__placeholder">
                  <User size={52} />
                </div>
              )}
              {/* Botão de Câmera/Alterar foto */}
              <button
                className="profile-avatar__upload-badge"
                onClick={() => fileInputRef.current?.click()}
                title={t('profile.changePhoto')}
                aria-label={t('profile.changePhoto')}
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />
            </div>
            {avatar && (
              <button
                className="profile-avatar__remove-btn"
                onClick={handleRemovePhoto}
              >
                <Trash2 size={13} />
                <span>{t('profile.removePhoto')}</span>
              </button>
            )}
          </div>

          <div className="profile-hero-info">
            <h2 className="profile-hero-name">{name || t('profile.defaultName')}</h2>
            <span className="profile-hero-tag">FOUX Designer & Creator</span>
          </div>
        </section>

        {/* Informações Pessoais */}
        <section className="profile-card">
          <h3 className="profile-card__heading">{t('profile.title')}</h3>

          {/* Nome do Usuário */}
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="profile-name-input">
              {t('profile.nameLabel')}
            </label>
            <input
              id="profile-name-input"
              className="profile-input"
              type="text"
              placeholder={t('profile.namePlaceholder')}
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Biografia com contador estrito de 300 caracteres */}
          <div className="profile-field">
            <div className="profile-field__label-row">
              <label className="profile-field__label" htmlFor="profile-bio-textarea">
                {t('profile.bioLabel')}
              </label>
              <span className={`profile-bio-counter ${bio.length >= 280 ? 'profile-bio-counter--limit' : ''}`}>
                {t('profile.bioCounter', { count: bio.length })}
              </span>
            </div>
            <textarea
              id="profile-bio-textarea"
              className="profile-textarea"
              placeholder={t('profile.bioPlaceholder')}
              value={bio}
              maxLength={300}
              rows={4}
              onChange={handleBioChange}
            />
          </div>

          {/* Botão Salvar Alterações */}
          <div className="profile-actions">
            <button className="profile-save-btn" onClick={handleSave}>
              <Save size={16} />
              <span>{t('profile.saveBtn')}</span>
            </button>
          </div>
        </section>

        {/* Painel de Estatísticas da Conta (Métricas Reais) */}
        <section className="profile-card">
          <h3 className="profile-card__heading">{t('profile.statsTitle')}</h3>
          <div className="profile-stats-grid">
            {/* Card Pastas Criadas */}
            <div className="profile-stat-card profile-stat-card--folders">
              <div className="profile-stat-card__icon-wrap">
                <Folder size={26} style={{ color: '#e59843' }} />
              </div>
              <div className="profile-stat-card__content">
                <span className="profile-stat-card__value">{totalFolders}</span>
                <span className="profile-stat-card__label">{t('profile.foldersCount')}</span>
              </div>
            </div>

            {/* Card Projetos Criados */}
            <div className="profile-stat-card profile-stat-card--projects">
              <div className="profile-stat-card__icon-wrap">
                <FileCode size={26} style={{ color: '#3b82f6' }} />
              </div>
              <div className="profile-stat-card__content">
                <span className="profile-stat-card__value">{totalProjects}</span>
                <span className="profile-stat-card__label">{t('profile.projectsCount')}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
