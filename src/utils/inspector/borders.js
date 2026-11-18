const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
// Mesmo valor do 'medium' do navegador, usado quando só o estilo da borda é definido.
export const VISIBLE_BORDER_WIDTH = '3px';

const isVisible = (style) => !!style && style !== 'none' && style !== 'hidden';
const computed = (element) => element.ownerDocument.defaultView.getComputedStyle(element);

/** Lado que a sidebar mostra: o primeiro visível com espessura; numa borda só à esquerda, é ela. */
export function borderSide(cs) {
  return SIDES.find((side) => isVisible(cs[`border${side}Style`]) && parseFloat(cs[`border${side}Width`]) > 0)
    ?? SIDES.find((side) => isVisible(cs[`border${side}Style`]))
    ?? 'Top';
}

// Com estilo none/hidden a espessura computada é 0 e a cor não aparece.
export function revealBorderStyle(element) {
  const cs = computed(element);
  if (!SIDES.some((side) => isVisible(cs[`border${side}Style`]))) element.style.setProperty('border-style', 'solid', 'important');
}

// Resets como `border: 0` deixam a borda sólida ainda invisível.
export function revealBorderWidth(element) {
  const cs = computed(element);
  const visible = SIDES.some((side) => isVisible(cs[`border${side}Style`]) && parseFloat(cs[`border${side}Width`]) > 0);
  if (!visible) element.style.setProperty('border-width', VISIBLE_BORDER_WIDTH, 'important');
}
