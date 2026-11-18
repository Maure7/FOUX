export const HOVER_OUTLINE = '1.5px dashed #f0a85d';
export const HOVER_OFFSET = '1px';
export const SELECT_OUTLINE = '2px solid #e59843';
export const SELECT_OFFSET = '1px';

export const ATTR_HOVERED = 'data-foux-hovered';
export const ATTR_SELECTED = 'data-foux-selected';
export const INSPECTOR_STYLE_ID = 'foux-inspector-styles';
export const SCROLLBAR_STYLE_ID = 'foux-canvas-scrollbars';

export const HOVER_STYLE_ID = 'foux-user-hover-rules';
export const HOVER_CLASS_PREFIX = 'foux-hover-target-';
export const ORIGINAL_STYLE_ATTR = 'data-foux-original-style';
export const FONT_STYLE_PREFIX = 'foux-font-';
// Folha temporária da exportação; nunca pode ir para o HTML salvo.
export const EXPORT_PARSER_ATTR = 'data-foux-export-parser';
// <meta name="darkreader-lock"> posto no canvas só durante a edição: extensões de modo
// escuro mudariam as cores que o aluno vê, o conta-gotas lê e o HTML salvo guardaria.
export const DARK_READER_LOCK_ATTR = 'data-foux-darkreader-lock';

// Folhas do próprio FOUX: não são CSS do aluno e ficam fora de buscas e exportação.
export const isFouxStyleNode = (node) => !!node?.id && (
  node.id === INSPECTOR_STYLE_ID || node.id === SCROLLBAR_STYLE_ID || node.id === HOVER_STYLE_ID
  || node.id.startsWith(FONT_STYLE_PREFIX)
);
