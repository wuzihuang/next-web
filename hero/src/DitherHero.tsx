import {useEffect, useRef} from 'react';
import {parseVectors} from './vector-hero/scene';
import {ditherSettings, type DitherSettings} from './dither/settings';
import {createDitherRenderer} from './dither/renderer';
import {HERO_ENTRANCE} from './dither/intro';

type TrailPoint = {x: number; y: number; weight: number};
type Ripple = {x: number; y: number; age: number};

/** Dither's ordered pixels and cursor trail, with a fixed editable SVG photo. */
export default function DitherHero({
  settings: overrides,
  intro = false,
}: {
  settings?: Partial<DitherSettings>;
  intro?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const host = hostRef.current,
      canvas = canvasRef.current,
      hero = host?.closest('section');
    if (!host || !canvas || !hero) return;
    const abort = new AbortController();
    let dispose = () => {};
    function fallback() {
      if (intro) {
        host!.dataset.entrance = 'complete';
        hero!.dataset.intro = 'complete';
      }
    }
    async function mount() {
      const response = await fetch('/landing/hero-vector.svg', {
        signal: abort.signal,
      });
      if (!response.ok) throw new Error('Dither photo source unavailable');
      const scene = parseVectors(await response.text());
      if (intro)
        await document.fonts
          .load(`${HERO_ENTRANCE.weight} 160px ${HERO_ENTRANCE.font}`)
          .catch(() => []);
      if (abort.signal.aborted) return;
      const settings = ditherSettings(overrides);
      let fixedIntro: number | null = null;
      if (import.meta.env.DEV) {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('hero');
        if (view === 'reference') settings.reference = true;
        if (view === 'paused') settings.pause = true;
        if (intro && params.has('intro')) {
          const value = Number(params.get('intro'));
          if (
            Number.isFinite(value) &&
            value >= 0 &&
            value <= HERO_ENTRANCE.duration
          ) {
            fixedIntro = value;
            settings.pause = true;
          }
        }
      }
      const gl = canvas!.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
      if (!gl) {
        fallback();
        return;
      }
      let renderer = createDitherRenderer(gl, scene, settings, intro);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const trail: TrailPoint[] = [],
        ripples: Ripple[] = [];
      const trailData = new Float32Array(16 * 3),
        rippleData = new Float32Array(4 * 4);
      const pointer = {x: 0, y: 0, set: false, inside: false};
      const beacon = {
        x: 0,
        y: 0,
        strength: 0,
        time: 0,
        flight: 0,
        flightTime: 0,
        width: 0,
        height: 0,
      };
      let exploreActive = false;
      let hasExplore = false;
      const state = {
        time: 12,
        hx: 0,
        hy: 0,
        presence: 0,
        entrance: intro ? (fixedIntro ?? 0) : HERO_ENTRANCE.duration,
      };
      let width = 1,
        height = 1,
        frame = 0,
        previous = 0,
        visible = true,
        lost = false,
        focused = document.hasFocus();
      const reference = () => settings.reference || reduced.matches;
      const toUv = (x: number, y: number) => [
        (x - width * 0.5) / height,
        0.5 - y / height,
      ];
      function render() {
        if (lost) return;
        if (reference()) state.entrance = HERO_ENTRANCE.duration;
        if (intro) {
          const phase =
            state.entrance >= HERO_ENTRANCE.duration
              ? 'complete'
              : state.entrance < HERO_ENTRANCE.scatterAt
                ? 'title'
                : 'scatter';
          if (host!.dataset.entrance !== phase) {
            host!.dataset.entrance = phase;
            hero!.dataset.intro = phase;
          }
        }
        let trailCount = 0;
        for (const point of trail) {
          if (point.weight <= 0.01) continue;
          trailData.set([point.x, point.y, point.weight], trailCount++ * 3);
        }
        ripples.forEach((r, i) => rippleData.set([r.x, r.y, r.age, 1], i * 4));
        renderer.draw({
          time: state.time,
          trail: trailData,
          trailCount,
          ripples: rippleData,
          rippleCount: ripples.length,
          reference: reference(),
          entrance: state.entrance,
          beacon,
        });
      }
      function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
      }
      function wake() {
        if (
          !frame &&
          visible &&
          focused &&
          !document.hidden &&
          !lost &&
          !reference() &&
          fixedIntro === null
        )
          frame = requestAnimationFrame(tick);
      }
      function clear() {
        stop();
        pointer.inside = false;
        state.presence = 0;
        trail.length = 0;
        ripples.length = 0;
        render();
        wake();
      }
      function resize() {
        const rect = host!.getBoundingClientRect();
        if (!rect.width || !rect.height || lost) return;
        width = rect.width;
        height = rect.height;
        const ratio = Math.min(window.devicePixelRatio || 1, settings.dpr);
        canvas!.width = Math.round(width * ratio);
        canvas!.height = Math.round(height * ratio);
        renderer.resize(width, height, ratio);
        const button = hero!.querySelector('.hero-explore');
        hasExplore = !!button;
        if (button) {
          const bounds = button.getBoundingClientRect();
          beacon.width = bounds.width;
          beacon.height = bounds.height;
          const content = button.parentElement;
          const transform = content
            ? getComputedStyle(content).transform
            : 'none';
          const entranceOffset =
            transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
          [beacon.x, beacon.y] = toUv(
            bounds.left + bounds.width / 2 - rect.left,
            bounds.top + bounds.height / 2 - rect.top - entranceOffset,
          );
        }
        canvas!.dataset.introParticles = String(renderer.introCount);
        clear();
      }
      function tick(now: number) {
        frame = 0;
        if (lost || !visible || !focused || document.hidden || reference())
          return;
        const dt = previous
          ? Math.max(0.0005, Math.min(0.05, (now - previous) / 1000))
          : 1 / 60;
        previous = now;
        state.entrance = Math.min(HERO_ENTRANCE.duration, state.entrance + dt);
        if (hasExplore && state.entrance >= HERO_ENTRANCE.duration) {
          beacon.time += dt;
          beacon.flight +=
            ((exploreActive ? 1 : 0) - beacon.flight) *
            (1 - Math.exp(-dt / (exploreActive ? 0.16 : 0.23)));
          beacon.flightTime += dt * (0.35 + beacon.flight * 1.6);
          beacon.strength +=
            ((exploreActive ? 0.8 : 0.32) - beacon.strength) *
            (1 - Math.exp(-dt / 0.4));
        }
        if (!settings.pause) state.time += dt;
        const engaged = pointer.inside;
        state.presence +=
          ((engaged ? 1 : 0) - state.presence) *
          (1 - Math.exp(-dt / (engaged ? 0.12 : 0.35)));
        if (pointer.set) {
          const [tx, ty] = toUv(pointer.x, pointer.y),
            follow = 1 - Math.exp(-dt / 0.06);
          const moved = Math.hypot(tx - state.hx, ty - state.hy);
          state.hx += (tx - state.hx) * follow;
          state.hy += (ty - state.hy) * follow;
          const decay = Math.exp(-dt / (0.08 + settings.trail * 0.7));
          trail.forEach((point) => {
            point.weight *= decay;
          });
          const head = trail[0];
          if (
            !head ||
            Math.hypot(head.x - state.hx, head.y - state.hy) > 0.012 ||
            moved > 0.012
          )
            trail.unshift({x: state.hx, y: state.hy, weight: state.presence});
          else {
            head.x = state.hx;
            head.y = state.hy;
            head.weight = state.presence;
          }
          if (settings.trail <= 0.001) trail.length = Math.min(1, trail.length);
          while (
            trail.length > 16 ||
            (trail.length > 1 && trail.at(-1)!.weight < 0.01)
          )
            trail.pop();
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
          ripples[i].age += dt;
          if (ripples[i].age >= 1.6) ripples.splice(i, 1);
        }
        render();
        if (
          !settings.pause ||
          (hasExplore && fixedIntro === null) ||
          state.entrance < HERO_ENTRANCE.duration ||
          state.presence > 0.002 ||
          trail.some((p) => p.weight > 0.01) ||
          ripples.length
        )
          frame = requestAnimationFrame(tick);
        else previous = 0;
      }
      function locate(event: PointerEvent) {
        const rect = host!.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
        pointer.inside =
          pointer.x >= 0 &&
          pointer.y >= 0 &&
          pointer.x <= width &&
          pointer.y <= height;
        if (pointer.inside && !pointer.set) {
          [state.hx, state.hy] = toUv(pointer.x, pointer.y);
          pointer.set = true;
        }
      }
      function move(event: PointerEvent) {
        if (
          event.pointerType === 'touch' ||
          reference() ||
          state.entrance < HERO_ENTRANCE.duration ||
          fixedIntro !== null
        )
          return;
        if (
          event.target instanceof Element &&
          event.target.closest('.hero-explore')
        ) {
          pointer.inside = false;
          return;
        }
        locate(event);
        wake();
      }
      function down(event: PointerEvent) {
        if (
          reference() ||
          state.entrance < HERO_ENTRANCE.duration ||
          fixedIntro !== null ||
          !settings.clickRipple ||
          (event.target instanceof Element && event.target.closest('a,button'))
        )
          return;
        locate(event);
        if (!pointer.inside) return;
        const [x, y] = toUv(pointer.x, pointer.y);
        ripples.push({x, y, age: 0});
        if (ripples.length > 4) ripples.shift();
        wake();
      }
      function leave() {
        pointer.inside = false;
      }
      function up(event: PointerEvent) {
        if (event.pointerType !== 'mouse') leave();
      }
      function blur() {
        focused = false;
        clear();
      }
      function focus() {
        focused = true;
        wake();
      }
      function key(event: KeyboardEvent) {
        if (event.key === 'Escape' && state.entrance < HERO_ENTRANCE.duration) {
          state.entrance = HERO_ENTRANCE.duration;
          render();
          wake();
        }
      }
      function explore(event: Event) {
        const detail = (
          event as CustomEvent<{active: boolean; departing: boolean}>
        ).detail;
        exploreActive = detail.active;
        if (detail.departing && !reference()) {
          ripples.push({x: beacon.x, y: beacon.y, age: 0});
          if (ripples.length > 4) ripples.shift();
        }
        wake();
      }
      function contextLost(event: Event) {
        event.preventDefault();
        lost = true;
        stop();
        delete host!.dataset.ready;
        state.entrance = HERO_ENTRANCE.duration;
        fallback();
      }
      function contextRestored() {
        try {
          renderer.dispose();
          renderer = createDitherRenderer(gl!, scene, settings, intro);
          lost = false;
          resize();
          host!.dataset.ready = 'true';
        } catch (error) {
          console.error('Dither context restore:', error);
        }
      }
      const observer = new ResizeObserver(resize);
      const intersection = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        clear();
      });
      dispose = () => {
        stop();
        observer.disconnect();
        intersection.disconnect();
        hero!.removeEventListener('pointermove', move);
        hero!.removeEventListener('hero-explore', explore);
        hero!.removeEventListener('pointerdown', down);
        hero!.removeEventListener('pointerleave', leave);
        hero!.removeEventListener('pointerup', up);
        hero!.removeEventListener('pointercancel', up);
        window.removeEventListener('blur', blur);
        window.removeEventListener('focus', focus);
        window.removeEventListener('keydown', key);
        document.removeEventListener('visibilitychange', clear);
        reduced.removeEventListener('change', clear);
        canvas!.removeEventListener('webglcontextlost', contextLost);
        canvas!.removeEventListener('webglcontextrestored', contextRestored);
        renderer.dispose();
        delete host!.dataset.ready;
      };
      canvas!.dataset.renderer = 'bayer-dither';
      canvas!.dataset.sourcePoints = String(scene.points.length / 7);
      resize();
      host!.dataset.ready = 'true';
      observer.observe(host!);
      intersection.observe(host!);
      hero!.addEventListener('pointermove', move);
      hero!.addEventListener('hero-explore', explore);
      hero!.addEventListener('pointerdown', down);
      hero!.addEventListener('pointerleave', leave);
      hero!.addEventListener('pointerup', up);
      hero!.addEventListener('pointercancel', up);
      window.addEventListener('blur', blur);
      window.addEventListener('focus', focus);
      window.addEventListener('keydown', key);
      document.addEventListener('visibilitychange', clear);
      reduced.addEventListener('change', clear);
      canvas!.addEventListener('webglcontextlost', contextLost);
      canvas!.addEventListener('webglcontextrestored', contextRestored);
    }
    void mount().catch((error) => {
      dispose();
      if (!abort.signal.aborted) {
        fallback();
        console.error('Dither Hero:', error);
      }
    });
    return () => {
      abort.abort();
      dispose();
    };
  }, [overrides, intro]);
  return (
    <div
      className="vector-hero dither-hero"
      ref={hostRef}
      data-entrance={intro ? 'pending' : undefined}
    >
      <canvas className="vector-hero-canvas" ref={canvasRef} />
    </div>
  );
}
