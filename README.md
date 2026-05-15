# Lottie Gallery

A lightweight, browser-based gallery for previewing [Lottie](https://airbnb.io/lottie/) JSON animations. No build step, no dependencies to install — runs entirely in the browser.

Hosted at: `https://<username>.github.io/lottie-gallery/`

---

## Features

- Drag-and-drop or click-to-select multiple `.json` files at once
- Live search filter by animation name
- Card size toggle: small, medium, large
- Detail modal with full-size preview and animation metadata (dimensions, FPS, duration, layer count)
- Add more files without clearing the current gallery
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
