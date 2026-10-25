import type {VectorScene} from '../vector-hero/scene';

export const HERO_ENTRANCE = {
  duration: 4.8,
  scatterAt: 1.65,
  flightDuration: 2.65,
  photoAt: 2.45,
  photoCompleteAt: 4.65,
  title: 'BUILD YOUR NEXT BODY.',
  // Locally hosted Inter Tight 800, the site's existing display family.
  font: '"NextBody Hero"',
  weight: 800,
  tracking: -0.025,
};

const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const fract = (n: number) => n - Math.floor(n);
export const titlePixelSize = (width: number, pixelSize: number) =>
  Math.max(1, Math.min(pixelSize, width / 600));

/** Rasterize typography once, then retain only editable numeric particle paths.
 * Endpoints are sampled from the SAME SVG density as the final Dither photo.
 * There is no frame-by-frame canvas text painting or DOM particle animation.
 */
export function titleParticles(
  width: number,
  height: number,
  scene: VectorScene,
  focusX: number,
  pixelSize: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) return new Float32Array();
  const maxWidth = width * 0.88;
  let fontSize = Math.min(180, height * 0.215);
  ctx.font = `${HERO_ENTRANCE.weight} ${fontSize}px ${HERO_ENTRANCE.font}`;
  const measured =
    ctx.measureText(HERO_ENTRANCE.title).width +
    (HERO_ENTRANCE.title.length - 1) * fontSize * HERO_ENTRANCE.tracking;
  fontSize *= Math.min(1, maxWidth / measured);
  ctx.font = `${HERO_ENTRANCE.weight} ${fontSize}px ${HERO_ENTRANCE.font}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const tracking = fontSize * HERO_ENTRANCE.tracking;
  const glyphWidths = Array.from(
    HERO_ENTRANCE.title,
    (letter) => ctx.measureText(letter).width,
  );
  const titleWidth =
    glyphWidths.reduce((sum, value) => sum + value, 0) +
    (glyphWidths.length - 1) * tracking;
  let cursor = (width - titleWidth) * 0.5;
  Array.from(HERO_ENTRANCE.title).forEach((letter, index) => {
    ctx.fillText(letter, cursor, height * 0.47);
    cursor += glyphWidths[index] + tracking;
  });
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const step = titlePixelSize(width, pixelSize);
  const starts: number[] = [];
  for (let y = step * 0.5, row = 0; y < height; y += step, row++) {
    for (let x = step * 0.5, col = 0; x < width; x += step, col++) {
      const alpha =
        pixels[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 3] / 255;
      if (alpha > 0.5 && bayer[(row % 4) * 4 + (col % 4)] / 16 < 0.72)
        starts.push(x / width, y / height);
    }
  }
  const scale = Math.max(width / scene.width, height / scene.height);
  const cropX = (scene.width - width / scale) * focusX,
    cropY = (scene.height - height / scale) * 0.5;
  const candidates: {x: number; y: number; cumulative: number}[] = [];
  const areas = [1, 5, 9, 13, 21, 25];
  let total = 0;
  for (let i = 0; i < scene.points.length; i += 7) {
    const x = (scene.points[i] - cropX) * scale,
      y = (scene.points[i + 1] - cropY) * scale;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    total += scene.points[i + 3] * areas[scene.points[i + 2]];
    candidates.push({
      x: ((Math.floor(x / pixelSize) + 0.5) * pixelSize) / width,
      y: ((Math.floor(y / pixelSize) + 0.5) * pixelSize) / height,
      cumulative: total,
    });
  }
  if (!candidates.length) return new Float32Array();
  const data = new Float32Array((starts.length / 2) * 6);
  for (let i = 0; i < starts.length / 2; i++) {
    // Stable stratified assignment, so reloads and resizes do not randomly flicker.
    const sample = fract((i + 1) * 0.61803398875) * total;
    let lo = 0,
      hi = candidates.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (candidates[mid].cumulative < sample) lo = mid + 1;
      else hi = mid;
    }
    const point = candidates[lo],
      seed = fract(Math.sin(i * 127.1 + 31.7) * 43758.5453);
    data.set(
      [
        starts[i * 2],
        starts[i * 2 + 1],
        point.x,
        point.y,
        seed,
        0.66 + 0.34 * fract(i * 0.754877666),
      ],
      i * 6,
    );
  }
  return data;
}

export const INTRO_VERTEX = `#version 300 es
precision highp float;
layout(location=1) in vec4 aPath;
layout(location=2) in vec2 aSeed;
uniform vec2 uResolution;
uniform float uPixel;
uniform float uIntroTime;
uniform float uPhotoReveal;
uniform sampler2D uField;
uniform ivec2 uFieldSize;
out vec3 vColor;
out float vAlpha;
const vec2 corners[6] = vec2[6](vec2(-.5,-.5),vec2(.5,-.5),vec2(-.5,.5),vec2(-.5,.5),vec2(.5,-.5),vec2(.5,.5));
float ease(float v) { return v < .5 ? 4.*v*v*v : 1.-pow(-2.*v+2.,3.)*.5; }
void main() {
  float seed = aSeed.x;
  float gather = smoothstep(seed * .25, .75 + seed * .15, uIntroTime);
  float progress = clamp((uIntroTime - ${HERO_ENTRANCE.scatterAt} - seed * .32) / ${HERO_ENTRANCE.flightDuration}, 0., 1.);
  float travel = ease(progress);
  vec2 start = aPath.xy * uResolution, target = aPath.zw * uResolution;
  vec2 radial = normalize(start - uResolution * .5 + vec2(.001));
  vec2 drift = vec2(sin(seed*41.),cos(seed*29.)) * (1.-gather) * 28.;
  vec2 direction = target - start;
  vec2 tangent = normalize(vec2(-direction.y, direction.x) + vec2(.001));
  vec2 arc = (tangent * (seed-.5) * .16 + radial * .035) * min(uResolution.x,uResolution.y) * sin(progress * 3.14159265);
  vec2 position = mix(start, target, travel) + arc + drift;
  position += corners[gl_VertexID] * uPixel;
  gl_Position = vec4(position.x/uResolution.x*2.-1., 1.-position.y/uResolution.y*2., 0., 1.);
  ivec2 cell = clamp(ivec2(vec2(aPath.z,1.-aPath.w) * vec2(uFieldSize)), ivec2(0), uFieldSize-1);
  vec4 photo = texelFetch(uField,cell,0);
  vColor = mix(vec3(239.,246.,90.)/255., vec3(1.), photo.b * smoothstep(.6,1.,travel));
  vAlpha = gather * aSeed.y * (1.-smoothstep(.55,1.,uPhotoReveal));
}`;

export const INTRO_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main() { outColor = vec4(vColor,vAlpha); }
`;
