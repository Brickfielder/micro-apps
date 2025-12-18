# App Integration Guide

This repository uses a shared shell and a standardized workflow for all applications. This ensures a consistent user experience and simplifies maintenance.

## Directory Structure

Each app should be located in `apps/<app-slug>/`.
The entry point must be `index.html`.

## Standardized Workflow

All apps must follow a 3-step workflow:
1.  **Instructions**: Briefly explain the task.
2.  **Task**: The interactive activity.
3.  **Stats**: Results and feedback.

## Implementation Steps

### 1. HTML Setup (`index.html`)

Use the shared shell CSS and import your app logic as a module.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>App Title</title>
  <link rel="stylesheet" href="../../shared/shell/shell.css" />
  <!-- App specific styles -->
  <link rel="stylesheet" href="./app.css" />
</head>
<body>
  <div id="app-root"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 2. JavaScript Logic (`app.js`)

Import `mountShell` and `AppWorkflow`.

```javascript
import { mountShell } from '../../shared/shell/shell.js';
import { AppWorkflow } from '../../shared/shell/workflow.js';
import { createButton } from '../../shared/ui/components.js';

// 1. Mount the Shell
const { content } = mountShell({
  appTitle: 'App Title',
  appTagline: 'Short description.',
  navLinks: [{ href: '../../index.html', label: 'Home' }],
});

// 2. Define Views

// Instructions View
function createInstructions(workflow) {
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="card">
      <h2>Instructions</h2>
      <p>Do this task...</p>
    </div>
  `;

  const startBtn = createButton('Start Task', { variant: 'primary' });
  startBtn.addEventListener('click', () => workflow.changeStep('task'));

  container.querySelector('.card').appendChild(startBtn);
  return container;
}

// Task View
function createTask(workflow) {
  const container = document.createElement('div');
  container.className = 'card';
  container.textContent = 'Task content here...';

  const finishBtn = createButton('Finish', { variant: 'primary' });
  finishBtn.addEventListener('click', () => {
    // Save results if needed
    workflow.changeStep('stats');
  });

  container.appendChild(finishBtn);
  return container;
}

// Stats View
function createStats(workflow) {
  const container = document.createElement('div');
  container.className = 'card';
  container.textContent = 'Your results...';

  const restartBtn = createButton('Restart');
  restartBtn.addEventListener('click', () => workflow.changeStep('instructions'));

  container.appendChild(restartBtn);
  return container;
}

// 3. Initialize Workflow
const workflow = new AppWorkflow({ container: content });
workflow.init({
  instructions: createInstructions,
  task: createTask,
  stats: createStats,
});
```

### 3. Styling (`app.css`)

Use CSS variables from `shell.css` for consistency.

```css
.card {
  /* ... */
}
```

## UI Components

Use `shared/ui/components.js` for common elements like buttons, cards, pills, etc.

- `createButton(label, { variant })`
- `createCard({ title, description, href })`
- `createPill(label)`
