import { appStorage } from '../services/appStorage.js';

// Todas as chaves que o app grava (referência para manutenção e para os testes).
export const FOUX_STORAGE_KEYS = [
  'foux_projects',
  'foux_active_project',
  'foux_folders',
  'foux_activities',
  'foux_theme',
  'foux_language',
  'foux_user_profile',
  'foux_history_visibility',
  'foux_global_tutorial_tips',
  'foux_tutorial_completed',
  'foux_sidebar_width',
  'foux_challenge_records',
  'foux_recent_colors',
  'foux_sidebar_sections',
];

// Apagar estas limpa o trabalho do aluno; tema, idioma e perfil continuam.
const DATA_KEYS = ['foux_projects', 'foux_active_project', 'foux_folders', 'foux_activities', 'foux_sidebar_sections'];

/** Tamanho em UTF-8 de tudo que está guardado, como aparece em Configurações. */
export function calculateStorageUsage() {
  let totalBytes = 0;
  try {
    for (let index = 0; index < appStorage.length; index++) {
      const key = appStorage.key(index);
      if (key !== null) totalBytes += new Blob([key, appStorage.getItem(key) || '']).size;
    }
  } catch (error) {
    console.warn('Erro ao calcular uso do armazenamento:', error);
  }
  return totalBytes;
}

export function formatBytes(bytes) {
  const MEGA = 1024 * 1024;
  if (!bytes || bytes <= 0) return '0.0 KB';
  return bytes < MEGA ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / MEGA).toFixed(1)} MB`;
}

export function clearAllStorage() {
  for (const key of DATA_KEYS) {
    try {
      appStorage.removeItem(key);
    } catch (error) {
      console.warn('Erro ao limpar dados locais do FOUX:', error);
    }
  }
}
