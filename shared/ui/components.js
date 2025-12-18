import { createEl } from '../utils/dom.js';

export function createCard({ title, description, href, icon = '✨', tag, offline, version, updated }) {
  const card = createEl('article', { className: 'card app-card' });

  const header = createEl('div', { className: 'card-header' });
  const iconChip = createEl('div', { className: 'icon-chip', text: icon });
  const tagPill = createPill(tag || 'Focus');
  header.append(iconChip, tagPill);

  const heading = createEl('h2', { text: title });
  const summary = createEl('p', { className: 'description', text: description });

  const featureList = createEl('ul', { className: 'feature-list' });
  featureList.append(
    createEl('li', {
      html: `<span>🎯</span><span class="label">Focus:</span> ${tag || 'Skill'}`,
    }),
    createEl('li', {
      html: `<span>🚀</span><span class="label">Launch-ready</span> micro-app`,
    })
  );

  const footer = createEl('div', { className: 'card-footer' });
  const link = createEl('a', {
    className: 'button primary',
    attrs: { href, 'aria-label': `${title} app` },
    text: 'Launch experience',
  });

  const meta = createEl('div', { className: 'meta', text: version ? `v${version} · ${updated || ''}` : updated || '' });

  footer.append(link, meta);

  const pillRow = createEl('div', { className: 'pill-row' });
  if (offline) {
    pillRow.append(createEl('span', { className: 'pill offline', text: 'Offline ready' }));
  }

  card.append(header, heading, summary, featureList, footer, pillRow);
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
