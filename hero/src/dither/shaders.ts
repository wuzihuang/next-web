import {BAYER_8, WAVE_NOISE} from './source';

export const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

// Original Dither noise, evaluated on a bounded grid independently of the photo.
export const NOISE_FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uNoiseSize;
uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uScale;
out vec4 outColor;
${WAVE_NOISE}
void main() {
  vec2 uv = gl_FragCoord.xy / uNoiseSize - .5;
  uv.x *= uResolution.x / uResolution.y;
  float value = clamp(pattern(uv / uScale) * .5, 0., .99999);
  outColor = vec4(floor(value * 255.) / 255., fract(value * 255.), 0., 1.);
}`;

// The photo is a numeric density/color grid derived from editable SVG points.
// Mouse follow, trail falloff and click-ring formulas come from React Bits Dither.
export const FIELD_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uNoise;
uniform sampler2D uPhoto;
uniform vec2 uResolution;
uniform vec2 uSceneSize;
uniform vec2 uPhotoSize;
uniform vec4 uView;
uniform float uCell;
uniform float uPhotoMotion;
uniform float uRadius;
uniform float uStrength;
uniform float uReference;
uniform vec3 uTrail[16];
uniform int uTrailCount;
uniform vec4 uRipples[4];
uniform int uRippleCount;
uniform vec4 uBeacon;
out vec4 outColor;
void main() {
  vec2 corner = (gl_FragCoord.xy - .5) * uCell;
  vec2 screen = (corner + uCell * .5) / uResolution;
  vec2 uv = corner / uResolution - .5;
  uv.x *= uResolution.x / uResolution.y;
  float touch = 0.;
  for (int i = 0; i < 16; i++) {
    if (i >= uTrailCount) break;
    vec3 point = uTrail[i];
    float reach = uRadius * mix(.55, 1., point.z);
    touch = max(touch, point.z * (1. - smoothstep(0., reach, length(uv - point.xy))));
  }
  vec2 warp = vec2(0.);
  float ring = 0.;
  // Quiet recurring waves share the click ripple's material and button origin.
  for (int i = 0; i < 3; i++) {
    float age = mod(uBeacon.z + float(i) * 1.35, 4.05);
    vec2 delta = uv - uBeacon.xy;
    float dist = length(delta);
    float envelope = smoothstep(0., .3, age) * pow(1. - age / 4.05, 2.);
    float wave = exp(-pow((dist - age * .24) / .025, 2.)) * envelope * uBeacon.w;
    ring += wave;
    warp += delta / max(dist, .0001) * wave * .015;
  }
  for (int i = 0; i < 4; i++) {
    if (i >= uRippleCount) break;
    vec4 ripple = uRipples[i];
    vec2 delta = uv - ripple.xy;
    float dist = length(delta);
    float life = clamp(ripple.z / 1.6, 0., 1.);
    float wave = exp(-pow((dist - ripple.z * .9) / .07, 2.)) * (1. - life) * (1. - life) * ripple.w;
    warp += (dist > .0001 ? delta / dist : vec2(0.)) * wave * .035;
    ring += wave;
  }
  vec2 source = uView.xy + vec2(screen.x, 1. - screen.y) * uView.zw;
  // No photograph displacement. Only the noise bends under click ripples.
  vec4 photo = texture(uPhoto, source / uSceneSize * uPhotoSize);
  float density = photo.r + photo.g / 255.;
  vec2 waveUv = screen + warp * vec2(uResolution.y / uResolution.x, 1.);
  vec2 noise = texture(uNoise, waveUv).rg;
  float f = density * (1. + (2. * (noise.r + noise.g / 255.) - .5) * uPhotoMotion * (1. - uReference));
  f -= .5 * touch * uStrength * (1. - uReference);
  f += ring * .55 * smoothstep(.001, .025, density) * (1. - uReference);
  f = clamp(f, 0., 1.);
  outColor = vec4(floor(f * 255.) / 255., fract(f * 255.),
    clamp(photo.b / max(density, .0001), 0., 1.), 1.);
}`;

export const DITHER_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uField;
uniform ivec2 uFieldSize;
uniform float uCellDevice;
uniform float uColorNum;
uniform float uReveal;
uniform vec4 uButton;
uniform float uDeviceRatio;
out vec4 outColor;
${BAYER_8}
void main() {
  vec2 cell = floor(gl_FragCoord.xy / uCellDevice);
  vec4 value = texelFetch(uField, clamp(ivec2(cell), ivec2(0), uFieldSize - 1), 0);
  float f = (value.r + value.g / 255.) * uReveal;
  ivec2 c = ivec2(mod(cell, 8.));
  float threshold = bayer8[c.y * 8 + c.x];
  float levels = uColorNum - 1.;
  // Ordered quantization in source SVG color space preserves mean photo tone.
  float shade = floor(clamp(f, 0., 1.) * levels + threshold) / levels;
  vec3 ink = mix(vec3(239.,246.,90.) / 255., vec3(1.), value.b);
  vec3 color = mix(vec3(7.,9.,7.) / 255., ink, shade);
  if (uButton.z > 0.) {
    vec2 local = gl_FragCoord.xy / uDeviceRatio - uButton.xy;
    vec2 halfSize = uButton.zw * .5;
    float capsule = length(max(abs(local) - vec2(halfSize.x - halfSize.y, 0.), 0.)) - halfSize.y;
    color = mix(color, vec3(7.,9.,7.) / 255., (1. - smoothstep(-1., 0., capsule)) * .9);
  }
  outColor = vec4(color, 1.);
}`;
