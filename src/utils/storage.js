/**
 * Utilitários para medição e gerenciamento de armazenamento local (localStorage)
 * FOUX — Fancy and Organized UX
 */

export const FOUX_STORAGE_KEYS = [
  'foux_projects',
  'foux_active_project',
  'foux_folders',
  'foux_activities',
  'foux_theme',
  'foux_language',
  'foux_user_profile',
  'foux_history_visibility',
];

/**
 * Calcula a quantidade exata de armazenamento consumido no localStorage em bytes.
 * Percorre todas as chaves e mede os bytes codificados em UTF-8.
 * @returns {number} Quantidade total de bytes consumidos.
 */
export function calculateStorageUsage() {
  const storage = typeof window !== 'undefined' ? window.localStorage : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  if (!storage) {
    return 0;
  }

  let totalBytes = 0;

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) {
        const value = storage.getItem(key) || '';
        // Medição precisa em bytes utilizando a API Blob padrão
        totalBytes += new Blob([key, value]).size;
      }
    }
  } catch (error) {
    console.warn('Erro ao calcular uso do localStorage:', error);
    // Fallback caso a API Blob falhe: estimativa UTF-16 (2 bytes por caractere)
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key !== null) {
          const value = storage.getItem(key) || '';
          totalBytes += (key.length + value.length) * 2;
        }
      }
    } catch {
      return 0;
    }
  }

  return totalBytes;
}

/**
 * Formata um valor numérico em bytes para string legível (ex: 0.0 KB, 142.5 KB, 2.3 MB).
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) {
    return '0.0 KB';
  }

  const KILO = 1024;
  const MEGA = KILO * 1024;

  if (bytes < MEGA) {
    return `${(bytes / KILO).toFixed(1)} KB`;
  }

  return `${(bytes / MEGA).toFixed(1)} MB`;
}

/**
 * Executa a limpeza completa de dados do FOUX e/ou do localStorage.
 * Garante que chaves legadas e chaves do app sejam removidas com segurança.
 */
export function clearAllStorage() {
  const storage = typeof window !== 'undefined' ? window.localStorage : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
  if (!storage) {
    return;
  }

  try {
    // Limpeza de chaves de dados do app (preserva preferências essenciais como tema, idioma e perfil)
    const DATA_KEYS = ['foux_projects', 'foux_active_project', 'foux_folders', 'foux_activities'];
    DATA_KEYS.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch {
        // Ignora erros pontuais
      }
    });
  } catch (error) {
    console.warn('Erro ao limpar dados locais do FOUX:', error);
  }
}
