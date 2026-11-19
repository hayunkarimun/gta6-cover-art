// Cover Forge — deterministic scenes for screenshots (?shot=...).
// Each scene pins the mode, grade, lettering and framing so a screenshot
// always shows the same cover. The "cover" scene hides the editor chrome
// and draws only the exported cover, at a size the rules allow.

export const SCENES = {
  strip: {
    mode: "strip",
    grade: "golden",
    title: "NEON SHORE",
    subtitle: "a vice city story",
    badge: "EST. 2026",
    sizeId: "portrait",
  },
  poster: {
    mode: "poster",
    grade: "neon",
    title: "NIGHT SHIFT",
    subtitle: "after dark downtown",
    badge: "EST. 2026",
    sizeId: "portrait",
  },
  pastel: {
    mode: "strip",
    grade: "pastel",
    title: "PALM SUNDAE",
    subtitle: "sweet heat, soft light",
    badge: "EST. 2026",
    sizeId: "square",
  },
  mono: {
    mode: "poster",
    grade: "mono",
    title: "PIER PRESSURE",
    subtitle: "gone fishin'",
    badge: "EST. 2026",
    sizeId: "portrait",
  },
  cover: {
    mode: "strip",
    grade: "golden",
    title: "NEON SHORE",
    subtitle: "a vice city story",
    badge: "EST. 2026",
    sizeId: "portrait",
    coverOnly: true,
    coverW: 1024,
    coverH: 1280,
  },
};

export function shotFromUrl() {
  const params = new URLSearchParams(location.search);
  return params.get("shot");
}

export function applyScene(state, scene) {
  state.mode = scene.mode;
  state.grade = scene.grade;
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.badge = scene.badge;
  state.sizeId = scene.sizeId;
  state.contrast = 0;
  state.saturation = 0;
}
