#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'apps', 'apps.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const required = ['slug', 'title', 'description', 'tags', 'entryPath', 'version', 'offlineCapable', 'lastUpdated'];
let hasError = false;

manifest.forEach((app) => {
  required.forEach((field) => {
    if (!(field in app)) {
      console.error(`Missing field ${field} in app ${app.slug || '<unknown>'}`);
      hasError = true;
    }
  });

  const entry = path.join(__dirname, '..', app.entryPath);
  ['index.html', 'app.js', 'app.css'].forEach((file) => {
    const filepath = path.join(path.dirname(entry), file);
    if (!fs.existsSync(filepath)) {
      console.error('Missing file:', filepath);
      hasError = true;
    }
  });
});

if (hasError) {
  process.exit(1);
}

console.log('Manifest looks good.');
