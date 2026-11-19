// Cover Forge — canvas composition.
// One function draws the whole cover at any size: the on-screen preview and
// the exported PNG are the same drawing, so what you see is what you post.

import { gradeById, filterString } from "./grade.js";

const TITLE_FONT = '"Arial Black", "Arial Narrow Bold", Impact, "Franklin Gothic Heavy", sans-serif';
const SUB_FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

let grainPattern = null;

function getGrainPattern(ctx) {
  if (grainPattern) return grainPattern;
  const n = document.createElement("canvas");
  n.width = 140;
  n.height = 140;
  const nctx = n.getContext("2d");
  const img = nctx.createImageData(140, 140);
  // Deterministic pseudo-random grain (seeded) so screenshots never change.
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(n, "repeat");
  return grainPattern;
}

// Draw one photo into a rect, cover-fit, honouring the slot's zoom and pan.
function drawPhoto(ctx, slot, x, y, w, h, filter) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (slot.img) {
    const iw = slot.img.naturalWidth;
    const ih = slot.img.naturalHeight;
    const base = Math.max(w / iw, h / ih);
    const scale = base * slot.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2 + slot.panX * ((dw - w) / 2);
    const dy = y + (h - dh) / 2 + slot.panY * ((dh - h) / 2);
    ctx.filter = filter;
    ctx.drawImage(slot.img, dx, dy, dw, dh);
    ctx.filter = "none";
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#3a2b52");
    g.addColorStop(0.6, "#7a2b5e");
    g.addColorStop(1, "#c93a5e");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "700 " + Math.max(13, Math.min(w, h) * 0.09) + "px " + SUB_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DROP A PHOTO", x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h, strength) {
  if (strength <= 0) return;
  const r = Math.max(w, h) * 0.72;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0," + strength.toFixed(3) + ")");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawGrain(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = getGrainPattern(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawFrame(ctx, w, h) {
  const u = Math.min(w, h) / 1080;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(1.5, 3 * u);
  ctx.strokeRect(20 * u, 20 * u, w - 40 * u, h - 40 * u);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(1, 1.5 * u);
  ctx.strokeRect(30 * u, 30 * u, w - 60 * u, h - 60 * u);
  ctx.restore();
}

// Fit a font size so `text` fits `maxWidth`, starting from `startSize`.
function fitFontSize(ctx, text, weight, family, startSize, maxWidth) {
  let size = startSize;
  ctx.font = weight + " " + size + "px " + family;
  const measured = ctx.measureText(text).width;
  if (measured > maxWidth && measured > 0) {
    size = Math.floor(size * (maxWidth / measured));
    ctx.font = weight + " " + size + "px " + family;
  }
  return size;
}

function drawTitleBlock(ctx, w, h, state, grade, anchorY, alignBottom) {
  const title = (state.title || "").trim() || "YOUR TITLE";
  const subtitle = (state.subtitle || "").trim();
  const maxW = w * 0.9;
  const startSize = Math.min(w, h) * 0.17;
  const size = fitFontSize(ctx, title, "900", TITLE_FONT, startSize, maxW);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const titleBaseline = alignBottom ? anchorY : anchorY + size * 0.8;

  if (subtitle) {
    const subSize = Math.max(12, size * 0.3);
    ctx.font = "italic 700 " + subSize + "px " + SUB_FONT;
    try { ctx.letterSpacing = "0.16em"; } catch (e) { /* older canvas */ }
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = subSize * 0.35;
    ctx.shadowOffsetY = subSize * 0.08;
    ctx.fillStyle = grade.subtitle;
    ctx.fillText(subtitle, w / 2, titleBaseline - size * 1.08);
    try { ctx.letterSpacing = "0px"; } catch (e) { /* ignore */ }
  }

  // Title: dark outline, then a vertical sunset/neon gradient fill.
  ctx.font = "900 " + size + "px " + TITLE_FONT;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = grade.titleStroke;
  ctx.lineWidth = size * 0.16;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(title, w / 2, titleBaseline);

  const grad = ctx.createLinearGradient(0, titleBaseline - size, 0, titleBaseline + size * 0.12);
  const stops = grade.titleStops;
  stops.forEach((c, i) => grad.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), c));
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(title, w / 2, titleBaseline);
  ctx.restore();

  return { titleBaseline, size };
}

function drawBadge(ctx, w, h, state, grade) {
  const text = (state.badge || "").trim();
  if (!text) return;
  const u = Math.min(w, h) / 1080;
  const fontSize = Math.max(13, 30 * u);
  ctx.save();
  ctx.font = "800 " + fontSize + "px " + SUB_FONT;
  try { ctx.letterSpacing = "0.12em"; } catch (e) { /* ignore */ }
  const tw = ctx.measureText(text).width;
  const padX = fontSize * 0.7;
  const bw = tw + padX * 2;
  const bh = fontSize * 1.9;
  const cx = w - 56 * u - bw / 2;
  const cy = 56 * u + bh / 2;
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10 * u;
  ctx.shadowOffsetY = 4 * u;
  ctx.fillStyle = grade.badgeBg;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh * 0.22);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = grade.badgeInk;
  ctx.lineWidth = Math.max(1.5, 2.5 * u);
  ctx.stroke();
  ctx.strokeStyle = grade.badgeInk;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, 1.2 * u);
  ctx.beginPath();
  ctx.roundRect(-bw / 2 + 5 * u, -bh / 2 + 5 * u, bw - 10 * u, bh - 10 * u, bh * 0.16);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.badgeInk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, fontSize * 0.05);
  ctx.restore();
}

function drawScrim(ctx, w, h, fromY, strength) {
  const g = ctx.createLinearGradient(0, fromY, 0, h);
  g.addColorStop(0, "rgba(8,4,14,0)");
  g.addColorStop(1, "rgba(8,4,14," + strength + ")");
  ctx.fillStyle = g;
  ctx.fillRect(0, fromY, w, h - fromY);
}

function sprocketRow(ctx, x, y, w, holeW, holeH, gap) {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const step = holeW + gap;
  const count = Math.floor((w + gap) / step);
  const totalW = count * step - gap;
  let hx = x + (w - totalW) / 2;
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.roundRect(hx, y, holeW, holeH, holeH * 0.32);
    ctx.fill();
    hx += step;
  }
}

// Region hit-test for dragging: which slot is under (px, py) at size w×h?
export function slotAt(state, w, h, px, py) {
  if (state.mode === "poster") return 0;
  const heroH = Math.round(h * 0.62);
  if (py < heroH) return 0;
  const cellW = w / 3;
  const idx = Math.min(2, Math.max(0, Math.floor(px / cellW)));
  return 1 + idx;
}

export function renderCover(ctx, w, h, state) {
  const grade = gradeById(state.grade);
  const filter = filterString(grade, state.contrast, state.saturation);
  const u = Math.min(w, h) / 1080;

  ctx.save();
  ctx.fillStyle = "#0d0a12";
  ctx.fillRect(0, 0, w, h);

  if (state.mode === "poster") {
    drawPhoto(ctx, state.slots[0], 0, 0, w, h, filter);
    grade.wash(ctx, w, h);
    drawScrim(ctx, w, h, h * 0.52, 0.62);
    drawVignette(ctx, w, h, grade.vignette);
    drawGrain(ctx, w, h);
    drawTitleBlock(ctx, w, h, state, grade, h - 84 * u, true);
    drawBadge(ctx, w, h, state, grade);
    drawFrame(ctx, w, h);
  } else {
    const heroH = Math.round(h * 0.62);
    const bandY = heroH;
    const bandH = h - heroH;

    // Hero photo with grade wash + vignette.
    drawPhoto(ctx, state.slots[0], 0, 0, w, heroH, filter);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, heroH);
    ctx.clip();
    grade.wash(ctx, w, heroH);
    drawScrim(ctx, w, heroH, heroH * 0.45, 0.5);
    drawVignette(ctx, w, heroH, grade.vignette * 0.8);
    ctx.restore();

    // Film band: near-black strip, sprocket holes, three cells.
    ctx.fillStyle = "#0b0b0e";
    ctx.fillRect(0, bandY, w, bandH);
    const holeH = Math.max(8, 16 * u);
    const holeW = holeH * 1.5;
    const gap = holeH * 1.1;
    const cellPad = Math.max(6, 12 * u);
    const cellY = bandY + holeH + cellPad * 1.6;
    const cellH = bandH - (holeH + cellPad * 1.6) * 2;
    const cellW = (w - cellPad * 4) / 3;
    sprocketRow(ctx, 0, bandY + cellPad * 0.7, w, holeW, holeH, gap);
    sprocketRow(ctx, 0, h - cellPad * 0.7 - holeH, w, holeW, holeH, gap);
    for (let i = 0; i < 3; i++) {
      const cx = cellPad + i * (cellW + cellPad);
      drawPhoto(ctx, state.slots[1 + i], cx, cellY, cellW, cellH, filter);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = Math.max(1, 2 * u);
      ctx.strokeRect(cx, cellY, cellW, cellH);
    }
    // Grade wash over the cells too, so the strip matches the hero.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, cellY, w, cellH);
    ctx.clip();
    grade.wash(ctx, w, cellH);
    ctx.restore();
    drawGrain(ctx, w, h);

    // Title straddles the hero/strip junction.
    drawTitleBlock(ctx, w, h, state, grade, heroH + Math.min(w, h) * 0.045, false);
    drawBadge(ctx, w, h, state, grade);
    drawFrame(ctx, w, h);
  }

  ctx.restore();
}
