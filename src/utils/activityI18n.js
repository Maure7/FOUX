/**
 * Utilitário de tradução de atividades dinâmicas do FOUX
 */
export function translateActivityText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;

  if (targetLang === 'es') {
    // PT -> ES
    if (/^Criou a pasta '(.+)'$/.test(text)) {
      return text.replace(/^Criou a pasta '(.+)'$/, "Creó la carpeta '$1'");
    }
    if (/^Marcou pasta '(.+)' como favorita$/.test(text)) {
      return text.replace(/^Marcou pasta '(.+)' como favorita$/, "Marcó la carpeta '$1' como favorita");
    }
    if (/^Removeu pasta '(.+)' dos favoritos$/.test(text)) {
      return text.replace(/^Removeu pasta '(.+)' dos favoritos$/, "Quitó la carpeta '$1' de favoritos");
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
    if (/^Marcou '(.+)' como favorito$/.test(text)) {
      return text.replace(/^Marcou '(.+)' como favorito$/, "Marcó '$1' como favorito");
    }
    if (/^Removeu '(.+)' dos favoritos$/.test(text)) {
      return text.replace(/^Removeu '(.+)' dos favoritos$/, "Quitó '$1' de favoritos");
    }
  } else {
    // ES -> PT
    if (/^Creó la carpeta '(.+)'$/.test(text)) {
      return text.replace(/^Creó la carpeta '(.+)'$/, "Criou a pasta '$1'");
    }
    if (/^Marcó la carpeta '(.+)' como favorita$/.test(text)) {
      return text.replace(/^Marcó la carpeta '(.+)' como favorita$/, "Marcou pasta '$1' como favorita");
    }
    if (/^Quitó la carpeta '(.+)' de favoritos$/.test(text)) {
      return text.replace(/^Quitó la carpeta '(.+)' de favoritos$/, "Removeu pasta '$1' dos favoritos");
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
      return text.replace(/^Duplicou '(.+)'$/, "Duplicou '$1'");
    }
    if (/^Marcó '(.+)' como favorito$/.test(text)) {
      return text.replace(/^Marcó '(.+)' como favorito$/, "Marcou '$1' como favorito");
    }
    if (/^Quitó '(.+)' de favoritos$/.test(text)) {
      return text.replace(/^Quitó '(.+)' de favoritos$/, "Removeu '$1' dos favoritos");
    }
  }

  return text;
}
