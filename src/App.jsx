import { useState, useCallback, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import { useToast, ToastContainer } from './components/ToastNotification';
import { LanguageProvider } from './context/LanguageContext';

/* ===== LocalStorage helpers ===== */
const STORAGE_KEY = 'foux_projects';
const ACTIVE_KEY = 'foux_active_project';
const FOLDERS_KEY = 'foux_folders';
const ACTIVITIES_KEY = 'foux_activities';
const THEME_KEY = 'foux_theme';
const PROFILE_KEY = 'foux_user_profile';

function loadFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
}

function loadActiveProjectId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch {
    return null;
  }
}

function saveActiveProjectId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch (e) {
    console.warn('Erro ao salvar projeto ativo:', e);
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('Erro ao salvar tema:', e);
  }
}

/* ===== Unique ID generators ===== */
let idCounter = Date.now();
function nextId(prefix = 'id') {
  return `${prefix}_${++idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [projects, setProjects] = useState(() => loadFromStorage(STORAGE_KEY));
  const [folders, setFolders] = useState(() => loadFromStorage(FOLDERS_KEY));
  const [activities, setActivities] = useState(() => loadFromStorage(ACTIVITIES_KEY));
  const [activeProjectId, setActiveProjectId] = useState(() => loadActiveProjectId());
  const [theme, setTheme] = useState(() => loadTheme());
  const [userProfile, setUserProfile] = useState(() =>
    loadFromStorage(PROFILE_KEY, {
      name: 'Usuário FOUX',
      avatar: null,
      bio: '',
    })
  );
  const { toasts, showToast } = useToast();

  /* Track the previous screen for Settings / Profile "back" navigation */
  const [previousScreen, setPreviousScreen] = useState('dashboard');

  /* Navigate wrapper: tracks previous screen for Settings and Profile */
  const navigateTo = useCallback((screen) => {
    if (screen === 'settings' || screen === 'profile') {
      setPreviousScreen(currentScreen);
    }
    setCurrentScreen(screen);
  }, [currentScreen]);

  /* Atualização de perfil do usuário */
  const handleUpdateProfile = useCallback((updates) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  /* Limpeza suave de dados locais sem crash */
  const handleClearCache = useCallback(() => {
    setProjects([]);
    setFolders([]);
    setActivities([]);
    setActiveProjectId(null);
  }, []);

  /* Persist to localStorage whenever state changes */
  useEffect(() => { saveToStorage(STORAGE_KEY, projects); }, [projects]);
  useEffect(() => { saveToStorage(FOLDERS_KEY, folders); }, [folders]);
  useEffect(() => { saveToStorage(ACTIVITIES_KEY, activities); }, [activities]);
  useEffect(() => { saveActiveProjectId(activeProjectId); }, [activeProjectId]);
  useEffect(() => { saveToStorage(PROFILE_KEY, userProfile); }, [userProfile]);

  /* Apply theme to DOM root */
  useEffect(() => {
    saveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* Get the active project object */
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  /* ===== Activity ===== */
  const addActivity = useCallback((text) => {
    const newActivity = {
      id: nextId('act'),
      text,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newActivity, ...prev]);
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  const removeActivity = useCallback((activityId) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }, []);

  /* ===== Theme ===== */
  const handleThemeChange = useCallback((newTheme) => {
    setTheme(newTheme);
  }, []);

  /* ===== Folders ===== */
  const createFolder = useCallback((name, borderColor) => {
    const id = nextId('folder');
    const newFolder = {
      id,
      name,
      borderColor: borderColor || '#e59843',
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [newFolder, ...prev]);
    addActivity(`Criou a pasta '${name}'`);
    return id;
  }, [addActivity]);

  const toggleFolderFavorite = useCallback((folderId) => {
    setFolders((prev) => {
      const folder = prev.find((f) => f.id === folderId);
      if (!folder) return prev;
      const newFav = !folder.favorite;
      setTimeout(() => {
        addActivity(
          newFav
            ? `Marcou pasta '${folder.name}' como favorita`
            : `Removeu pasta '${folder.name}' dos favoritos`
        );
      }, 0);
      return prev.map((f) =>
        f.id === folderId ? { ...f, favorite: newFav } : f
      );
    });
  }, [addActivity]);

  const renameFolder = useCallback((folderId, newName) => {
    setFolders((prev) => {
      const folder = prev.find((f) => f.id === folderId);
      if (!folder) return prev;
      const oldName = folder.name;
      setTimeout(() => {
        addActivity(`Renomeou a pasta de '${oldName}' para '${newName}'`);
      }, 0);
      return prev.map((f) =>
        f.id === folderId ? { ...f, name: newName } : f
      );
    });
  }, [addActivity]);

  const changeFolderColor = useCallback((folderId, newColor) => {
    setFolders((prev) => {
      const folder = prev.find((f) => f.id === folderId);
      if (!folder) return prev;
      setTimeout(() => {
        addActivity(`Alterou a cor da pasta '${folder.name}'`);
      }, 0);
      return prev.map((f) =>
        f.id === folderId ? { ...f, borderColor: newColor } : f
      );
    });
  }, [addActivity]);

  /* ===== Projects ===== */
  const createProject = useCallback((name, folderId = null) => {
    const id = nextId('proj');
    const newProject = {
      id,
      name: name || 'Projeto sem título',
      folderId,
      favorite: false,
      htmlFileName: null,
      htmlContent: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(id);
    setCurrentScreen('editor');
    addActivity(`Abriu '${newProject.name}'`);
  }, [addActivity]);

  const openProject = useCallback((projectId) => {
    setActiveProjectId(projectId);
    setCurrentScreen('editor');
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      addActivity(`Abriu '${proj.name}'`);
    }
  }, [projects, addActivity]);

  const updateProject = useCallback((projectId, updates) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const renameProject = useCallback((projectId, newName) => {
    setProjects((prev) => {
      const old = prev.find((p) => p.id === projectId);
      if (!old) return prev;
      const oldName = old.name;
      const updated = prev.map((p) =>
        p.id === projectId
          ? { ...p, name: newName, updatedAt: new Date().toISOString() }
          : p
      );
      setTimeout(() => {
        addActivity(`Mudou o nome de '${oldName}' para '${newName}'`);
      }, 0);
      return updated;
    });
  }, [addActivity]);

  const deleteProject = useCallback((projectId) => {
    setProjects((prev) => {
      const proj = prev.find((p) => p.id === projectId);
      if (proj) {
        setTimeout(() => addActivity(`Excluiu '${proj.name}'`), 0);
      }
      return prev.filter((p) => p.id !== projectId);
    });
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
    }
  }, [activeProjectId, addActivity]);

  const duplicateProject = useCallback((projectId) => {
    setProjects((prev) => {
      const original = prev.find((p) => p.id === projectId);
      if (!original) return prev;
      const clone = {
        ...original,
        id: nextId('proj'),
        name: `${original.name} (Cópia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTimeout(() => addActivity(`Duplicou '${original.name}'`), 0);
      return [clone, ...prev];
    });
  }, [addActivity]);

  const moveProject = useCallback((projectId, targetFolderId) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, folderId: targetFolderId, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const toggleProjectFavorite = useCallback((projectId) => {
    setProjects((prev) => {
      const proj = prev.find((p) => p.id === projectId);
      if (!proj) return prev;
      const newFav = !proj.favorite;
      setTimeout(() => {
        addActivity(
          newFav
            ? `Marcou '${proj.name}' como favorito`
            : `Removeu '${proj.name}' dos favoritos`
        );
      }, 0);
      return prev.map((p) =>
        p.id === projectId ? { ...p, favorite: newFav } : p
      );
    });
  }, [addActivity]);

  const deleteFolder = useCallback((folderId) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.folderId === folderId ? { ...p, folderId: null } : p
      )
    );
    setFolders((prev) => {
      const folder = prev.find((f) => f.id === folderId);
      if (folder) {
        setTimeout(() => addActivity(`Excluiu a pasta '${folder.name}'`), 0);
      }
      return prev.filter((f) => f.id !== folderId);
    });
  }, [addActivity]);

  return (
    <>
      {currentScreen === 'editor' && activeProject ? (
        <Editor
          project={activeProject}
          onUpdateProject={(updates) => updateProject(activeProject.id, updates)}
          onRenameProject={(newName) => renameProject(activeProject.id, newName)}
          onNavigate={navigateTo}
          showToast={showToast}
          addActivity={addActivity}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          userProfile={userProfile}
        />
      ) : currentScreen === 'settings' ? (
        <Settings
          onNavigate={navigateTo}
          previousScreen={previousScreen}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          showToast={showToast}
          onClearCache={handleClearCache}
        />
      ) : currentScreen === 'profile' ? (
        <Profile
          onNavigate={navigateTo}
          previousScreen={previousScreen}
          totalFolders={folders.length}
          totalProjects={projects.length}
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          showToast={showToast}
        />
      ) : (
        <Dashboard
          projects={projects}
          folders={folders}
          activities={activities}
          userProfile={userProfile}
          onCreateProject={createProject}
          onOpenProject={openProject}
          onUpdateProject={updateProject}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
          onDuplicateProject={duplicateProject}
          onMoveProject={moveProject}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onToggleFolderFavorite={toggleFolderFavorite}
          onRenameFolder={renameFolder}
          onChangeFolderColor={changeFolderColor}
          onToggleProjectFavorite={toggleProjectFavorite}
          onNavigate={navigateTo}
          addActivity={addActivity}
          showToast={showToast}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          onClearActivities={clearActivities}
          onRemoveActivity={removeActivity}
        />
      )}

      {/* Global toast layer */}
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
