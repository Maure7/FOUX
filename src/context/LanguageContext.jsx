/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import ptTranslations from '../locales/pt.json';
import esTranslations from '../locales/es.json';
import { translateActivityText } from '../utils/activityI18n';

const LANGUAGE_STORAGE_KEY = 'foux_language';
const DEFAULT_LANGUAGE = 'pt';

const translations = {
  pt: ptTranslations,
  es: esTranslations,
};

const LanguageContext = createContext(null);

/**
 * Resolve chaves pontilhadas como 'settings.themes.dark' em um objeto de dicionário.
 */
function getNestedTranslation(obj, path) {
  if (!obj || !path) return null;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return typeof current === 'string' ? current : null;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return stored === 'es' ? 'es' : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });

  const setLanguage = useCallback((newLang) => {
    const validLang = newLang === 'es' ? 'es' : 'pt';
    setLanguageState(validLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
      document.documentElement.setAttribute('lang', validLang === 'es' ? 'es-419' : 'pt-BR');
    } catch (e) {
      console.warn('Erro ao salvar preferência de idioma:', e);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language === 'es' ? 'es-419' : 'pt-BR');
  }, [language]);

  /**
   * Função t(key, params): recupera a string correspondente ou fallback
   */
  const t = useCallback((path, params = {}) => {
    const currentDict = translations[language] || translations[DEFAULT_LANGUAGE];
    const fallbackDict = translations[DEFAULT_LANGUAGE];

    let result = getNestedTranslation(currentDict, path);
    if (!result && language !== DEFAULT_LANGUAGE) {
      result = getNestedTranslation(fallbackDict, path);
    }
    if (!result) {
      result = path;
    }

    // Interpolação de parâmetros ex: {size}, {count}, etc.
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        result = result.replaceAll(`{${paramKey}}`, String(paramVal));
      });
    }

    return result;
  }, [language]);

  /**
   * Formatação de data localizada
   */
  const formatDate = useCallback((dateInput, options = { day: '2-digit', month: 'short' }) => {
    if (!dateInput) return '';
    try {
      const locale = language === 'es' ? 'es-419' : 'pt-BR';
      return new Date(dateInput).toLocaleDateString(locale, options);
    } catch {
      return String(dateInput);
    }
  }, [language]);

  /**
   * Cálculo de tempo relativo internacionalizado
   */
  const timeAgo = useCallback((date) => {
    if (!date) return '';
    const now = Date.now();
    const diffMs = now - new Date(date).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (language === 'es') {
      if (diffSec < 10) return 'Ahora mismo';
      if (diffSec < 60) return `Hace ${diffSec} segundos`;
      if (diffMin === 1) return 'Hace 1 minuto';
      if (diffMin < 60) return `Hace ${diffMin} minutos`;
      if (diffHour === 1) return 'Hace 1 hora';
      if (diffHour < 24) return `Hace ${diffHour} horas`;
      if (diffDay === 1) return 'Hace 1 día';
      return `Hace ${diffDay} días`;
    }

    // pt-BR
    if (diffSec < 10) return 'Agora mesmo';
    if (diffSec < 60) return `Há ${diffSec} segundos`;
    if (diffMin === 1) return 'Há 1 minuto';
    if (diffMin < 60) return `Há ${diffMin} minutos`;
    if (diffHour === 1) return 'Há 1 hora';
    if (diffHour < 24) return `Há ${diffHour} horas`;
    if (diffDay === 1) return 'Há 1 dia';
    return `Há ${diffDay} dias`;
  }, [language]);

  /**
   * Formata texto de atividade de acordo com o idioma corrente
   */
  const formatActivity = useCallback((text) => {
    return translateActivityText(text, language);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    formatDate,
    timeAgo,
    formatActivity,
  }), [language, setLanguage, t, formatDate, timeAgo, formatActivity]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage deve ser utilizado dentro de um LanguageProvider');
  }
  return context;
}
