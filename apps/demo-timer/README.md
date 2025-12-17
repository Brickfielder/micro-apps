# Demo Timer

A minimal focus timer built to demonstrate the shared shell, shared UI helpers, and persistence using `localStorage`.

## Run locally

```bash
python -m http.server
```

Open `http://localhost:8000/apps/demo-timer/`.

## Features
- Shared shell header/footer and design tokens
- Uses shared button helper (`shared/ui/components.js`)
- Remembers your preferred duration in `localStorage`
- Works offline after the first visit (cached by the service worker)
