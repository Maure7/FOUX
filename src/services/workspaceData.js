import { appStorage } from './appStorage.js';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const themes = new Set(['dark', 'light', 'solarized', 'liquid-glass']);

export function readJson(key, fallback, normalize = (value) => value) {
  try {
    const text = appStorage.getItem(key);
    return text === null ? fallback : normalize(JSON.parse(text));
  } catch {
    return fallback;
  }
}

export function normalizeCollection(value, kind) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).map((item) => ({
    ...item,
    name: typeof item.name === 'string' && item.name.trim() ? item.name : 'FOUX',
    ...(kind === 'projects' ? {
      folderId: typeof item.folderId === 'string' ? item.folderId : null,
      htmlContent: typeof item.htmlContent === 'string' ? item.htmlContent : null,
    } : {}),
  }));
}

export function normalizeProfile(value) {
  const profile = isRecord(value) ? value : {};
  return {
    name: typeof profile.name === 'string' ? profile.name : '',
    avatar: typeof profile.avatar === 'string' ? profile.avatar : null,
    bio: typeof profile.bio === 'string' ? profile.bio : '',
  };
}

export function normalizeTheme(theme) {
  return themes.has(theme) ? theme : 'dark';
}
