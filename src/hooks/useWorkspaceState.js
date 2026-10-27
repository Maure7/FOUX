import { useState, useRef, useEffect } from 'react';
import { appStorage } from '../services/appStorage';
import { readJson, normalizeCollection, normalizeProfile, normalizeTheme } from '../services/workspaceData';
import { migrateLegacyActivity } from '../utils/activityI18n';

const STORAGE_KEY = 'foux_projects';
const ACTIVE_KEY = 'foux_active_project';
const FOLDERS_KEY = 'foux_folders';
const ACTIVITIES_KEY = 'foux_activities';
const THEME_KEY = 'foux_theme';
const PROFILE_KEY = 'foux_user_profile';
const GLOBAL_TUTORIAL_TIPS_KEY = 'foux_global_tutorial_tips';

function saveToStorage(key, value) {
  try {
    appStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
}

function saveActiveProjectId(id) {
  try {
    if (id) {
      appStorage.setItem(ACTIVE_KEY, id);
    } else {
      appStorage.removeItem(ACTIVE_KEY);
    }
  } catch (e) {
    console.warn('Erro ao salvar projeto ativo:', e);
  }
}

function saveTheme(theme) {
  try {
    appStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('Erro ao salvar tema:', e);
  }
}

export default function useWorkspaceState() {
  const [projects, setProjects] = useState(() => readJson(STORAGE_KEY, [], value => normalizeCollection(value, 'projects')));

  const [folders, setFolders] = useState(() => readJson(FOLDERS_KEY, [], value => normalizeCollection(value, 'folders')));

  const [activities, setActivities] = useState(() => {
    try {
      const saved = appStorage.getItem(ACTIVITIES_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(migrateLegacyActivity).filter(Boolean);
    } catch (e) {
      console.error("Erro ao carregar atividades:", e);
      return [];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    try {
      return appStorage.getItem(ACTIVE_KEY) || null;
    } catch (e) {
      console.error("Erro ao carregar projeto ativo:", e);
      return null;
    }
  });

  /* Chave de tema isolada e desacoplada */
  const [theme, setTheme] = useState(() => {
    try {
      return normalizeTheme(appStorage.getItem(THEME_KEY));
    } catch (e) {
      console.error("Erro ao carregar tema:", e);
      return 'dark';
    }
  });

  const [userProfile, setUserProfile] = useState(() => readJson(PROFILE_KEY, normalizeProfile(null), normalizeProfile));

  const [globalTutorialTips, setGlobalTutorialTips] = useState(() => {
    try {
      const saved = appStorage.getItem(GLOBAL_TUTORIAL_TIPS_KEY);
      return saved !== null && typeof JSON.parse(saved) === 'boolean' ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  /* Guardas de carregamento para evitar sobrescrever localStorage no mount inicial */
  const isProjectsLoadedRef = useRef(false);
  const isFoldersLoadedRef = useRef(false);
  const isActivitiesLoadedRef = useRef(false);
  const isProfileLoadedRef = useRef(false);

  /* Persistência segura no localStorage (evita sobrescrita durante inicialização) */
  useEffect(() => {
    if (!isProjectsLoadedRef.current) {
      isProjectsLoadedRef.current = true;
      return;
    }
    saveToStorage(STORAGE_KEY, projects);
  }, [projects]);

  useEffect(() => {
    if (!isFoldersLoadedRef.current) {
      isFoldersLoadedRef.current = true;
      return;
    }
    saveToStorage(FOLDERS_KEY, folders);
  }, [folders]);

  useEffect(() => {
    if (!isActivitiesLoadedRef.current) {
      isActivitiesLoadedRef.current = true;
      return;
    }
    saveToStorage(ACTIVITIES_KEY, activities);
  }, [activities]);

  useEffect(() => {
    saveActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    if (!isProfileLoadedRef.current) {
      isProfileLoadedRef.current = true;
      return;
    }
    saveToStorage(PROFILE_KEY, userProfile);
  }, [userProfile]);

  /* Persistir globalTutorialTips no localStorage */
  useEffect(() => {
    try {
      appStorage.setItem(GLOBAL_TUTORIAL_TIPS_KEY, JSON.stringify(globalTutorialTips));
    } catch (e) {
      console.warn('Erro ao salvar config tutorial:', e);
    }
  }, [globalTutorialTips]);

  /* Apply theme to DOM root — Isolado exclusivamente na chave foux_theme */
  useEffect(() => {
    saveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { projects, setProjects, folders, setFolders, activities, setActivities,
    activeProjectId, setActiveProjectId, theme, setTheme, userProfile, setUserProfile,
    globalTutorialTips, setGlobalTutorialTips };
}
