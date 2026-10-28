import useWorkspaceState from './hooks/useWorkspaceState';
import useInputModality from './hooks/useInputModality';
import { appStorage } from './services/appStorage';
import { useState, useCallback, lazy, Suspense } from 'react';
import Dashboard from './pages/Dashboard';
const Editor = lazy(() => import('./pages/Editor'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
import { useToast, ToastContainer } from './components/ui/ToastNotification';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { TUTORIAL_PROJECT_NAME } from './utils/tutorialTemplate';
import { getTutorialHtml, isTutorialProject } from './utils/tutorialI18n';
import { migrateLegacyActivity } from './utils/activityI18n';
import { TooltipProvider } from './components/ui/Tooltip';
import { TUTORIAL_COMPLETED_KEY } from './utils/tutorialTour';

let idCounter = Date.now();
function nextId(prefix = 'id') {
  return `${prefix}_${++idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function AppContent() {
  useInputModality();
  const { language, t } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  /* Inicialização segura e preguiçosa de estado (Lazy State Initialization) */
  const { projects, setProjects, folders, setFolders, activities, setActivities,
    activeProjectId, setActiveProjectId, theme, setTheme, userProfile, setUserProfile,
    globalTutorialTips, setGlobalTutorialTips } = useWorkspaceState();

  const { toasts, showToast, dismissToast, pauseToast, resumeToast } = useToast();

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
  }, [setUserProfile]);

  /* Limpeza suave de dados locais sem crash */
  const handleClearCache = useCallback(() => {
    setProjects([]);
    setFolders([]);
    setActivities([]);
    setActiveProjectId(null);
  }, [setActiveProjectId, setActivities, setFolders, setProjects]);

  /* Get the active project object */
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const addActivity = useCallback((actionOrConfig, params = {}, type = 'project') => {
    let activityRecord;
    if (actionOrConfig && typeof actionOrConfig === 'object') {
      const actKey = actionOrConfig.actionKey || null;
      activityRecord = {
        id: actionOrConfig.id || nextId('act'),
        actionKey: actKey,
        params: actionOrConfig.params || {},
        type: actionOrConfig.type || (actKey && actKey.includes('folder') ? 'folder' : 'project'),
        timestamp: typeof actionOrConfig.timestamp === 'number'
          ? actionOrConfig.timestamp
          : (actionOrConfig.timestamp ? new Date(actionOrConfig.timestamp).getTime() : Date.now()),
      };
    } else if (typeof actionOrConfig === 'string') {
      if (actionOrConfig.startsWith('activity.')) {
        activityRecord = {
          id: nextId('act'),
          actionKey: actionOrConfig,
          params: params || {},
          type: type || (actionOrConfig.includes('folder') ? 'folder' : 'project'),
          timestamp: Date.now(),
        };
      } else {
        activityRecord = migrateLegacyActivity({
          id: nextId('act'),
          text: actionOrConfig,
          timestamp: Date.now(),
        });
      }
    }

    if (activityRecord) {
      setActivities((prev) => [activityRecord, ...prev]);
    }
  }, [setActivities]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, [setActivities]);

  const removeActivity = useCallback((activityId) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }, [setActivities]);

  const handleThemeChange = useCallback((newTheme) => {
    setTheme(newTheme);
  }, [setTheme]);

  const handleGlobalTutorialTipsChange = useCallback((enabled) => {
    setGlobalTutorialTips(enabled);
  }, [setGlobalTutorialTips]);

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
    addActivity({
      actionKey: 'activity.create_folder',
      params: { name },
      type: 'folder',
    });
    return id;
  }, [addActivity, setFolders]);

  const toggleFolderFavorite = useCallback((folderId) => {
    const folder = folders.find(item => item.id === folderId);
    if (!folder) return;
    const favorite = !(folder.favorite || folder.isFavorite);
    setFolders(previous => previous.map(item => item.id === folderId ? { ...item, favorite, isFavorite: favorite } : item));
    addActivity({ actionKey: favorite ? 'activity.pin_folder' : 'activity.unpin_folder', params: { name: folder.name }, type: 'folder' });
  }, [folders, setFolders, addActivity]);

  const renameFolder = useCallback((folderId, newName) => {
    const folder = folders.find(item => item.id === folderId);
    if (!folder || folder.name === newName) return;
    setFolders(previous => previous.map(item => item.id === folderId ? { ...item, name: newName } : item));
    addActivity({ actionKey: 'activity.rename_folder', params: { oldName: folder.name, newName }, type: 'folder' });
  }, [folders, setFolders, addActivity]);

  const changeFolderColor = useCallback((folderId, newColor) => {
    const folder = folders.find(item => item.id === folderId);
    if (!folder || folder.borderColor === newColor) return;
    setFolders(previous => previous.map(item => item.id === folderId ? { ...item, borderColor: newColor } : item));
    addActivity({ actionKey: 'activity.change_folder_color', params: { name: folder.name }, type: 'folder' });
  }, [folders, setFolders, addActivity]);

  const createProject = useCallback((name, folderId = null) => {
    const id = nextId('proj');
    const newProject = {
      id,
      name: name || t('editor.untitledProject'),
      folderId,
      favorite: false,
      htmlFileName: null,
      htmlContent: null,
      showTutorialTips: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(id);
    setCurrentScreen('editor');
    addActivity({
      actionKey: 'activity.open_project',
      params: { name: newProject.name },
      type: 'project',
    });
  }, [addActivity, setActiveProjectId, setProjects, t]);

  const createTutorialProject = useCallback(() => {
    const id = nextId('proj');
    const newProject = {
      id,
      name: TUTORIAL_PROJECT_NAME,
      folderId: null,
      favorite: false,
      htmlFileName: 'tutorial.html',
      htmlContent: getTutorialHtml(language),
      template: 'tutorial',
      showTutorialTips: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(id);
    setCurrentScreen('editor');
    addActivity({
      actionKey: 'activity.open_tutorial',
      params: {},
      type: 'project',
    });
  }, [addActivity, language, setActiveProjectId, setProjects]);

  const openProject = useCallback((projectId) => {
    setActiveProjectId(projectId);
    setCurrentScreen('editor');
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      addActivity({
        actionKey: 'activity.open_project',
        params: { name: proj.name },
        type: 'project',
      });
    }
  }, [setActiveProjectId, projects, addActivity]);

  const updateProject = useCallback((projectId, updates) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;

        // Blindagem contra sobrescrita com HTML vazio / cerca de tags vazias
        if (updates.htmlContent !== undefined && p.htmlContent) {
          const newHtml = updates.htmlContent;
          const isBlank =
            !newHtml ||
            typeof newHtml !== 'string' ||
            newHtml
              .replace(/<!DOCTYPE[^>]*>/gi, '')
              .replace(/<\/?(html|head|body)[^>]*>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<base[^>]*>/gi, '')
              .trim().length === 0;

          if (isBlank) {
            console.warn('Proteção de integridade FOUX: tentativa de sobrescrever htmlContent com documento vazio bloqueada.');
            const safeUpdates = { ...updates };
            delete safeUpdates.htmlContent;
            return { ...p, ...safeUpdates, updatedAt: new Date().toISOString() };
          }
        }

        return { ...p, ...updates, updatedAt: new Date().toISOString() };
      })
    );
  }, [setProjects]);

  const renameProject = useCallback((projectId, newName) => {
    const project = projects.find(item => item.id === projectId);
    if (!project || project.name === newName) return;
    setProjects(previous => previous.map(item => item.id === projectId ? { ...item, name: newName, updatedAt: new Date().toISOString() } : item));
    addActivity({ actionKey: 'activity.rename_project', params: { oldName: project.name, newName }, type: 'project' });
  }, [projects, setProjects, addActivity]);

  const deleteProject = useCallback((projectId) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    setProjects(previous => previous.filter(item => item.id !== projectId));
    if (activeProjectId === projectId) setActiveProjectId(null);
    addActivity({ actionKey: 'activity.delete_project', params: { name: project.name }, type: 'project' });
  }, [projects, activeProjectId, setProjects, setActiveProjectId, addActivity]);

  const duplicateProject = useCallback((projectId) => {
    const original = projects.find(item => item.id === projectId);
    if (!original) return;
    const clone = { ...original, id: nextId('proj'), name: original.name + ' (' + t('common.copy') + ')', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setProjects(previous => [clone, ...previous]);
    addActivity({ actionKey: 'activity.duplicate_project', params: { name: original.name }, type: 'project' });
  }, [projects, setProjects, addActivity, t]);

  const moveProject = useCallback((projectId, targetFolderId) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, folderId: targetFolderId, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, [setProjects]);

  const toggleProjectFavorite = useCallback((projectId) => {
    const project = projects.find(item => item.id === projectId);
    if (!project) return;
    const favorite = !(project.favorite || project.isFavorite);
    setProjects(previous => previous.map(item => item.id === projectId ? { ...item, favorite, isFavorite: favorite } : item));
    addActivity({ actionKey: favorite ? 'activity.pin_project' : 'activity.unpin_project', params: { name: project.name }, type: 'project' });
  }, [projects, setProjects, addActivity]);

  const deleteFolder = useCallback((folderId) => {
    const folder = folders.find(item => item.id === folderId);
    if (!folder) return;
    setProjects(previous => previous.map(item => item.folderId === folderId ? { ...item, folderId: null } : item));
    setFolders(previous => previous.filter(item => item.id !== folderId));
    addActivity({ actionKey: 'activity.delete_folder', params: { name: folder.name }, type: 'folder' });
  }, [folders, setFolders, setProjects, addActivity]);

  return (
    <>
      <Suspense fallback={<div className="app-loading" role="status">{t('common.loading')}</div>}>
      {currentScreen === 'editor' && activeProject ? (
        <Editor
          key={activeProject.id}
          project={activeProject}
          onUpdateProject={(updates) => updateProject(activeProject.id, updates)}
          onRenameProject={(newName) => renameProject(activeProject.id, newName)}
          onNavigate={navigateTo}
          showToast={showToast}
          addActivity={addActivity}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          userProfile={userProfile}
          globalTutorialTips={globalTutorialTips}
        />
      ) : currentScreen === 'settings' ? (
        <Settings
          onNavigate={navigateTo}
          previousScreen={previousScreen}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          showToast={showToast}
          onClearCache={handleClearCache}
          globalTutorialTips={globalTutorialTips}
          onGlobalTutorialTipsChange={handleGlobalTutorialTipsChange}
          onRestartTutorial={() => {
            try { appStorage.removeItem(TUTORIAL_COMPLETED_KEY); } catch { /* Continue in memory. */ }
            setGlobalTutorialTips(true);
            setProjects((prev) => prev.map((p) => isTutorialProject(p) ? { ...p, showTutorialTips: true } : p));
            if (activeProject && isTutorialProject(activeProject)) setCurrentScreen('editor');
          }}
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
          onCreateTutorialProject={createTutorialProject}
        />
      )}

      </Suspense>
      {/* Global toast layer */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} onPause={pauseToast} onResume={resumeToast} />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <TooltipProvider><AppContent /></TooltipProvider>
    </LanguageProvider>
  );
}
