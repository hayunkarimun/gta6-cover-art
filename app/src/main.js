// Cover Forge — editor wiring: sidebar controls, drag/zoom framing,
// file loading, PNG export, and the deterministic screenshot scenes.

import {
  state,
  EXPORT_SIZES,
  currentSize,
  loadSamples,
  setSlotFile,
} from "./state.js";
import { GRADES } from "./grade.js";
import { renderCover, slotAt } from "./render.js";
import { SCENES, shotFromUrl, applyScene } from "./shots.js";

const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d");
const stageInner = document.getElementById("stageInner");
const filePicker = document.getElementById("filePicker");
const exportStatus = document.getElementById("exportStatus");

let pendingSlot = 0;
let renderQueued = false;

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderCover(ctx, canvas.width, canvas.height, state);
  });
}

function renderNow() {
  renderCover(ctx, canvas.width, canvas.height, state);
}

// ---------- canvas sizing ----------

function sizeCanvas() {
  const shot = shotFromUrl();
  if (shot && SCENES[shot] && SCENES[shot].coverOnly) {
    canvas.width = SCENES[shot].coverW;
    canvas.height = SCENES[shot].coverH;
    return;
  }
  const s = currentSize();
  canvas.width = s.w;
  canvas.height = s.h;
}

// ---------- geometry helpers (mirror render.js layout) ----------

function regionFor(slotIndex, w, h) {
  if (state.mode === "poster") return { x: 0, y: 0, w, h };
  const heroH = Math.round(h * 0.62);
  if (slotIndex === 0) return { x: 0, y: 0, w, h: heroH };
  const u = Math.min(w, h) / 1080;
  const holeH = Math.max(8, 16 * u);
  const cellPad = Math.max(6, 12 * u);
  const bandH = h - heroH;
  const cellY = heroH + holeH + cellPad * 1.6;
  const cellH = bandH - (holeH + cellPad * 1.6) * 2;
  const cellW = (w - cellPad * 4) / 3;
  const i = slotIndex - 1;
  return { x: cellPad + i * (cellW + cellPad), y: cellY, w: cellW, h: cellH };
}

function photoOverflow(slot, region) {
  if (!slot.img) return { x: 0, y: 0 };
  const base = Math.max(region.w / slot.img.naturalWidth, region.h / slot.img.naturalHeight);
  const scale = base * slot.zoom;
  return {
    x: slot.img.naturalWidth * scale - region.w,
    y: slot.img.naturalHeight * scale - region.h,
  };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---------- sidebar construction ----------

function buildSizePills(container) {
  container.innerHTML = "";
  for (const s of EXPORT_SIZES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "size-pill";
    b.textContent = s.label;
    b.dataset.sizeId = s.id;
    b.addEventListener("click", () => {
      state.sizeId = s.id;
      sizeCanvas();
      syncUI();
      requestRender();
    });
    container.appendChild(b);
  }
}

function buildSlotList() {
  const list = document.getElementById("slotList");
  list.innerHTML = "";
  state.slots.forEach((slot, i) => {
    const row = document.createElement("div");
    row.className = "slot";
    row.dataset.index = String(i);

    const img = document.createElement("img");
    img.alt = "";
    if (slot.img) img.src = slot.img.src;
    else if (slot.sampleUrl) img.src = slot.sampleUrl;

    const meta = document.createElement("div");
    meta.className = "slot-meta";
    const name = document.createElement("span");
    name.className = "slot-name";
    name.textContent = slot.name;
    const file = document.createElement("span");
    file.className = "slot-file";
    file.textContent = slot.fileName;
    meta.append(name, file);

    const load = document.createElement("button");
    load.type = "button";
    load.className = "slot-load";
    load.textContent = "Load";
    load.addEventListener("click", (ev) => {
      ev.stopPropagation();
      pendingSlot = i;
      state.selectedSlot = i;
      syncUI();
      filePicker.click();
    });

    row.append(img, meta, load);
    row.addEventListener("click", () => {
      state.selectedSlot = i;
      syncUI();
    });
    list.appendChild(row);
  });
}

function buildGradeGrid() {
  const grid = document.getElementById("gradeGrid");
  grid.innerHTML = "";
  for (const g of GRADES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grade-btn";
    b.dataset.gradeId = g.id;
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = g.swatch;
    const label = document.createElement("span");
    label.textContent = g.name;
    b.append(sw, label);
    b.addEventListener("click", () => {
      state.grade = g.id;
      syncUI();
      requestRender();
    });
    grid.appendChild(b);
  }
}

function syncUI() {
  document.querySelectorAll(".mode-card").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === state.mode);
  });
  document.querySelectorAll(".grade-btn").forEach((el) => {
    el.classList.toggle("active", el.dataset.gradeId === state.grade);
  });
  document.querySelectorAll(".size-pill").forEach((el) => {
    el.classList.toggle("active", el.dataset.sizeId === state.sizeId);
  });
  document.querySelectorAll(".slot").forEach((el, i) => {
    el.classList.toggle("selected", i === state.selectedSlot);
    const slot = state.slots[i];
    const img = el.querySelector("img");
    const file = el.querySelector(".slot-file");
    if (img && slot.img) img.src = slot.img.src;
    if (file) file.textContent = slot.fileName;
  });
  const sel = state.slots[state.selectedSlot];
  const zoomRange = document.getElementById("zoomRange");
  const zoomOut = document.getElementById("zoomOut");
  if (sel && zoomRange) {
    zoomRange.value = String(Math.round(sel.zoom * 100));
    zoomOut.textContent = Math.round(sel.zoom * 100) + "%";
  }
  document.getElementById("titleInput").value = state.title;
  document.getElementById("subtitleInput").value = state.subtitle;
  document.getElementById("badgeInput").value = state.badge;
}

// ---------- export ----------

function exportCanvas() {
  const s = currentSize();
  const c = document.createElement("canvas");
  c.width = s.w;
  c.height = s.h;
  renderCover(c.getContext("2d"), s.w, s.h, state);
  return c;
}

async function exportPNG() {
  const s = currentSize();
  const c = exportCanvas();
  const blob = await new Promise((resolve) => c.toBlob(resolve, "image/png"));
  if (!blob) {
    exportStatus.textContent = "Export failed — try again.";
    return null;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cover-forge-" + s.w + "x" + s.h + ".png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  window.__forgeLastExport = { w: s.w, h: s.h, bytes: blob.size };
  exportStatus.textContent =
    "Exported " + s.w + " × " + s.h + " PNG (" + Math.round(blob.size / 1024) + " KB). Post it!";
  return blob;
}

// ---------- events ----------

function canvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * canvas.width,
    y: ((ev.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let drag = null;

canvas.addEventListener("pointerdown", (ev) => {
  const p = canvasPoint(ev);
  const idx = slotAt(state, canvas.width, canvas.height, p.x, p.y);
  state.selectedSlot = idx;
  drag = { idx, startX: p.x, startY: p.y, panX: state.slots[idx].panX, panY: state.slots[idx].panY };
  canvas.setPointerCapture(ev.pointerId);
  syncUI();
});

canvas.addEventListener("pointermove", (ev) => {
  if (!drag) return;
  const p = canvasPoint(ev);
  const slot = state.slots[drag.idx];
  const region = regionFor(drag.idx, canvas.width, canvas.height);
  const over = photoOverflow(slot, region);
  if (over.x > 1) slot.panX = clamp(drag.panX + ((p.x - drag.startX) / (over.x / 2)), -1, 1);
  if (over.y > 1) slot.panY = clamp(drag.panY + ((p.y - drag.startY) / (over.y / 2)), -1, 1);
  requestRender();
});

canvas.addEventListener("pointerup", () => { drag = null; });
canvas.addEventListener("pointercancel", () => { drag = null; });

canvas.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  const p = canvasPoint(ev);
  const idx = slotAt(state, canvas.width, canvas.height, p.x, p.y);
  const slot = state.slots[idx];
  slot.zoom = clamp(slot.zoom * (ev.deltaY < 0 ? 1.08 : 0.925), 1, 3);
  state.selectedSlot = idx;
  syncUI();
  requestRender();
}, { passive: false });

stageInner.addEventListener("dragover", (ev) => {
  ev.preventDefault();
  stageInner.classList.add("dragover");
});
stageInner.addEventListener("dragleave", () => stageInner.classList.remove("dragover"));
stageInner.addEventListener("drop", async (ev) => {
  ev.preventDefault();
  stageInner.classList.remove("dragover");
  const files = [...ev.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
  let next = 0;
  for (const f of files) {
    if (next >= state.slots.length) break;
    await setSlotFile(state.slots[next], f);
    next++;
  }
  if (files.length) {
    syncUI();
    requestRender();
  }
});

filePicker.addEventListener("change", async () => {
  const f = filePicker.files && filePicker.files[0];
  filePicker.value = "";
  if (!f) return;
  await setSlotFile(state.slots[pendingSlot], f);
  syncUI();
  requestRender();
});

document.querySelectorAll(".mode-card").forEach((el) => {
  el.addEventListener("click", () => {
    state.mode = el.dataset.mode;
    syncUI();
    requestRender();
  });
});

const contrastRange = document.getElementById("contrastRange");
const saturationRange = document.getElementById("saturationRange");
const zoomRange = document.getElementById("zoomRange");

contrastRange.addEventListener("input", () => {
  state.contrast = Number(contrastRange.value);
  document.getElementById("contrastOut").textContent = contrastRange.value;
  requestRender();
});
saturationRange.addEventListener("input", () => {
  state.saturation = Number(saturationRange.value);
  document.getElementById("saturationOut").textContent = saturationRange.value;
  requestRender();
});
zoomRange.addEventListener("input", () => {
  const slot = state.slots[state.selectedSlot];
  slot.zoom = clamp(Number(zoomRange.value) / 100, 1, 3);
  document.getElementById("zoomOut").textContent = zoomRange.value + "%";
  requestRender();
});

document.getElementById("titleInput").addEventListener("input", (ev) => {
  state.title = ev.target.value;
  requestRender();
});
document.getElementById("subtitleInput").addEventListener("input", (ev) => {
  state.subtitle = ev.target.value;
  requestRender();
});
document.getElementById("badgeInput").addEventListener("input", (ev) => {
  state.badge = ev.target.value;
  requestRender();
});

document.getElementById("exportBtn").addEventListener("click", exportPNG);
document.getElementById("exportBtnSide").addEventListener("click", exportPNG);

// ---------- boot ----------

async function runExportTest() {
  const blob = await exportPNG();
  const out = document.getElementById("testout");
  const s = currentSize();
  out.textContent = blob
    ? "EXPORT_OK " + s.w + "x" + s.h + " bytes=" + blob.size
    : "EXPORT_FAIL";
  out.hidden = false;
}

async function boot() {
  buildSizePills(document.getElementById("sizePills"));
  buildSizePills(document.getElementById("sizePillsSide"));
  buildSlotList();
  buildGradeGrid();

  await loadSamples();

  const shot = shotFromUrl();
  if (shot && SCENES[shot]) {
    applyScene(state, SCENES[shot]);
    if (SCENES[shot].coverOnly) document.body.classList.add("cover-only");
  }

  sizeCanvas();
  syncUI();
  renderNow();
  window.__forgeReady = true;

  if (shot === "exporttest") {
    await runExportTest();
  }
}

boot();
