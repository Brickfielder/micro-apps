# Neglect Explorer

Browser-based rehab prototype for visuospatial neglect.

## What it includes
- Two 3D environments loaded from JSON level files: **Kitchen** and **Garden**.
- Deterministic target placement using a seed value.
- Mirrored left/right target pairs relative to the starting heading.
- Low motion-sickness defaults: simple movement mode and snap-turn enabled.
- Adaptive cueing ladder:
  - Soft left arrow after 8s of no leftward orientation.
  - Medium left-edge pulse + chime after 15s of no left-side collection.
  - Strong left-target highlight after 20s of no left-side collection.
  - Assist mode after prolonged struggle (boosted left target salience/size).
- Therapist panel (`T`) for session length, difficulty, cueing mode, targets count/size/contrast, movement mode, audio, and patient ID.
- Per-round metrics logging with local **CSV + JSON** downloads.

## Controls
- `W` / `↑`: move forward
- `←` / `→`: turn
- Optional (therapist setting): enable backward movement with `S` / `↓`
- `T`: open/close therapist settings panel

## Build / Run commands
```bash
# from repo root
python -m http.server 8000
```
Open:
- App shell: `http://localhost:8000/`
- Neglect Explorer directly: `http://localhost:8000/apps/neglect-explorer/`

No bundler is required; Three.js is loaded as an ES module from CDN.
