// Custom button surfaces must activate like native buttons, without stealing
// Enter/Space from a nested action such as a project's Options button.
export function activateOnKey(event, activate) {
  if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  activate();
}
