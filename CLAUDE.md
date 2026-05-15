# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local Development

No build step or package manager. Serve the root directory with any static file server:

```bash
npx serve . --listen 3000
```

Then open `http://localhost:3000`.

## Deployment

GitHub Pages serves from the root of `main`. The live URL is `https://sonyei888.github.io/lottie-gallery/`. Push to `main` to deploy — no CI pipeline.

`index.html` must always remain at the repository root.

## Architecture

Single-page application with no framework and no bundler. Three files do all the work:

- **`index.html`** — markup only; loads `styles.css`, `lottie-web` (CDN), `gif.js` (CDN), and `app.js` in that order via `defer`.
- **`assets/css/styles.css`** — all styles. Uses CSS custom properties defined in `:root` for the dark-theme palette (`--bg`, `--surface`, `--card`, `--border`, `--accent`, `--accent2`, `--text`, `--muted`, `--glow`).
- **`assets/js/app.js`** — all application logic, no modules. State lives in three top-level variables: `allAnimations` (array of `{name, size, data}`), `currentModalAnim` (the animation currently open in the modal), and `isExporting` (lock to prevent concurrent exports).

### Data flow

1. User drops or selects `.json` files → `loadFiles()` reads each with `FileReader`, parses JSON, deduplicates by name, pushes to `allAnimations`, calls `renderGallery()`.
2. `renderGallery()` destroys existing lottie card instances, clears the DOM, filters `allAnimations` by `currentSearch`, and rebuilds the grid. Each card gets a `lottie.loadAnimation()` instance stored on `el._lottie`.
3. Clicking a card calls `openModal(anim)` which sets `currentModalAnim`, renders a second full-size lottie instance in `#modal-player`, and populates metadata stats.
4. Export buttons call `exportPNG()` or `exportGIF()`. Both create a hidden off-screen `div`, load a **canvas renderer** lottie instance (separate from the SVG instances used for display), capture frame(s), then destroy the instance and remove the container.

### Export implementation detail

The GIF exporter fetches `gif.worker.js` from cdnjs and converts it to a `blob:` URL before passing it to `new GIF({ workerScript })`. This is required because browsers block cross-origin Web Worker instantiation. The progress bar in the modal is split: 0–50% = frame capture loop, 50–100% = gif.js encoding workers.

### CDN dependencies

| Library | Version | Purpose |
|---|---|---|
| lottie-web | 5.12.2 | SVG/canvas animation renderer |
| gif.js | 0.2.0 | Animated GIF encoding (+ worker) |
| Google Fonts | — | DM Mono, Syne |
