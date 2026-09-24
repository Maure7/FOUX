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
];

/**
 * Calcula a quantidade exata de armazenamento consumido no localStorage em bytes.
 * Percorre todas as chaves e mede os bytes codificados em UTF-8.
 * @returns {number} Quantidade total de bytes consumidos.
 */
export function calculateStorageUsage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  let totalBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) {
        const value = localStorage.getItem(key) || '';
        // Medição precisa em bytes utilizando a API Blob padrão
        totalBytes += new Blob([key, value]).size;
      }
    }
  } catch (error) {
    console.warn('Erro ao calcular uso do localStorage:', error);
    // Fallback caso a API Blob falhe: estimativa UTF-16 (2 bytes por caractere)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) {
          const value = localStorage.getItem(key) || '';
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
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    // Limpeza completa do localStorage
    localStorage.clear();
  } catch (error) {
    console.warn('Erro ao executar localStorage.clear(), tentando remoção por chave:', error);
    try {
      FOUX_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Falha silenciosa
    }
  }
}
