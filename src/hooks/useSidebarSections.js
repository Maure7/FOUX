import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appStorage } from '../services/appStorage.js';

export const SIDEBAR_SECTIONS_KEY = 'foux_sidebar_sections';
// Projetos excluídos saem da lista; o limite só segura projetos importados e esquecidos.
const MAX_PROJECTS = 100;

export const SidebarSectionsContext = createContext(null);

function readAll() {
  try {
    const all = JSON.parse(appStorage.getItem(SIDEBAR_SECTIONS_KEY) || '{}');
    return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    appStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(all));
  } catch (error) {
    console.warn('Erro ao salvar as seções da sidebar:', error);
  }
}

// Só as seções abertas são guardadas: ausente significa fechada (o padrão).
const openOnly = (sections) => Object.fromEntries(
  Object.entries(sections || {}).filter(([id, open]) => typeof id === 'string' && open === true),
);

/** Remove o estado salvo dos projetos excluídos. */
export function forgetSidebarSections(projectIds) {
  const all = readAll();
  let changed = false;
  for (const id of projectIds) {
    if (Object.hasOwn(all, id)) {
      delete all[id];
      changed = true;
    }
  }
  if (changed) writeAll(all);
}

// Estado aberto/fechado dos acordeões da sidebar de um projeto. Tudo começa fechado;
// o que o aluno abrir continua aberto ao voltar ao projeto.
export default function useSidebarSections(projectId) {
  const [open, setOpen] = useState(() => openOnly(readAll()[projectId]));
  const saved = useRef(open);

  useEffect(() => {
    if (!projectId || saved.current === open) return;
    saved.current = open;
    const all = readAll();
    // Reinserido no fim: os mais antigos saem primeiro quando passa do limite.
    delete all[projectId];
    all[projectId] = open;
    const ids = Object.keys(all);
    ids.slice(0, Math.max(0, ids.length - MAX_PROJECTS)).forEach((id) => delete all[id]);
    writeAll(all);
  }, [projectId, open]);

  const toggle = useCallback((sectionId) => setOpen((current) => {
    const next = { ...current };
    if (next[sectionId]) delete next[sectionId];
    else next[sectionId] = true;
    return next;
  }), []);

  return useMemo(() => ({ isOpen: (sectionId) => open[sectionId] === true, toggle }), [open, toggle]);
}
