// Superfícies que agem como botão precisam ativar como um botão nativo, sem
// roubar Enter/Espaço de uma ação interna, como o botão Opções de um projeto.
export function activateOnKey(event, activate) {
  if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  activate();
}
