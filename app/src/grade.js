// Cover Forge — colour grades.
// Each preset is a canvas filter (applied while the photo is drawn) plus an
// overlay wash painted over the photo, plus the lettering colours that go
// with it. The user's contrast/saturation sliders nudge the filter further.

export const GRADES = [
  {
    id: "golden",
    name: "Golden Hour",
    swatch: "linear-gradient(135deg,#ffd166 0%,#ff7a3c 45%,#ff2e88 100%)",
    filter: { contrast: 1.1, saturate: 1.3, brightness: 1.03, grayscale: 0, hue: 0 },
    titleStops: ["#fff3b0", "#ffb03a", "#ff5e62", "#ff2e88"],
    titleStroke: "rgba(43,10,28,0.92)",
    subtitle: "#ffe9c9",
    accent: "#ff2e88",
    badgeBg: "#1b0f1e",
    badgeInk: "#ffd166",
    vignette: 0.42,
    wash(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(255,140,60,0.20)");
      g.addColorStop(0.55, "rgba(255,80,110,0.10)");
      g.addColorStop(1, "rgba(70,10,60,0.28)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "neon",
    name: "Midnight Neon",
    swatch: "linear-gradient(135deg,#0b2a4a 0%,#0fb5c9 45%,#ff2ec4 100%)",
    filter: { contrast: 1.22, saturate: 1.35, brightness: 0.96, grayscale: 0, hue: -6 },
    titleStops: ["#b8fbff", "#37e0ff", "#ff2ec4"],
    titleStroke: "rgba(4,8,32,0.95)",
    subtitle: "#c9f6ff",
    accent: "#ff2ec4",
    badgeBg: "#050a24",
    badgeInk: "#37e0ff",
    vignette: 0.55,
    wash(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "rgba(10,60,120,0.30)");
      g.addColorStop(0.5, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(160,0,120,0.26)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "pastel",
    name: "Pastel Vice",
    swatch: "linear-gradient(135deg,#ffd9ec 0%,#ffb3d9 40%,#9be8ff 100%)",
    filter: { contrast: 0.9, saturate: 1.12, brightness: 1.1, grayscale: 0, hue: 4 },
    titleStops: ["#ffffff", "#ffd9ec", "#ff8fc7"],
    titleStroke: "rgba(90,30,80,0.85)",
    subtitle: "#ffffff",
    accent: "#ff8fc7",
    badgeBg: "#ffffff",
    badgeInk: "#c2187a",
    vignette: 0.22,
    wash(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(255,200,230,0.16)");
      g.addColorStop(1, "rgba(140,220,255,0.14)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "mono",
    name: "Mono Pop",
    swatch: "linear-gradient(135deg,#f5f5f5 0%,#9a9a9a 55%,#222 100%)",
    filter: { contrast: 1.28, saturate: 1, brightness: 1.02, grayscale: 1, hue: 0 },
    titleStops: ["#ff5ea8", "#ff2e88", "#d6006d"],
    titleStroke: "rgba(10,10,10,0.95)",
    subtitle: "#ffffff",
    accent: "#ff2e88",
    badgeBg: "#ff2e88",
    badgeInk: "#ffffff",
    vignette: 0.5,
    wash(ctx, w, h) {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, w, h);
    },
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Build the ctx.filter string for a preset plus the user's sliders.
// Slider values are -50..50, meaning -50%..+50% on top of the preset.
export function filterString(grade, contrastDelta, saturationDelta) {
  const f = grade.filter;
  const contrast = Math.max(0.2, f.contrast * (1 + contrastDelta / 100));
  const saturate = Math.max(0, f.saturate * (1 + saturationDelta / 100));
  const parts = [
    "contrast(" + contrast.toFixed(3) + ")",
    "saturate(" + saturate.toFixed(3) + ")",
    "brightness(" + f.brightness.toFixed(3) + ")",
  ];
  if (f.grayscale > 0) parts.push("grayscale(" + f.grayscale + ")");
  if (f.hue !== 0) parts.push("hue-rotate(" + f.hue + "deg)");
  return parts.join(" ");
}
