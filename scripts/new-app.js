#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/new-app.js <slug>');
  process.exit(1);
}

const appDir = path.join(__dirname, '..', 'apps', slug);
if (fs.existsSync(appDir)) {
  console.error('App already exists:', slug);
  process.exit(1);
}

fs.mkdirSync(appDir, { recursive: true });

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${slug}</title>
  <link rel="stylesheet" href="../../shared/shell/shell.css" />
  <link rel="stylesheet" href="./app.css" />
</head>
<body>
  <div id="app-root"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
`;

const appJs = `import { mountShell, registerServiceWorker } from '../../shared/shell/shell.js';

const { content } = mountShell({ appTitle: '${slug}', appTagline: 'New micro-app' });
const card = document.createElement('article');
card.className = 'card';
card.innerHTML = '<p>Replace this with your app content.</p>';
content.appendChild(card);
registerServiceWorker();
`;

fs.writeFileSync(path.join(appDir, 'index.html'), indexHtml);
fs.writeFileSync(path.join(appDir, 'app.js'), appJs);
fs.writeFileSync(path.join(appDir, 'app.css'), '/* Add app-specific styles here */\n');
fs.writeFileSync(
  path.join(appDir, 'README.md'),
  `# ${slug}\n\nDescribe what this app does and how to use it.\n`
);

const manifestPath = path.join(__dirname, '..', 'apps', 'apps.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.push({
  slug,
  title: slug,
  description: 'New micro-app',
  tags: ['beta'],
  entryPath: `./apps/${slug}/index.html`,
  version: '0.0.1',
  offlineCapable: false,
  lastUpdated: new Date().toISOString().slice(0, 10),
});
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('Created app', slug);
