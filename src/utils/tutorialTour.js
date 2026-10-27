import { appStorage } from '../services/appStorage';
export const TUTORIAL_COMPLETED_KEY = 'foux_tutorial_completed';

export const TOUR_STEPS = [
  { id: 'sidebar', tab: 'estilos' },
  { id: 'styles', tab: 'estilos' },
  { id: 'typography', tab: 'estilos' },
  { id: 'borders', tab: 'estilos' },
  { id: 'spacing', tab: 'estilos' },
  { id: 'background', tab: 'estilos' },
  { id: 'events', tab: 'eventos' },
  { id: 'layout', tab: 'layout' },
];

export function hasCompletedTutorial() {
  try { return appStorage.getItem(TUTORIAL_COMPLETED_KEY) === 'true'; }
  catch { return false; }
}

export function completeTutorial() {
  try { appStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true'); }
  catch { /* The project preference remains available when storage is blocked. */ }
}
