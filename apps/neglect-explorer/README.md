# Maze Chomp (formerly Neglect Explorer)

A Pac-Man-style arcade game built for the web, tuned for mobile play.

## What it includes
- Single-screen maze with pellets, power pellets, ghosts, score, lives, and level progression.
- Touch-first controls: directional buttons and swipe gestures on the canvas.
- Keyboard controls for desktop testing (`Arrow keys` / `WASD`).
- Responsive layout with large tap targets and safe-area padding for phones.
- Restart button for instant replay.

## Controls
- Tap directional buttons (`▲ ◀ ▶ ▼`) to queue movement.
- Swipe on the game board to change direction.
- Keyboard: `W/A/S/D` or arrow keys.

## Build / Run commands
```bash
# from repo root
python -m http.server 8000
```

Open:
- App shell: `http://localhost:8000/`
- Maze Chomp directly: `http://localhost:8000/apps/neglect-explorer/`
