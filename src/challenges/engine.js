import { CATEGORIES, CHALLENGES } from './pool.js';
import { getGradientBorder, parseLinearGradient } from '../utils/gradientBorder';
import { readHoverState } from '../utils/inspector/hoverRules';

export const ROUND_SIZE = 8;

/** Fisher–Yates sobre uma cópia. */
export function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function findTarget(doc, challenge) {
  for (const id of challenge.target) {
    const element = doc?.getElementById(id);
    if (element) return element;
  }
  return null;
}

// Uma leitura de estilo computado de um único elemento: barata o bastante para
// rodar a cada frame de edição enquanto a rodada está ativa.
export function isComplete(challenge, doc, getHoverRules) {
  const element = findTarget(doc, challenge);
  const win = doc?.defaultView;
  if (!element || !win) return false;
  const style = win.getComputedStyle(element);
  const border = getGradientBorder(element);
  return challenge.check({
    style,
    background: border ? border.background.color : style.backgroundColor,
    gradient: parseLinearGradient(border ? border.background.image : style.backgroundImage),
    borderGradient: border,
    hover: readHoverState(getHoverRules(element), doc),
  });
}

// Um desafio por categoria, em ordem nova a cada rodada. Os que edições anteriores
// do tutorial já cumpriram ficam de fora; quando uma categoria se esgota, a vaga vai
// para uma sobra das outras categorias.
export function drawRound(doc, getHoverRules, size = ROUND_SIZE) {
  const open = CHALLENGES.filter((challenge) => findTarget(doc, challenge) && !isComplete(challenge, doc, getHoverRules));
  const picks = shuffle(CATEGORIES)
    .map((category) => shuffle(open.filter((challenge) => challenge.category === category))[0])
    .filter(Boolean);
  const leftovers = shuffle(open.filter((challenge) => !picks.includes(challenge)));
  while (picks.length < size && leftovers.length) picks.push(leftovers.pop());
  return shuffle(picks).slice(0, size);
}
