/**
 * Lottie Gallery
 *
 * Handles file loading, gallery rendering, search filtering,
 * card size switching, and modal preview for Lottie JSON animations.
 *
 * Depends on: lottie-web (global `lottie` object, loaded via CDN)
 */

'use strict';

/** @type {Array<{name: string, size: number, data: object}>} */
const allAnimations = [];

let modalAnim        = null;
let currentModalAnim = null;
let isExporting      = false;
let currentSearch    = '';

const gallery     = document.getElementById('gallery');
const dropzone    = document.getElementById('dropzone');
const fileInput   = document.getElementById('fileInput');
const toolbar     = document.getElementById('toolbar');
const statsEl     = document.getElementById('stats');
const searchEl    = document.getElementById('search');
const emptyEl     = document.getElementById('empty');
const modal       = document.getElementById('modal');
const modalTitle  = document.getElementById('modal-title');
const modalPlayer = document.getElementById('modal-player');
const modalInfo   = document.getElementById('modal-info');

/**
 * Pauses card animations when they leave the viewport and resumes them when
 * they re-enter. Prevents off-screen animations from consuming CPU/GPU,
 * which is the primary cause of FPS drops when many cards are loaded.
 * rootMargin of 150px starts playback just before the card scrolls into view.
 */
const cardObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      const anim = entry.target._lottie;
      if (!anim) return;
      entry.isIntersecting ? anim.play() : anim.pause();
    });
  },
  { rootMargin: '150px 0px', threshold: 0 }
);

updateStats();

/* -------------------------------------------------------------------------- */
/* Drag & drop                                                                 */
/* -------------------------------------------------------------------------- */

dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', async e => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');

  const items = e.dataTransfer.items ? [...e.dataTransfer.items] : [];

  if (items.length && typeof items[0].webkitGetAsEntry === 'function') {
    const files = await collectFilesFromItems(items);
    loadFiles(files);
  } else {
    loadFiles([...e.dataTransfer.files]);
  }
});

fileInput.addEventListener('change', () => {
  loadFiles([...fileInput.files]);
  fileInput.value = '';
});

document.getElementById('folderInput').addEventListener('change', function () {
  loadFiles([...this.files]);
  this.value = '';
});

document.getElementById('addMoreInput').addEventListener('change', function () {
  loadFiles([...this.files]);
  this.value = '';
});

document.getElementById('addFolderInput').addEventListener('change', function () {
  loadFiles([...this.files]);
  this.value = '';
});

/* -------------------------------------------------------------------------- */
/* File loading                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Reads an array of File objects, parses each as Lottie JSON, and adds
 * unique entries to `allAnimations` before triggering a gallery re-render.
 *
 * @param {File[]} files - Files selected by the user or dropped onto the zone.
 */
function loadFiles(files) {
  const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
  if (!jsonFiles.length) return;

  let loaded = 0;

  jsonFiles.forEach(file => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);

        if (data.v === undefined && data.animations === undefined) {
          console.warn(`${file.name} does not appear to be a valid Lottie file.`);
        }

        const cleanName = file.name.replace(/\.json$/i, '');
        const alreadyLoaded = allAnimations.some(a => a.name === cleanName);

        if (alreadyLoaded) {
          console.warn(`"${cleanName}" is already loaded — skipping.`);
        } else {
          allAnimations.push({ name: cleanName, size: file.size, data });
        }
      } catch (err) {
        console.warn(`Failed to parse ${file.name}:`, err);
      }

      loaded++;
      if (loaded === jsonFiles.length) renderGallery();
    };

    reader.readAsText(file);
  });
}

/* -------------------------------------------------------------------------- */
/* Gallery rendering                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Destroys all active Lottie card instances, clears the gallery DOM,
 * and rebuilds it from `allAnimations` filtered by `currentSearch`.
 */
function renderGallery() {
  gallery.querySelectorAll('.card-anim').forEach(el => {
    cardObserver.unobserve(el);
    if (el._lottie) {
      el._lottie.destroy();
      el._lottie = null;
    }
  });

  gallery.innerHTML = '';

  const query    = currentSearch.toLowerCase();
  const filtered = allAnimations.filter(a => a.name.toLowerCase().includes(query));

  emptyEl.classList.toggle('visible', filtered.length === 0 && allAnimations.length > 0);
  toolbar.classList.toggle('visible', allAnimations.length > 0);
  dropzone.style.display = allAnimations.length ? 'none' : '';

  updateStats();

  filtered.forEach((anim, i) => {
    const card     = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${Math.min(i, 30) * 30}ms`;

    const animWrap     = document.createElement('div');
    animWrap.className = 'card-anim';

    const footer           = document.createElement('div');
    footer.className       = 'card-footer';
    footer.innerHTML       = `
      <div class="card-name" title="${anim.name}">${anim.name}</div>
      <div class="card-meta">${formatSize(anim.size)} · ${anim.data.w ?? '?'}×${anim.data.h ?? '?'}</div>
    `;

    card.appendChild(animWrap);
    card.appendChild(footer);
    gallery.appendChild(card);

    animWrap._lottie = lottie.loadAnimation({
      container:     animWrap,
      renderer:      'canvas',
      loop:          true,
      autoplay:      false,
      animationData: anim.data,
      rendererSettings: {
        clearCanvas:     true,
        progressiveLoad: true,
      },
    });

    cardObserver.observe(animWrap);
    card.addEventListener('click', () => openModal(anim));
  });
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Opens the detail modal for a given animation, loading a full-size
 * Lottie player and displaying technical metadata.
 *
 * @param {{name: string, size: number, data: object}} anim
 */
function openModal(anim) {
  if (modalAnim) {
    modalAnim.destroy();
    modalAnim = null;
  }

  currentModalAnim = anim;
  resetExportState();

  modalPlayer.innerHTML = '';
  modalTitle.textContent = anim.name;
  modal.classList.add('open');

  modalAnim = lottie.loadAnimation({
    container:     modalPlayer,
    renderer:      'svg',
    loop:          true,
    autoplay:      true,
    animationData: anim.data,
  });

  const fr      = anim.data.fr ?? '—';
  const dur     = anim.data.op && anim.data.fr
    ? (anim.data.op / anim.data.fr).toFixed(2) + 's'
    : '—';
  const w       = anim.data.w      ?? '—';
  const h       = anim.data.h      ?? '—';
  const layers  = (anim.data.layers ?? []).length;

  modalInfo.innerHTML = `
    <div class="modal-stat">
      <span class="modal-stat-label">Size</span>
      <span class="modal-stat-val">${formatSize(anim.size)}</span>
    </div>
    <div class="modal-stat">
      <span class="modal-stat-label">Dimensions</span>
      <span class="modal-stat-val">${w} × ${h}</span>
    </div>
    <div class="modal-stat">
      <span class="modal-stat-label">FPS</span>
      <span class="modal-stat-val">${fr}</span>
    </div>
    <div class="modal-stat">
      <span class="modal-stat-label">Duration</span>
      <span class="modal-stat-val">${dur}</span>
    </div>
    <div class="modal-stat">
      <span class="modal-stat-label">Layers</span>
      <span class="modal-stat-val">${layers}</span>
    </div>
  `;
}

/** Closes the modal and destroys the active modal Lottie instance. */
function closeModal() {
  modal.classList.remove('open');

  if (modalAnim) {
    modalAnim.destroy();
    modalAnim = null;
  }

  modalPlayer.innerHTML = '';
  currentModalAnim = null;
  resetExportState();
}

document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */
/* -------------------------------------------------------------------------- */

searchEl.addEventListener('input', () => {
  currentSearch = searchEl.value;
  renderGallery();
});

document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gallery.className = 'size-' + btn.dataset.size;
  });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  gallery.querySelectorAll('.card-anim').forEach(el => cardObserver.unobserve(el));
  allAnimations.length = 0;
  currentSearch        = '';
  searchEl.value       = '';
  gallery.innerHTML    = '';

  toolbar.classList.remove('visible');
  emptyEl.classList.remove('visible');
  dropzone.style.display = '';
  fileInput.value        = '';

  updateStats();
});

/* -------------------------------------------------------------------------- */
/* Folder traversal (Entry API)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Collects File objects from a DataTransferItemList, recursively traversing
 * any directories using the FileSystem Entry API.
 *
 * @param {DataTransferItem[]} items
 * @returns {Promise<File[]>}
 */
async function collectFilesFromItems(items) {
  const results = await Promise.all(
    items.map(item => {
      const entry = item.webkitGetAsEntry();
      return entry ? processEntry(entry) : Promise.resolve([]);
    })
  );
  return results.flat();
}

/**
 * Recursively resolves a FileSystemEntry to an array of File objects.
 * Non-.json files are discarded at this stage.
 *
 * @param {FileSystemEntry} entry
 * @returns {Promise<File[]>}
 */
async function processEntry(entry) {
  if (entry.isFile) {
    if (!entry.name.toLowerCase().endsWith('.json')) return [];
    return [await new Promise((resolve, reject) => entry.file(resolve, reject))];
  }

  if (entry.isDirectory) {
    const reader  = entry.createReader();
    const entries = await readAllEntries(reader);
    const nested  = await Promise.all(entries.map(processEntry));
    return nested.flat();
  }

  return [];
}

/**
 * Reads all entries from a FileSystemDirectoryReader, handling the 100-entry
 * batch limit by calling readEntries() repeatedly until the batch is empty.
 *
 * @param {FileSystemDirectoryReader} reader
 * @returns {Promise<FileSystemEntry[]>}
 */
async function readAllEntries(reader) {
  const all = [];
  let batch;
  do {
    batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    all.push(...batch);
  } while (batch.length > 0);
  return all;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Formats a byte count as a human-readable string (B, KB, or MB).
 *
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024)             return bytes + ' B';
  if (bytes < 1024 * 1024)      return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/** Updates the header counter badge. Always visible; accented when files are loaded. */
function updateStats() {
  const n = allAnimations.length;
  statsEl.textContent = `${n} animation${n !== 1 ? 's' : ''}`;
  statsEl.classList.toggle('has-files', n > 0);
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Creates a temporary off-screen div sized for lottie canvas rendering.
 * The caller must remove it from the DOM after use.
 *
 * @param {number} w
 * @param {number} h
 * @returns {HTMLDivElement}
 */
function createOffscreenContainer(w, h) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;overflow:hidden;`;
  document.body.appendChild(div);
  return div;
}

/**
 * Shows or hides the export progress bar in the modal.
 * Pass `ratio < 0` to hide it.
 *
 * @param {number} ratio  - Progress from 0 to 1.
 * @param {string} [label]
 */
function setExportProgress(ratio, label = '') {
  const progress = document.getElementById('export-progress');
  const bar      = document.getElementById('export-progress-bar');
  const labelEl  = document.getElementById('export-progress-label');

  if (ratio < 0) {
    progress.classList.remove('visible');
    return;
  }

  progress.classList.add('visible');
  bar.style.width      = `${Math.round(ratio * 100)}%`;
  labelEl.textContent  = label;
}

/** Enables or disables the export buttons. */
function setExportBusy(busy) {
  document.getElementById('export-png').disabled = busy;
  document.getElementById('export-gif').disabled = busy;
}

/** Resets the export UI to its idle state. */
function resetExportState() {
  isExporting = false;
  setExportBusy(false);
  setExportProgress(-1);
}

/**
 * Exports the first frame of the current modal animation as a PNG file.
 * Renders via lottie's canvas renderer at native resolution (capped at 1024px).
 */
async function exportPNG() {
  if (!currentModalAnim || isExporting) return;

  const anim    = currentModalAnim;
  const nativeW = anim.data.w ?? 512;
  const nativeH = anim.data.h ?? 512;
  const scale   = Math.min(1, 1024 / Math.max(nativeW, nativeH));
  const w       = Math.round(nativeW * scale);
  const h       = Math.round(nativeH * scale);

  isExporting = true;
  setExportBusy(true);
  setExportProgress(0.1, 'Rendering frame...');

  const container = createOffscreenContainer(w, h);

  const instance = lottie.loadAnimation({
    container,
    renderer:  'canvas',
    loop:      false,
    autoplay:  false,
    animationData: anim.data,
    rendererSettings: { clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' },
  });

  await new Promise(resolve => instance.addEventListener('DOMLoaded', resolve));
  instance.goToAndStop(0, true);

  const canvas  = container.querySelector('canvas');
  const dataUrl = canvas.toDataURL('image/png');

  instance.destroy();
  document.body.removeChild(container);

  setExportProgress(1, 'Done');
  setTimeout(resetExportState, 700);

  const a    = document.createElement('a');
  a.href     = dataUrl;
  a.download = `${anim.name}.png`;
  a.click();
}

/**
 * Renders all animation frames via lottie's canvas renderer, encodes them
 * as an animated GIF using gif.js, and triggers a file download.
 *
 * The gif.js worker is fetched from CDN and converted to a blob URL so it
 * can be instantiated as a Web Worker without cross-origin restrictions.
 *
 * Output is capped at 400px and 20fps to keep file size reasonable.
 */
async function exportGIF() {
  if (!currentModalAnim || isExporting) return;
  if (typeof GIF === 'undefined') {
    console.error('gif.js is not available — check the CDN script tag.');
    return;
  }

  isExporting = true;
  setExportBusy(true);

  const anim      = currentModalAnim;
  const nativeW   = anim.data.w  ?? 512;
  const nativeH   = anim.data.h  ?? 512;
  const fps       = anim.data.fr ?? 30;
  const lastFrame = anim.data.op ?? fps * 2;

  const scale        = Math.min(1, 400 / Math.max(nativeW, nativeH));
  const w            = Math.round(nativeW * scale);
  const h            = Math.round(nativeH * scale);
  const captureEvery = Math.max(1, Math.round(fps / 20));
  const frameDelay   = Math.round((captureEvery / fps) * 1000);

  setExportProgress(0, 'Loading encoder...');

  let workerUrl;
  try {
    const res  = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
    const blob = await res.blob();
    workerUrl  = URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to fetch gif.js worker:', err);
    resetExportState();
    return;
  }

  const gif = new GIF({
    workers:      2,
    quality:      10,
    width:        w,
    height:       h,
    workerScript: workerUrl,
  });

  const container = createOffscreenContainer(w, h);

  const instance = lottie.loadAnimation({
    container,
    renderer:  'canvas',
    loop:      false,
    autoplay:  false,
    animationData: anim.data,
    rendererSettings: { clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' },
  });

  await new Promise(resolve => instance.addEventListener('DOMLoaded', resolve));

  const canvas = container.querySelector('canvas');

  for (let frame = 0; frame < lastFrame; frame += captureEvery) {
    instance.goToAndStop(frame, true);
    await new Promise(resolve => requestAnimationFrame(resolve));
    gif.addFrame(canvas, { copy: true, delay: frameDelay });
    setExportProgress((frame / lastFrame) * 0.5, 'Capturing frames...');
  }

  instance.destroy();
  document.body.removeChild(container);

  gif.on('progress', p => setExportProgress(0.5 + p * 0.5, 'Encoding GIF...'));

  gif.on('finished', blob => {
    URL.revokeObjectURL(workerUrl);
    setExportProgress(1, 'Done');
    setTimeout(resetExportState, 700);

    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${anim.name}.gif`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  gif.render();
}

document.getElementById('export-png').addEventListener('click', exportPNG);
document.getElementById('export-gif').addEventListener('click', exportGIF);
