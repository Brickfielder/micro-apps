const BRAND_HOME = './index.html';

export function mountShell({ appTitle, appTagline = '', navLinks = [] }) {
  const root = document.getElementById('app-root') || document.body;
  root.innerHTML = '';

  const skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'app-shell-skip';
  skip.textContent = 'Skip to content';

  const frame = document.createElement('div');
  frame.className = 'app-frame';

  const header = document.createElement('header');
  header.className = 'app-header';

  const brand = document.createElement('div');
  brand.className = 'app-brand';

  const logo = document.createElement('div');
  logo.className = 'app-logo';
  logo.textContent = 'µ';

  const meta = document.createElement('div');
  meta.className = 'app-meta';

  const titleEl = document.createElement('h1');
  titleEl.textContent = appTitle;

  const taglineEl = document.createElement('p');
  taglineEl.textContent = appTagline;

  meta.append(titleEl, taglineEl);
  brand.append(logo, meta);

  const nav = document.createElement('nav');
  nav.className = 'nav-links';
  const hasHome = navLinks.some((link) => link.href === BRAND_HOME || link.label === 'Home');
  const links = hasHome ? navLinks : [{ href: BRAND_HOME, label: 'Home', current: navLinks.length === 0 }, ...navLinks];

  links.forEach((link) => {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;
    if (link.current) {
      a.setAttribute('aria-current', 'page');
    }
    nav.appendChild(a);
  });

  header.append(brand, nav);

  const main = document.createElement('main');
  main.id = 'main-content';
  main.className = 'main-content';

  const content = document.createElement('div');
  content.className = 'app-content';

  main.appendChild(content);

  const footer = document.createElement('footer');
  footer.className = 'app-footer';
  footer.innerHTML = '<strong>Micro Apps</strong> · Built for GitHub Pages and offline-friendly use.';

  frame.append(skip, header, main, footer);
  root.appendChild(frame);

  if (appTitle) {
    document.title = `${appTitle} | Micro Apps`;
  }

  return { content, frame };
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const swUrl = new URL('../../sw.js', import.meta.url);
  navigator.serviceWorker.register(swUrl).catch((error) => console.error('Service worker registration failed', error));
}
