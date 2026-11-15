import { board, extendPath, letters, readPath, size } from './round';
import './style.css';

const surface = document.querySelector<HTMLElement>('#board')!;
const tiles = document.querySelector<HTMLElement>('#tiles')!;
const paths = document.querySelector<SVGSVGElement>('#paths')!;
const progress = document.querySelector<HTMLElement>('#progress')!;
const bonus = document.querySelector<HTMLElement>('#bonus')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const draft = document.querySelector<HTMLElement>('#draft')!;
const clear = document.querySelector<HTMLButtonElement>('#clear')!;
const submit = document.querySelector<HTMLButtonElement>('#submit')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;

const colors = ['orange', 'blue', 'red', 'purple', 'green', 'brown'];
const found = new Map<string, readonly number[]>();
const bonusFound = new Set<string>();
let selection: readonly number[] = [];
let focusedTile = 0;
let gesture: {
  id: number;
  start: { x: number; y: number; tile: number };
  dragging: boolean;
  path: readonly number[];
} | null = null;

paths.setAttribute('viewBox', `0 0 ${size * 100} ${size * 100}`);
tiles.style.setProperty('--size', String(size));

const buttons = letters.map((letter, tile) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.dataset.tile = String(tile);
  button.setAttribute('aria-label', `${letter}, row ${Math.floor(tile / size) + 1}, column ${tile % size + 1}`);
  const label = document.createElement('span');
  label.textContent = letter;
  button.append(label);

  button.addEventListener('click', (event) => {
    // Pointer taps are handled on release. Keyboard and assistive technology can click the button directly.
    if (event.detail === 0) pick(tile);
  });
  button.addEventListener('focus', () => {
    buttons[focusedTile].tabIndex = -1;
    focusedTile = tile;
    button.tabIndex = 0;
  });
  return button;
});
buttons.forEach((button, index) => { button.tabIndex = index === 0 ? 0 : -1; });
tiles.append(...buttons);

function complete(): boolean {
  return found.size === board.targets.length;
}

function announce(message: string): void {
  feedback.textContent = message;
}

function drawPath(path: readonly number[], style: string): void {
  if (path.length < 2) return;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('points', path.map((tile) =>
    `${(tile % size) * 100 + 50},${Math.floor(tile / size) * 100 + 50}`,
  ).join(' '));
  line.setAttribute('class', style);
  paths.append(line);
}

function render(): void {
  const draftPath = gesture?.dragging ? gesture.path : selection;
  const colorByTile = new Map<number, string>();
  paths.replaceChildren();
  [...found.values()].forEach((path, index) => {
    const color = colors[index % colors.length];
    drawPath(path, `found ${color}`);
    path.forEach((tile) => colorByTile.set(tile, color));
  });
  drawPath(draftPath, 'tracing');

  buttons.forEach((button, tile) => {
    const selected = draftPath.includes(tile);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-disabled', String(complete()));
    button.dataset.found = colorByTile.get(tile) ?? '';
  });
  draft.textContent = complete() ? 'Round complete' : readPath(draftPath) || 'Pick a letter';
  progress.textContent = `${found.size} of ${board.targets.length} found`;
  bonus.textContent = `Bonus words: ${bonusFound.size}`;
  clear.setAttribute('aria-disabled', String(draftPath.length === 0));
  submit.setAttribute('aria-disabled', String(gesture !== null || selection.length === 0));
  restart.textContent = complete() ? 'Play again' : 'Restart round';
  surface.classList.toggle('complete', complete());
}

function pick(tile: number): void {
  if (complete() || gesture) return;
  const next = extendPath(selection, tile);
  if (next === selection) {
    announce(selection.at(-1) === tile ? 'That letter is already selected.' : 'Choose an unused neighboring tile, or go back to the previous tile.');
    return;
  }
  selection = next;
  announce('');
  render();
}

function check(path: readonly number[]): void {
  const word = readPath(path);
  selection = [];
  if (word.length < 3) {
    announce('Use at least three letters.');
  } else if (found.has(word) || bonusFound.has(word)) {
    announce(`You already found ${word}.`);
  } else if (board.targets.includes(word)) {
    found.set(word, path);
    announce(complete()
      ? `${word}! You found all ${board.targets.length} flowers.`
      : `${word} found. ${found.size} of ${board.targets.length}.`);
  } else if (board.bonus.includes(word)) {
    bonusFound.add(word);
    announce(`${word} is a bonus word.`);
  } else {
    announce(`${word} isn't on this round's list. Try another path.`);
  }
  render();
}

function tileAt(event: PointerEvent, tracing = false): number | null {
  const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('.tile');
  if (!hit || !tiles.contains(hit)) return null;
  if (tracing) {
    const { left, top, width, height } = hit.getBoundingClientRect();
    const x = Math.abs((event.clientX - left) / width - 0.5);
    const y = Math.abs((event.clientY - top) / height - 0.5);
    // A diagonal can graze a side tile at the intersection of four tiles.
    if (x > 0.36 && y > 0.36) return null;
  }
  return Number(hit.dataset.tile);
}

function trace(event: PointerEvent): void {
  if (!gesture) return;
  const tile = tileAt(event, true);
  const moved = Math.hypot(event.clientX - gesture.start.x, event.clientY - gesture.start.y) >= 7;
  if (!gesture.dragging && (moved || (tile !== null && tile !== gesture.start.tile))) {
    gesture.dragging = true;
    selection = [];
    announce('');
  }
  if (gesture.dragging && tile !== null) gesture.path = extendPath(gesture.path, tile);
}

function cancelGesture(): void {
  if (!gesture) return;
  const { id, dragging } = gesture;
  gesture = null;
  if (surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
  if (dragging) announce('Selection canceled.');
  render();
}

surface.addEventListener('pointerdown', (event) => {
  if (complete() || gesture || !event.isPrimary || event.button !== 0) return;
  const tile = tileAt(event);
  if (tile === null) return;
  event.preventDefault();
  buttons[tile].focus({ preventScroll: true });
  surface.setPointerCapture(event.pointerId);
  gesture = {
    id: event.pointerId,
    start: { x: event.clientX, y: event.clientY, tile },
    dragging: false,
    path: [tile],
  };
});

surface.addEventListener('pointermove', (event) => {
  if (gesture?.id !== event.pointerId) return;
  const before = gesture.path;
  const wasDragging = gesture.dragging;
  for (const point of event.getCoalescedEvents?.() ?? []) trace(point);
  trace(event);
  if (gesture.path !== before || gesture.dragging !== wasDragging) render();
});

surface.addEventListener('pointerup', (event) => {
  if (gesture?.id !== event.pointerId) return;
  trace(event);
  const tile = tileAt(event);
  if (tile === null) {
    cancelGesture();
    return;
  }
  const { dragging, path } = gesture;
  gesture = null;
  if (dragging) check(path);
  else pick(tile);
});

for (const type of ['pointercancel', 'lostpointercapture'] as const) {
  surface.addEventListener(type, (event) => {
    if (gesture?.id === event.pointerId) cancelGesture();
  });
}
window.addEventListener('blur', cancelGesture);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelGesture();
});

const arrows: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
};

tiles.addEventListener('keydown', (event) => {
  const offset = arrows[event.key];
  if (!offset || !Object.hasOwn(arrows, event.key)) return;
  event.preventDefault();
  const row = Math.floor(focusedTile / size) + offset[0];
  const column = focusedTile % size + offset[1];
  if (row >= 0 && row < size && column >= 0 && column < size) buttons[row * size + column].focus();
});

function clearSelection(): void {
  if (gesture) cancelGesture();
  if (!selection.length) return;
  selection = [];
  announce('Selection cleared.');
  render();
}

clear.addEventListener('click', clearSelection);
surface.closest('section')!.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') clearSelection();
});
submit.addEventListener('click', () => {
  if (!complete() && !gesture && selection.length) check(selection);
});
restart.addEventListener('click', () => {
  cancelGesture();
  selection = [];
  found.clear();
  bonusFound.clear();
  announce('Round restarted.');
  render();
  buttons[0].focus();
});

if (import.meta.env.DEV) {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Show test answers';
  const list = document.createElement('ul');
  for (const word of board.targets) {
    const item = document.createElement('li');
    item.textContent = word;
    list.append(item);
  }
  details.append(summary, list);
  document.querySelector('main')!.append(details);
}

render();
