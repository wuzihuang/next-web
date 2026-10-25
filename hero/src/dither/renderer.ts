import type {VectorScene} from '../vector-hero/scene';
import type {DitherSettings} from './settings';
import {EXPLORE_FLIGHT_VERTEX, EXPLORE_FLIGHT_FRAGMENT} from './explore-flight';
import {
  HERO_ENTRANCE,
  INTRO_VERTEX,
  INTRO_FRAGMENT,
  titleParticles,
  titlePixelSize,
} from './intro';
import {
  VERTEX,
  NOISE_FRAGMENT,
  FIELD_FRAGMENT,
  DITHER_FRAGMENT,
} from './shaders';

type Program = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
};
export type DitherFrame = {
  time: number;
  trail: Float32Array;
  trailCount: number;
  ripples: Float32Array;
  rippleCount: number;
  reference: boolean;
  entrance?: number;
  beacon: {
    x: number;
    y: number;
    strength: number;
    time: number;
    flight: number;
    flightTime: number;
    width: number;
    height: number;
  };
};

/** Three bounded GPU passes, all fullscreen triangles. No raster photo upload. */
export function createDitherRenderer(
  gl: WebGL2RenderingContext,
  scene: VectorScene,
  settings: DitherSettings,
  entrance = false,
) {
  const programs: WebGLProgram[] = [];
  const textures: WebGLTexture[] = [];
  const frames: WebGLFramebuffer[] = [];
  const buffers: WebGLBuffer[] = [];
  const vao = gl.createVertexArray();
  const introVao = entrance ? gl.createVertexArray() : null;
  function dispose() {
    programs.forEach((p) => gl.deleteProgram(p));
    textures.forEach((t) => gl.deleteTexture(t));
    frames.forEach((f) => gl.deleteFramebuffer(f));
    buffers.forEach((b) => gl.deleteBuffer(b));
    gl.deleteVertexArray(vao);
    gl.deleteVertexArray(introVao);
  }
  function link(fragment: string, vertex = VERTEX): Program {
    const shaders: WebGLShader[] = [];
    try {
      for (const [kind, source] of [
        [gl.VERTEX_SHADER, vertex],
        [gl.FRAGMENT_SHADER, fragment],
      ] as const) {
        const shader = gl.createShader(kind)!;
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(
            gl.getShaderInfoLog(shader) || 'Dither shader failed',
          );
      }
      const program = gl.createProgram()!;
      programs.push(program);
      shaders.forEach((shader) => gl.attachShader(program, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) || 'Dither link failed');
      const uniforms: Program['uniforms'] = {};
      for (
        let i = 0;
        i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        i++
      ) {
        const name = gl.getActiveUniform(program, i)!.name;
        uniforms[name.replace('[0]', '')] = gl.getUniformLocation(
          program,
          name,
        );
      }
      return {program, uniforms};
    } finally {
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
  }
  function texture(
    width: number,
    height: number,
    data: Uint8Array | null,
    linear = false,
  ) {
    const t = gl.createTexture()!;
    textures.push(t);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      linear ? gl.LINEAR : gl.NEAREST,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      linear ? gl.LINEAR : gl.NEAREST,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
    return t;
  }
  function target(width: number, height: number, linear = false) {
    const t = texture(width, height, null, linear);
    const framebuffer = gl.createFramebuffer()!;
    frames.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      t,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error('Dither target unavailable');
    return {texture: t, framebuffer};
  }
  function bind(program: Program, name: string, unit: number, t: WebGLTexture) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.uniform1i(program.uniforms[name], unit);
  }
  try {
    const cols = Math.ceil(scene.width / scene.step),
      rows = Math.ceil(scene.height / scene.step);
    const density = new Float32Array(cols * rows),
      white = new Float32Array(cols * rows);
    const areas = [1, 5, 9, 13, 21, 25];
    for (let i = 0; i < scene.points.length; i += 7) {
      const x = Math.floor(scene.points[i] / scene.step),
        y = Math.floor(scene.points[i + 1] / scene.step);
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const d =
        scene.points[i + 3] *
        areas[scene.points[i + 2]] *
        (scene.micro / scene.step) ** 2;
      density[y * cols + x] += d;
      if (scene.points[i + 6] > 0.9) white[y * cols + x] += d;
    }
    const photoData = new Uint8Array(cols * rows * 4);
    for (let i = 0; i < density.length; i++) {
      const value = Math.min(0.99999, density[i]) * 255;
      photoData[i * 4] = Math.floor(value);
      photoData[i * 4 + 1] = Math.round((value % 1) * 255);
      photoData[i * 4 + 2] = Math.round(Math.min(1, white[i]) * 255);
      photoData[i * 4 + 3] = 255;
    }
    const photo = texture(cols, rows, photoData, true);
    const noise = target(256, 256, true);
    const field = target(1, 1);
    const noiseProgram = link(NOISE_FRAGMENT),
      fieldProgram = link(FIELD_FRAGMENT),
      ditherProgram = link(DITHER_FRAGMENT);
    const introProgram = entrance ? link(INTRO_FRAGMENT, INTRO_VERTEX) : null;
    const flightProgram = entrance
      ? link(EXPLORE_FLIGHT_FRAGMENT, EXPLORE_FLIGHT_VERTEX)
      : null;
    const introBuffer = entrance ? gl.createBuffer()! : null;
    if (introBuffer) buffers.push(introBuffer);
    let introCount = 0;
    let width = 1,
      height = 1,
      cell = 2,
      fieldWidth = 1,
      fieldHeight = 1;
    let crop = [0, 0, scene.width, scene.height];
    let previousNoiseTime = NaN;

    function resize(cssWidth: number, cssHeight: number, ratio: number) {
      width = cssWidth;
      height = cssHeight;
      cell = Math.max(1, Math.round(settings.pixelSize * ratio));
      fieldWidth = Math.ceil(gl.canvas.width / cell);
      fieldHeight = Math.ceil(gl.canvas.height / cell);
      if (
        Math.max(fieldWidth, fieldHeight) > gl.getParameter(gl.MAX_TEXTURE_SIZE)
      )
        throw new Error('Dither viewport too large');
      gl.bindTexture(gl.TEXTURE_2D, field.texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        fieldWidth,
        fieldHeight,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      const scale = Math.max(width / scene.width, height / scene.height);
      const viewWidth = width / scale,
        viewHeight = height / scale;
      crop = [
        (scene.width - viewWidth) * settings.focusX,
        (scene.height - viewHeight) * 0.5,
        viewWidth,
        viewHeight,
      ];
      previousNoiseTime = NaN;
      if (introBuffer) {
        const points = titleParticles(
          width,
          height,
          scene,
          settings.focusX,
          settings.pixelSize,
        );
        introCount = points.length / 6;
        gl.bindVertexArray(introVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, introBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
        gl.vertexAttribDivisor(2, 1);
      }
    }
    function draw(state: DitherFrame) {
      const introTime = state.reference
        ? HERO_ENTRANCE.duration
        : (state.entrance ?? HERO_ENTRANCE.duration);
      const revealProgress = Math.max(
        0,
        Math.min(
          1,
          (introTime - HERO_ENTRANCE.photoAt) /
            (HERO_ENTRANCE.photoCompleteAt - HERO_ENTRANCE.photoAt),
        ),
      );
      const photoReveal =
        revealProgress * revealProgress * (3 - 2 * revealProgress);
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);
      if (previousNoiseTime !== state.time) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, noise.framebuffer);
        gl.viewport(0, 0, 256, 256);
        gl.useProgram(noiseProgram.program);
        const u = noiseProgram.uniforms;
        gl.uniform2f(u.uResolution, width, height);
        gl.uniform2f(u.uNoiseSize, 256, 256);
        gl.uniform1f(u.uTime, state.time);
        gl.uniform1f(u.uWaveSpeed, settings.waveSpeed);
        gl.uniform1f(u.uWaveFrequency, settings.waveFrequency);
        gl.uniform1f(u.uWaveAmplitude, settings.waveAmplitude);
        gl.uniform1f(u.uScale, settings.scale);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        previousNoiseTime = state.time;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, field.framebuffer);
      gl.viewport(0, 0, fieldWidth, fieldHeight);
      gl.useProgram(fieldProgram.program);
      bind(fieldProgram, 'uNoise', 0, noise.texture);
      bind(fieldProgram, 'uPhoto', 1, photo);
      const f = fieldProgram.uniforms;
      gl.uniform2f(f.uResolution, width, height);
      gl.uniform2f(f.uSceneSize, scene.width, scene.height);
      gl.uniform2f(
        f.uPhotoSize,
        scene.width / (cols * scene.step),
        scene.height / (rows * scene.step),
      );
      gl.uniform4f(f.uView, crop[0], crop[1], crop[2], crop[3]);
      gl.uniform1f(f.uCell, (cell * width) / gl.canvas.width);
      gl.uniform1f(f.uPhotoMotion, settings.photoMotion);
      gl.uniform1f(f.uRadius, settings.mouseRadius);
      gl.uniform1f(f.uStrength, settings.mouseStrength);
      gl.uniform1f(f.uReference, state.reference ? 1 : 0);
      gl.uniform3fv(f.uTrail, state.trail);
      gl.uniform1i(f.uTrailCount, state.trailCount);
      gl.uniform4fv(f.uRipples, state.ripples);
      gl.uniform1i(f.uRippleCount, state.rippleCount);
      gl.uniform4f(
        f.uBeacon,
        state.beacon.x,
        state.beacon.y,
        state.beacon.time,
        state.beacon.strength,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(ditherProgram.program);
      bind(ditherProgram, 'uField', 0, field.texture);
      gl.uniform2i(ditherProgram.uniforms.uFieldSize, fieldWidth, fieldHeight);
      gl.uniform1f(ditherProgram.uniforms.uCellDevice, cell);
      gl.uniform1f(ditherProgram.uniforms.uColorNum, settings.colorNum);
      gl.uniform1f(ditherProgram.uniforms.uReveal, photoReveal);
      const buttonWidth =
        introTime >= HERO_ENTRANCE.duration ? state.beacon.width : 0;
      gl.uniform4f(
        ditherProgram.uniforms.uButton,
        width * 0.5 + state.beacon.x * height,
        height * (0.5 + state.beacon.y),
        buttonWidth,
        state.beacon.height,
      );
      gl.uniform1f(
        ditherProgram.uniforms.uDeviceRatio,
        gl.canvas.width / width,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (flightProgram && state.beacon.flight > 0.002 && !state.reference) {
        gl.useProgram(flightProgram.program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        const u = flightProgram.uniforms;
        gl.uniform2f(u.uResolution, width, height);
        gl.uniform2f(u.uOrigin, state.beacon.x, state.beacon.y);
        gl.uniform2f(u.uButtonSize, state.beacon.width, state.beacon.height);
        gl.uniform1f(u.uFlightTime, state.beacon.flightTime);
        gl.uniform1f(u.uFlight, state.beacon.flight);
        const ratio = gl.canvas.width / width;
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(
          Math.floor(
            (width * 0.5 + state.beacon.x * height - state.beacon.width * 0.5) *
              ratio,
          ),
          Math.floor(
            (height * (0.5 + state.beacon.y) - state.beacon.height * 0.5) *
              ratio,
          ),
          Math.ceil(state.beacon.width * ratio),
          Math.ceil(state.beacon.height * ratio),
        );
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 2800);
        gl.disable(gl.SCISSOR_TEST);
      }
      if (introProgram && introCount && introTime < HERO_ENTRANCE.duration) {
        gl.useProgram(introProgram.program);
        gl.bindVertexArray(introVao);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        bind(introProgram, 'uField', 0, field.texture);
        const u = introProgram.uniforms;
        gl.uniform2f(u.uResolution, width, height);
        gl.uniform2i(u.uFieldSize, fieldWidth, fieldHeight);
        gl.uniform1f(
          u.uPixel,
          titlePixelSize(width, settings.pixelSize) * 0.85,
        );
        gl.uniform1f(u.uIntroTime, introTime);
        gl.uniform1f(u.uPhotoReveal, photoReveal);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, introCount);
      }
    }
    return {
      draw,
      resize,
      dispose,
      get introCount() {
        return introCount;
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
