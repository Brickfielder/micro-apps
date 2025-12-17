import { createEl } from '../utils/dom.js';

export function createCard({ title, description, href }) {
  const card = createEl('article', { className: 'card' });
  const heading = createEl('h2', { text: title });
  const summary = createEl('p', { text: description });

  const link = createEl('a', {
    className: 'button',
    attrs: { href, 'aria-label': `${title} app` },
    text: 'Open',
  });

  card.append(heading, summary, link);
  return card;
}

export function createPill(label) {
  return createEl('span', { className: 'pill', text: label });
}

export function createGrid() {
  return createEl('div', { className: 'card-grid' });
}

export function createButton(label, { variant = 'ghost', type = 'button' } = {}) {
  const button = createEl('button', {
    className: `button ${variant === 'primary' ? 'primary' : ''}`.trim(),
    text: label,
  });
  button.type = type;
  return button;
}

export function createInputGroup(label, input) {
  const wrapper = createEl('label', { className: 'input-group' });
  const labelEl = createEl('span', { text: label });
  wrapper.append(labelEl, input);
  return wrapper;
}
