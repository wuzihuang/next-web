/** Galaxy-inspired depth flight. Procedural instances share the Dither canvas;
 * no second WebGL context, particle DOM nodes, or per-frame CPU allocations.
 * Perspective is 1/z, so near particles grow and accelerate past the viewer.
 */
export const EXPLORE_FLIGHT_VERTEX = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform vec2 uButtonSize;
uniform float uFlightTime;
uniform float uFlight;
out vec2 vUv;
out float vAlpha;
out vec3 vColor;
out vec2 vLocal;
const vec2 corners[6] = vec2[6](vec2(-.5,-.5),vec2(.5,-.5),vec2(-.5,.5),vec2(-.5,.5),vec2(.5,-.5),vec2(.5,.5));
float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
void main() {
  float id = float(gl_InstanceID);
  float seed = hash(id + 9.);
  float phase = fract(seed + uFlightTime * (.46 + hash(id + 7.) * .28));
  float z = mix(4.2, .16, phase);
  float angle = hash(id + 3.) * 6.2831853;
  vec2 radial = vec2(cos(angle), sin(angle));
  vec2 tangent = vec2(-radial.y, radial.x);
  float radius = (.04 + sqrt(hash(id + 1.)) * .28) * uButtonSize.y;
  vec2 origin = vec2(uOrigin.x * uResolution.y + uResolution.x * .5, uResolution.y * (.5 - uOrigin.y));
  vec2 spread = radial * vec2(uButtonSize.x / uButtonSize.y, 1.);
  vec2 position = origin + spread * radius * (1. / z - 1. / 4.2);
  radial = normalize(spread);
  tangent = vec2(-radial.y, radial.x);
  float size = clamp((.5 + hash(id + 5.) * .65) / z, .55, 2.5);
  float stretch = min(14., size + uFlight * 2. / (z*z));
  vec2 corner = corners[gl_VertexID];
  position += radial * corner.x * stretch + tangent * corner.y * size;
  vLocal = position - origin;
  gl_Position = vec4(position.x / uResolution.x * 2. - 1., 1. - position.y / uResolution.y * 2., 0., 1.);
  vUv = corner;
  vAlpha = smoothstep(0., .12, phase) * (1. - smoothstep(.88, 1., phase)) * uFlight * (.45 + seed * .55);
  vColor = mix(vec3(239.,246.,90.)/255., vec3(1.), step(.72, seed));
}`;

export const EXPLORE_FLIGHT_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
in float vAlpha;
in vec3 vColor;
in vec2 vLocal;
uniform vec2 uButtonSize;
out vec4 outColor;
void main() {
  vec2 halfSize = uButtonSize * .5 - 2.;
  float capsule = length(max(abs(vLocal) - vec2(halfSize.x - halfSize.y, 0.), 0.)) - halfSize.y;
  if (capsule > 0.) discard;
  float edge = (1. - smoothstep(.3, .5, abs(vUv.y))) * (1. - smoothstep(.25, .5, abs(vUv.x)));
  outColor = vec4(vColor, vAlpha * edge);
}`;
