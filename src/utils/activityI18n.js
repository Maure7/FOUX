/**
 * Utilitário de tradução e migração de atividades do FOUX
 * Arquitetura de persistência:
 * {
 *   id: string,
 *   actionKey: string,
 *   params: Record<string, string>,
 *   type: 'project' | 'folder',
 *   timestamp: number
 * }
 */

/**
 * Migra e normaliza qualquer atividade (legada com .text ou nova com .actionKey)
 * para a estrutura canônica desacoplada de idioma.
 */
export function migrateLegacyActivity(item) {
  if (!item) return null;

  // Se já for uma atividade estruturada no novo formato
  if (typeof item === 'object' && item.actionKey) {
    return {
      id: item.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      actionKey: item.actionKey,
      params: item.params || {},
      type: item.type || (item.actionKey.includes('folder') ? 'folder' : 'project'),
      timestamp: typeof item.timestamp === 'number'
        ? item.timestamp
        : (item.timestamp ? new Date(item.timestamp).getTime() : Date.now()),
    };
  }

  const rawText = typeof item === 'string' ? item : (item.text || '');
  const id = (typeof item === 'object' && item.id)
    ? item.id
    : `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = (typeof item === 'object' && item.timestamp)
    ? (typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime())
    : Date.now();

  if (!rawText) {
    return {
      id,
      actionKey: 'activity.open_project',
      params: { name: 'Projeto' },
      type: 'project',
      timestamp,
    };
  }

  // 1. Tutorial FOUX
  if (/^(?:Abriu|Abrió) (?:o|el) Tutorial FOUX$/i.test(rawText)) {
    return {
      id,
      actionKey: 'activity.open_tutorial',
      params: {},
      type: 'project',
      timestamp,
    };
  }

  // 2. Criar pasta
  let match = rawText.match(/^(?:Criou a pasta|Creó la carpeta) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.create_folder',
      params: { name: match[1] },
      type: 'folder',
      timestamp,
    };
  }

  // 3. Fixar pasta em favoritos
  match = rawText.match(/^(?:Fixou a pasta|Marcou pasta|Fijó la carpeta|Marcó la carpeta) '(.+)' (?:nos favoritos|como favorita|en favoritos)$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.pin_folder',
      params: { name: match[1] },
      type: 'folder',
      timestamp,
    };
  }

  // 4. Desafixar pasta de favoritos
  match = rawText.match(/^(?:Desafixou a pasta|Removeu pasta|Quitó la carpeta|Desfijó la carpeta) '(.+)' (?:dos favoritos|de favoritos)$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.unpin_folder',
      params: { name: match[1] },
      type: 'folder',
      timestamp,
    };
  }

  // 5. Renomear pasta
  match = rawText.match(/^(?:Renomeou a pasta|Renombró la carpeta) de '(.+)' (?:para|a) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.rename_folder',
      params: { oldName: match[1], newName: match[2] },
      type: 'folder',
      timestamp,
    };
  }

  // 6. Alterar cor da pasta
  match = rawText.match(/^(?:Alterou a cor da pasta|Cambió el color de la carpeta) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.change_folder_color',
      params: { name: match[1] },
      type: 'folder',
      timestamp,
    };
  }

  // 7. Excluir pasta
  match = rawText.match(/^(?:Excluiu a pasta|Eliminó la carpeta) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.delete_folder',
      params: { name: match[1] },
      type: 'folder',
      timestamp,
    };
  }

  // 8. Fixar projeto em favoritos
  match = rawText.match(/^(?:Fixou|Marcou|Fijó|Marcó) '(.+)' (?:nos favoritos|como favorito|en favoritos)$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.pin_project',
      params: { name: match[1] },
      type: 'project',
      timestamp,
    };
  }

  // 9. Desafixar projeto de favoritos
  match = rawText.match(/^(?:Desafixou|Removeu|Quitó|Desfijó) '(.+)' (?:dos favoritos|de favoritos)$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.unpin_project',
      params: { name: match[1] },
      type: 'project',
      timestamp,
    };
  }

  // 10. Renomear projeto
  match = rawText.match(/^(?:Mudou o nome|Cambió el nombre) de '(.+)' (?:para|a) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.rename_project',
      params: { oldName: match[1], newName: match[2] },
      type: 'project',
      timestamp,
    };
  }

  // 11. Excluir projeto
  match = rawText.match(/^(?:Excluiu|Eliminó) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.delete_project',
      params: { name: match[1] },
      type: 'project',
      timestamp,
    };
  }

  // 12. Duplicar projeto
  match = rawText.match(/^(?:Duplicou|Duplicó) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.duplicate_project',
      params: { name: match[1] },
      type: 'project',
      timestamp,
    };
  }

  // 13. Abrir projeto
  match = rawText.match(/^(?:Abriu|Abrió) '(.+)'$/);
  if (match) {
    return {
      id,
      actionKey: 'activity.open_project',
      params: { name: match[1] },
      type: 'project',
      timestamp,
    };
  }

  // Fallback caso não dê match em nenhum padrão
  const isFolder = rawText.toLowerCase().includes('pasta') || rawText.toLowerCase().includes('carpeta');
  return {
    id,
    actionKey: null,
    text: rawText,
    params: {},
    type: isFolder ? 'folder' : 'project',
    timestamp,
  };
}

/**
 * Tradutor direto de strings legadas (fallback e suporte para mensagens estáticas)
 */
export function translateActivityText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;

  if (targetLang === 'es') {
    // PT -> ES
    if (/^Abriu o Tutorial FOUX$/i.test(text)) return 'Abrió el Tutorial FOUX';
    if (/^Criou a pasta '(.+)'$/.test(text)) {
      return text.replace(/^Criou a pasta '(.+)'$/, "Creó la carpeta '$1'");
    }
    if (/^(?:Fixou a pasta|Marcou pasta) '(.+)' (?:nos favoritos|como favorita)$/.test(text)) {
      return text.replace(/^(?:Fixou a pasta|Marcou pasta) '(.+)' (?:nos favoritos|como favorita)$/, "Fijó la carpeta '$1' en favoritos");
    }
    if (/^(?:Desafixou a pasta|Removeu pasta) '(.+)' dos favoritos$/.test(text)) {
      return text.replace(/^(?:Desafixou a pasta|Removeu pasta) '(.+)' dos favoritos$/, "Desfijó la carpeta '$1' de favoritos");
    }
    if (/^Renomeou a pasta de '(.+)' para '(.+)'$/.test(text)) {
      return text.replace(/^Renomeou a pasta de '(.+)' para '(.+)'$/, "Renombró la carpeta de '$1' a '$2'");
    }
    if (/^Alterou a cor da pasta '(.+)'$/.test(text)) {
      return text.replace(/^Alterou a cor da pasta '(.+)'$/, "Cambió el color de la carpeta '$1'");
    }
    if (/^Abriu '(.+)'$/.test(text)) {
      return text.replace(/^Abriu '(.+)'$/, "Abrió '$1'");
    }
    if (/^Mudou o nome de '(.+)' para '(.+)'$/.test(text)) {
      return text.replace(/^Mudou o nome de '(.+)' para '(.+)'$/, "Cambió el nombre de '$1' a '$2'");
    }
    if (/^Excluiu '(.+)'$/.test(text)) {
      return text.replace(/^Excluiu '(.+)'$/, "Eliminó '$1'");
    }
    if (/^Excluiu a pasta '(.+)'$/.test(text)) {
      return text.replace(/^Excluiu a pasta '(.+)'$/, "Eliminó la carpeta '$1'");
    }
    if (/^Duplicou '(.+)'$/.test(text)) {
      return text.replace(/^Duplicou '(.+)'$/, "Duplicó '$1'");
    }
    if (/^(?:Fixou|Marcou) '(.+)' (?:nos favoritos|como favorito)$/.test(text)) {
      return text.replace(/^(?:Fixou|Marcou) '(.+)' (?:nos favoritos|como favorito)$/, "Fijó '$1' en favoritos");
    }
    if (/^(?:Desafixou|Removeu) '(.+)' dos favoritos$/.test(text)) {
      return text.replace(/^(?:Desafixou|Removeu) '(.+)' dos favoritos$/, "Desfijó '$1' de favoritos");
    }
  } else {
    // ES -> PT
    if (/^Abrió el Tutorial FOUX$/i.test(text)) return 'Abriu o Tutorial FOUX';
    if (/^Creó la carpeta '(.+)'$/.test(text)) {
      return text.replace(/^Creó la carpeta '(.+)'$/, "Criou a pasta '$1'");
    }
    if (/^(?:Fijó la carpeta|Marcó la carpeta) '(.+)' (?:en favoritos|como favorita)$/.test(text)) {
      return text.replace(/^(?:Fijó la carpeta|Marcó la carpeta) '(.+)' (?:en favoritos|como favorita)$/, "Fixou a pasta '$1' nos favoritos");
    }
    if (/^(?:Desfijó la carpeta|Quitó la carpeta) '(.+)' de favoritos$/.test(text)) {
      return text.replace(/^(?:Desfijó la carpeta|Quitó la carpeta) '(.+)' de favoritos$/, "Desafixou a pasta '$1' dos favoritos");
    }
    if (/^Renombró la carpeta de '(.+)' a '(.+)'$/.test(text)) {
      return text.replace(/^Renombró la carpeta de '(.+)' a '(.+)'$/, "Renomeou a pasta de '$1' para '$2'");
    }
    if (/^Cambió el color de la carpeta '(.+)'$/.test(text)) {
      return text.replace(/^Cambió el color de la carpeta '(.+)'$/, "Alterou a cor da pasta '$1'");
    }
    if (/^Abrió '(.+)'$/.test(text)) {
      return text.replace(/^Abrió '(.+)'$/, "Abriu '$1'");
    }
    if (/^Cambió el nombre de '(.+)' a '(.+)'$/.test(text)) {
      return text.replace(/^Cambió el nombre de '(.+)' a '(.+)'$/, "Mudou o nome de '$1' para '$2'");
    }
    if (/^Eliminó '(.+)'$/.test(text)) {
      return text.replace(/^Eliminó '(.+)'$/, "Excluiu '$1'");
    }
    if (/^Eliminó la carpeta '(.+)'$/.test(text)) {
      return text.replace(/^Eliminó la carpeta '(.+)'$/, "Excluiu a pasta '$1'");
    }
    if (/^Duplicó '(.+)'$/.test(text)) {
      return text.replace(/^Duplicó '(.+)'$/, "Duplicou '$1'");
    }
    if (/^(?:Fijó|Marcó) '(.+)' (?:en favoritos|como favorito)$/.test(text)) {
      return text.replace(/^(?:Fijó|Marcó) '(.+)' (?:en favoritos|como favorito)$/, "Fixou '$1' nos favoritos");
    }
    if (/^(?:Desfijó|Quitó) '(.+)' de favoritos$/.test(text)) {
      return text.replace(/^(?:Desfijó|Quitó) '(.+)' de favoritos$/, "Desafixou '$1' dos favoritos");
    }
  }

  return text;
}

/**
 * Formata dinamicamente uma atividade para exibição com base na função t() e no idioma
 */
export function formatActivityMessage(activity, t, targetLang = 'pt') {
  if (!activity) return '';

  if (typeof activity === 'string') {
    const migrated = migrateLegacyActivity(activity);
    if (migrated && migrated.actionKey && t) {
      return t(migrated.actionKey, migrated.params);
    }
    return translateActivityText(activity, targetLang);
  }

  if (activity.actionKey && t) {
    return t(activity.actionKey, activity.params || {});
  }

  if (activity.text) {
    const migrated = migrateLegacyActivity(activity);
    if (migrated && migrated.actionKey && t) {
      return t(migrated.actionKey, migrated.params);
    }
    return translateActivityText(activity.text, targetLang);
  }

  return '';
}
