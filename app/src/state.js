// Cover Forge — application state.
// A photo slot holds one loaded image plus how it is framed (zoom + pan).
// The cover is always drawn from this state, so the preview and the PNG
// export can never disagree.

export const EXPORT_SIZES = [
  { id: "portrait", label: "1080 × 1350", w: 1080, h: 1350 },
  { id: "square", label: "1080 × 1080", w: 1080, h: 1080 },
  { id: "wide", label: "1920 × 1080", w: 1920, h: 1080 },
  { id: "link", label: "1200 × 630", w: 1200, h: 630 },
];

export function makeSlot(name, sampleUrl) {
  return {
    name,
    sampleUrl: sampleUrl || null,
    img: null,          // HTMLImageElement once loaded
    fileName: sampleUrl ? sampleUrl.split("/").pop() : "no photo",
    zoom: 1,            // 1 = cover-fit, up to 3
    panX: 0,            // -1..1 of the overflow, 0 = centred
    panY: 0,
  };
}

export const state = {
  mode: "strip",        // "strip" | "poster"
  grade: "golden",      // grade preset id (see grade.js)
  contrast: 0,          // -50..50, added on top of the preset
  saturation: 0,        // -50..50, added on top of the preset
  title: "NEON SHORE",
  subtitle: "a vice city story",
  badge: "EST. 2026",
  sizeId: "portrait",
  selectedSlot: 0,
  slots: [
    makeSlot("Hero photo", "samples/boulevard.jpg"),
    makeSlot("Strip 1", "samples/pier.jpg"),
    makeSlot("Strip 2", "samples/boulevard.jpg"),
    makeSlot("Strip 3", "samples/pier.jpg"),
  ],
};

// Default framing for the sample photos so the first paint already looks
// composed: the strip reuses both samples with different crops.
state.slots[0].panY = 0.5;
state.slots[2].zoom = 1.6;
state.slots[2].panX = -0.5;
state.slots[3].zoom = 1.45;
state.slots[3].panY = 0.35;

export function currentSize() {
  return EXPORT_SIZES.find((s) => s.id === state.sizeId) || EXPORT_SIZES[0];
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load " + url));
    img.src = url;
  });
}

export async function loadSamples() {
  await Promise.all(
    state.slots.map(async (slot) => {
      if (!slot.sampleUrl) return;
      try {
        slot.img = await loadImage(slot.sampleUrl);
      } catch (err) {
        slot.img = null;
      }
    })
  );
}

export async function setSlotFile(slot, file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  slot.img = img;
  slot.fileName = file.name;
  slot.zoom = 1;
  slot.panX = 0;
  slot.panY = 0;
  return img;
}
