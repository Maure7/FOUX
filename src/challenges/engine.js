import { CATEGORIES, CHALLENGES } from './pool.js';
import { getGradientBorder, parseLinearGradient } from '../utils/gradientBorder';
import { readHoverState } from '../utils/inspector/hoverRules';

export const ROUND_SIZE = 8;

/** Fisher–Yates on a copy. */
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

// One computed-style read of a single element: cheap enough to run on every
// edit frame while a round is active.
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

// One challenge per category, in a new order every round. Challenges already
// met by earlier edits of the tutorial are left out; when a category runs dry
// its place goes to a leftover from the other categories.
export function drawRound(doc, getHoverRules, size = ROUND_SIZE) {
  const open = CHALLENGES.filter((challenge) => findTarget(doc, challenge) && !isComplete(challenge, doc, getHoverRules));
  const picks = shuffle(CATEGORIES)
    .map((category) => shuffle(open.filter((challenge) => challenge.category === category))[0])
    .filter(Boolean);
  const leftovers = shuffle(open.filter((challenge) => !picks.includes(challenge)));
  while (picks.length < size && leftovers.length) picks.push(leftovers.pop());
  return shuffle(picks).slice(0, size);
}
