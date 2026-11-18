import { useSyncExternalStore } from 'react';
import { appStorage } from '../services/appStorage.js';
import { normalizeHex } from '../utils/css/color.js';

export const RECENT_COLORS_KEY = 'foux_recent_colors';
export const RECENT_COLORS_LIMIT = 10;

const listeners = new Set();
let cachedRaw;
let cached = [];

function parse(raw) {
  try {
    const list = JSON.parse(raw || '[]');
    if (!Array.isArray(list)) return [];
    return [...new Set(list.map(normalizeHex).filter(Boolean))].slice(0, RECENT_COLORS_LIMIT);
  } catch {
    return [];
  }
}

// Lido do armazenamento a cada consulta (é um mapa em memória no desktop): limpar os
// dados em Configurações ou outra aba gravando a lista aparece sem recarregar o app.
function snapshot() {
  let raw = null;
  try { raw = appStorage.getItem(RECENT_COLORS_KEY); } catch { /* Armazenamento indisponível. */ }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => { if (event.key === RECENT_COLORS_KEY) listener(); };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Leva a cor ao início da fila (sem duplicatas, hex minúsculo); só chamar com a escolha confirmada. */
export function addRecentColor(value) {
  const hex = normalizeHex(value ?? '');
  if (!hex) return;
  const current = snapshot();
  if (current[0] === hex) return;
  const next = [hex, ...current.filter((color) => color !== hex)].slice(0, RECENT_COLORS_LIMIT);
  try {
    appStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
  } catch {
    // Sem armazenamento a paleta ainda vale para esta sessão.
    cachedRaw = JSON.stringify(next);
    cached = next;
  }
  listeners.forEach((listener) => listener());
}

/** Lista compartilhada por todos os seletores de cor, da mais recente para a mais antiga. */
export default function useRecentColors() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
