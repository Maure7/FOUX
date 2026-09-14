import { useState, useCallback, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import { useToast, ToastContainer } from './components/ToastNotification';

/* ===== LocalStorage helpers ===== */
const STORAGE_KEY = 'foux_projects';
const ACTIVE_KEY = 'foux_active_project';

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function loadActiveProjectId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

function saveActiveProjectId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

/* ===== Activity ID counter ===== */
let activityIdCounter = 0;

/* ===== Unique project ID ===== */
let projectIdCounter = Date.now();
function nextProjectId() {
  return `proj_${++projectIdCounter}`;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [projects, setProjects] = useState(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState(() => loadActiveProjectId());
  const [activities, setActivities] = useState([]);
  const { toasts, showToast } = useToast();

  /* Persist projects to localStorage whenever they change */
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  /* Persist active project ID */
  useEffect(() => {
    saveActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  /* Get the active project object */
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  /* Register a new activity entry */
  const addActivity = useCallback((text) => {
    const newActivity = {
      id: ++activityIdCounter,
      text,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [newActivity, ...prev]);
  }, []);

  /* Create a new project and navigate to editor */
  const createProject = useCallback((name) => {
    const id = nextProjectId();
    const newProject = {
      id,
      name: name || 'Projeto sem título',
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

  /* Open an existing project */
  const openProject = useCallback((projectId) => {
    setActiveProjectId(projectId);
    setCurrentScreen('editor');
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      addActivity(`Abriu '${proj.name}'`);
    }
  }, [projects, addActivity]);

  /* Update an existing project (auto-save) */
  const updateProject = useCallback((projectId, updates) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  /* Navigate back to dashboard */
  const goToDashboard = useCallback(() => {
    setCurrentScreen('dashboard');
  }, []);

  return (
    <>
      {currentScreen === 'editor' && activeProject ? (
        <Editor
          project={activeProject}
          onUpdateProject={(updates) => updateProject(activeProject.id, updates)}
          onNavigate={goToDashboard}
          showToast={showToast}
        />
      ) : (
        <Dashboard
          projects={projects}
          onCreateProject={createProject}
          onOpenProject={openProject}
          onNavigate={setCurrentScreen}
          activities={activities}
          addActivity={addActivity}
          showToast={showToast}
        />
      )}

      {/* Global toast layer */}
      <ToastContainer toasts={toasts} />
    </>
  );
}
