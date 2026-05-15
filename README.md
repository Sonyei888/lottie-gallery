# Lottie Gallery

A lightweight, browser-based gallery for previewing [Lottie](https://airbnb.io/lottie/) JSON animations. No build step, no dependencies to install — runs entirely in the browser.

Hosted at: `https://sonyei888.github.io/lottie-gallery/`

---

## About this project

This project was built entirely through AI-assisted development as an experiment in working with artificial intelligence tools. The primary tool used was [Claude Code](https://claude.ai/code) by Anthropic, which handled the implementation, refactoring, feature additions, and design decisions from start to finish.

The goal was to explore how far a project can be driven through natural language interaction with an AI coding assistant — from a single monolithic HTML file to a structured, multi-feature web application.

---

## Features

- Drag-and-drop or click-to-select individual `.json` files
- Folder selection with recursive traversal — loads all Lottie files inside nested folders
- Live search filter by animation name
- Card size toggle: small, medium, large
- Detail modal with full-size preview and animation metadata (dimensions, FPS, duration, layer count)
- Export animations as PNG (first frame) or animated GIF directly from the browser
- Sticky header with live animation counter
- Add more files or folders without clearing the current gallery
- All processing is done locally — no files are uploaded to any server

---

## Project Structure

```
lottie-gallery/
├── index.html          # Application entry point (served by GitHub Pages)
├── README.md
└── assets/
    ├── css/
    │   └── styles.css  # All visual styles and CSS custom properties
    └── js/
        └── app.js      # Gallery logic, file loading, modal, and controls
```

---

## Local Development

No build tooling is required. Open `index.html` directly in a browser, or serve the root folder with any static file server:

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then navigate to `http://localhost:8080`.

---

## Deployment

The project deploys automatically through GitHub Pages. Push to the `main` branch and the site updates at the configured Pages URL.

Ensure the repository's Pages source is set to the root of the `main` branch (not the `docs/` folder).

---

## Dependencies

| Library | Version | Source |
|---------|---------|--------|
| [lottie-web](https://github.com/airbnb/lottie-web) | 5.12.2 | cdnjs CDN |

No package manager or installation is needed. The library is loaded via `<script>` tag from cdnjs.

---

## Browser Support

Any modern browser that supports ES2020 (Chrome 85+, Firefox 79+, Safari 14+, Edge 85+).
