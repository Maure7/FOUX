// As seções (acordeões) da sidebar iniciam fechadas e ficam `inert` enquanto fechadas:
// foco, teclado e cliques por coordenada não chegam aos controles. Antes de usar esses
// caminhos, os testes clicam no cabeçalho de cada seção fechada visível, como o aluno faria.
// O estado aberto fica salvo por projeto, então basta uma vez por aba/tipo de elemento.
export const OPEN_SIDEBAR_SECTIONS = `new Promise((resolve) => {
  document.querySelectorAll('.sidebar-content .sidebar-section--closed > .sidebar-section__header').forEach((header) => header.click());
  requestAnimationFrame(() => requestAnimationFrame(resolve));
})`;

export const openSidebarSections = (evaluate) => evaluate(OPEN_SIDEBAR_SECTIONS);
