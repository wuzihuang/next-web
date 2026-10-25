/** React Bits Dither art direction. The SVG remains the editable photo source. */
export const DITHER_HERO = {
  pixelSize: 2,
  colorNum: 4,
  waveSpeed: 0.05,
  waveFrequency: 3,
  waveAmplitude: 0.3,
  scale: 1,
  photoMotion: 0.45,
  mouseRadius: 0.3,
  mouseStrength: 1,
  trail: 0.5,
  clickRipple: true,
  focusX: 0.69,
  dpr: 2,
  pause: false,
  reference: false,
};
export type DitherSettings = typeof DITHER_HERO;

export function ditherSettings(overrides: Partial<DitherSettings> = {}) {
  const s = {...DITHER_HERO, ...overrides};
  const ranges = {
    pixelSize: [1, 6],
    colorNum: [2, 8],
    waveSpeed: [0, 0.3],
    waveFrequency: [1, 5],
    waveAmplitude: [0, 1],
    scale: [0.1, 4],
    photoMotion: [0, 1],
    mouseRadius: [0.05, 1],
    mouseStrength: [0, 2],
    trail: [0, 1],
    focusX: [0, 1],
    dpr: [1, 2],
  } as const;
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
    if (
      !Number.isFinite(s[key]) ||
      s[key] < ranges[key][0] ||
      s[key] > ranges[key][1]
    )
      throw new Error(`Invalid Dither setting: ${key}`);
  }
  return s;
}
