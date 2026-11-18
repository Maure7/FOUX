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
import { TooltipProvider } from './components/ui/Tooltip';
import LiquidGlassEngine from './components/ui/LiquidGlassEngine';
import { TUTORIAL_COMPLETED_KEY } from './utils/tutorialTour';
import { forgetSidebarSections } from './hooks/useSidebarSections';

// O painel mostra só as entradas recentes; as antigas apenas inchariam o arquivo salvo.
const MAX_ACTIVITIES = 100;

let idCounter = Date.now();
function nextId(prefix = 'id') {
  return `${prefix}_${++idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function AppContent() {
  useInputModality();
  const { language, t } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  const { projects, setProjects, folders, setFolders, activities, setActivities,
    activeProjectId, setActiveProjectId, theme, setTheme, userProfile, setUserProfile,
    globalTutorialTips, setGlobalTutorialTips } = useWorkspaceState();

  const { toasts, showToast, dismissToast, pauseToast, resumeToast } = useToast();

  // Configurações e Perfil voltam para a tela que os abriu.
  const [previousScreen, setPreviousScreen] = useState('dashboard');
  // Fica aqui para que, ao sair do editor, o painel reabra a pasta em que o usuário estava.
  const [dashboardFolderId, setDashboardFolderId] = useState(null);

  const navigateTo = useCallback((screen) => {
    if (screen === 'settings' || screen === 'profile') {
      setPreviousScreen(currentScreen);
    }
    setCurrentScreen(screen);
  }, [currentScreen]);

  const goHome = useCallback(() => {
    setDashboardFolderId(null);
    setCurrentScreen('dashboard');
  }, []);

  const handleUpdateProfile = useCallback((updates) => {
    setUserProfile((prev) => ({ ...prev, ...updates }));
  }, [setUserProfile]);

  const handleClearCache = useCallback(() => {
    setProjects([]);
    setFolders([]);
    setActivities([]);
    setActiveProjectId(null);
    setDashboardFolderId(null);
  }, [setActiveProjectId, setActivities, setFolders, setProjects]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const addActivity = useCallback(({ actionKey, params = {}, type }) => {
    const record = { id: nextId('act'), actionKey, params, type, timestamp: Date.now() };
    setActivities((prev) => [record, ...prev].slice(0, MAX_ACTIVITIES));
  }, [setActivities]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, [setActivities]);

  const removeActivity = useCallback((activityId) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }, [setActivities]);

  const createFolder = useCallback((name, borderColor, projectIds = []) => {
    const id = nextId('folder');
    const newFolder = {
      id,
      name,
      borderColor: borderColor || '#e59843',
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [newFolder, ...prev]);
    if (projectIds.length) {
      const moving = new Set(projectIds);
      const now = new Date().toISOString();
      setProjects((prev) => prev.map((p) => (moving.has(p.id) ? { ...p, folderId: id, updatedAt: now } : p)));
    }
    addActivity({
      actionKey: 'activity.create_folder',
      params: { name },
      type: 'folder',
    });
    return id;
  }, [addActivity, setFolders, setProjects]);

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

  const createTutorialProject = useCallback((folderId = null) => {
    const id = nextId('proj');
    const newProject = {
      id,
      name: TUTORIAL_PROJECT_NAME,
      folderId,
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
    setProjects((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (p.id !== projectId) return p;
        let safeUpdates = updates;

        // Um iframe descarregando serializa um esqueleto vazio; ele nunca pode
        // sobrescrever um projeto que já tem conteúdo.
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
            safeUpdates = { ...updates };
            delete safeUpdates.htmlContent;
          }
        }

        // Sair do editor salva o documento mesmo sem edição. Isso não pode contar
        // como modificação: o painel ordena por updatedAt e a lista inteira seria regravada.
        if (Object.entries(safeUpdates).every(([key, value]) => Object.is(p[key], value))) return p;
        changed = true;
        return { ...p, ...safeUpdates, updatedAt: new Date().toISOString() };
      });
      return changed ? next : prev;
    });
  }, [setProjects]);

  const renameProject = useCallback((projectId, newName) => {
    const project = projects.find(item => item.id === projectId);
    if (!project || project.name === newName) return;
    setProjects(previous => previous.map(item => item.id === projectId ? { ...item, name: newName, updatedAt: new Date().toISOString() } : item));
    addActivity({ actionKey: 'activity.rename_project', params: { oldName: project.name, newName }, type: 'project' });
  }, [projects, setProjects, addActivity]);

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

  // Ações em lote registram uma atividade por item, como as ações individuais.
  const setProjectsFavorite = useCallback((projectIds, favorite) => {
    const ids = new Set(projectIds);
    const changed = projects.filter(item => ids.has(item.id) && !!(item.favorite || item.isFavorite) !== favorite);
    if (!changed.length) return;
    const changedIds = new Set(changed.map(item => item.id));
    setProjects(previous => previous.map(item => changedIds.has(item.id) ? { ...item, favorite, isFavorite: favorite } : item));
    changed.forEach(item => addActivity({ actionKey: favorite ? 'activity.pin_project' : 'activity.unpin_project', params: { name: item.name }, type: 'project' }));
  }, [projects, setProjects, addActivity]);

  const duplicateProjects = useCallback((projectIds) => {
    const ids = new Set(projectIds);
    const originals = projects.filter(item => ids.has(item.id));
    if (!originals.length) return 0;
    const now = new Date().toISOString();
    const clones = originals.map(original => ({ ...original, id: nextId('proj'), name: original.name + ' (' + t('common.copy') + ')', createdAt: now, updatedAt: now }));
    setProjects(previous => [...clones, ...previous]);
    originals.forEach(original => addActivity({ actionKey: 'activity.duplicate_project', params: { name: original.name }, type: 'project' }));
    return clones.length;
  }, [projects, setProjects, addActivity, t]);

  const moveProjects = useCallback((projectIds, targetFolderId) => {
    const ids = new Set(projectIds);
    const now = new Date().toISOString();
    setProjects(previous => previous.map(item => ids.has(item.id) && item.folderId !== targetFolderId ? { ...item, folderId: targetFolderId, updatedAt: now } : item));
  }, [setProjects]);

  const deleteProjects = useCallback((projectIds) => {
    const ids = new Set(projectIds);
    const removed = projects.filter(item => ids.has(item.id));
    if (!removed.length) return;
    setProjects(previous => previous.filter(item => !ids.has(item.id)));
    forgetSidebarSections(ids);
    if (ids.has(activeProjectId)) setActiveProjectId(null);
    removed.forEach(item => addActivity({ actionKey: 'activity.delete_project', params: { name: item.name }, type: 'project' }));
  }, [projects, activeProjectId, setProjects, setActiveProjectId, addActivity]);

  const setFoldersFavorite = useCallback((folderIds, favorite) => {
    const ids = new Set(folderIds);
    const changed = folders.filter(item => ids.has(item.id) && !!(item.favorite || item.isFavorite) !== favorite);
    if (!changed.length) return;
    const changedIds = new Set(changed.map(item => item.id));
    setFolders(previous => previous.map(item => changedIds.has(item.id) ? { ...item, favorite, isFavorite: favorite } : item));
    changed.forEach(item => addActivity({ actionKey: favorite ? 'activity.pin_folder' : 'activity.unpin_folder', params: { name: item.name }, type: 'folder' }));
  }, [folders, setFolders, addActivity]);

  const changeFoldersColor = useCallback((folderIds, color) => {
    const ids = new Set(folderIds);
    const changed = folders.filter(item => ids.has(item.id) && item.borderColor !== color);
    if (!changed.length) return;
    const changedIds = new Set(changed.map(item => item.id));
    setFolders(previous => previous.map(item => changedIds.has(item.id) ? { ...item, borderColor: color } : item));
    changed.forEach(item => addActivity({ actionKey: 'activity.change_folder_color', params: { name: item.name }, type: 'folder' }));
  }, [folders, setFolders, addActivity]);

  const deleteFolders = useCallback((folderIds) => {
    const ids = new Set(folderIds);
    const removed = folders.filter(item => ids.has(item.id));
    if (!removed.length) return;
    setProjects(previous => previous.map(item => ids.has(item.folderId) ? { ...item, folderId: null } : item));
    setFolders(previous => previous.filter(item => !ids.has(item.id)));
    if (ids.has(dashboardFolderId)) setDashboardFolderId(null);
    removed.forEach(item => addActivity({ actionKey: 'activity.delete_folder', params: { name: item.name }, type: 'folder' }));
  }, [folders, dashboardFolderId, setFolders, setProjects, addActivity]);

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
          onGoHome={goHome}
          showToast={showToast}
          userProfile={userProfile}
          globalTutorialTips={globalTutorialTips}
        />
      ) : currentScreen === 'settings' ? (
        <Settings
          onNavigate={navigateTo}
          previousScreen={previousScreen}
          currentTheme={theme}
          onThemeChange={setTheme}
          showToast={showToast}
          onClearCache={handleClearCache}
          globalTutorialTips={globalTutorialTips}
          onGlobalTutorialTipsChange={setGlobalTutorialTips}
          onRestartTutorial={() => {
            try { appStorage.removeItem(TUTORIAL_COMPLETED_KEY); } catch { /* Segue só na memória. */ }
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
          onRenameProject={renameProject}
          onDuplicateProject={duplicateProject}
          onMoveProject={moveProject}
          onCreateFolder={createFolder}
          onToggleFolderFavorite={toggleFolderFavorite}
          onRenameFolder={renameFolder}
          onChangeFolderColor={changeFolderColor}
          onToggleProjectFavorite={toggleProjectFavorite}
          onNavigate={navigateTo}
          showToast={showToast}
          onClearActivities={clearActivities}
          onRemoveActivity={removeActivity}
          onCreateTutorialProject={createTutorialProject}
          currentFolderId={dashboardFolderId}
          onFolderChange={setDashboardFolderId}
          onSetProjectsFavorite={setProjectsFavorite}
          onDuplicateProjects={duplicateProjects}
          onMoveProjects={moveProjects}
          onDeleteProjects={deleteProjects}
          onSetFoldersFavorite={setFoldersFavorite}
          onChangeFoldersColor={changeFoldersColor}
          onDeleteFolders={deleteFolders}
        />
      )}

      </Suspense>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} onPause={pauseToast} onResume={resumeToast} />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <TooltipProvider><AppContent /></TooltipProvider>
      <LiquidGlassEngine />
    </LanguageProvider>
  );
}
