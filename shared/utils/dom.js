export function createEl(tag, { className = '', attrs = {}, text = '' } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    el.setAttribute(key, value);
  });
  if (text) el.textContent = text;
  return el;
}

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
