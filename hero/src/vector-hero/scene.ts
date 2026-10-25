export type VectorScene = {
  points: Float32Array;
  width: number;
  height: number;
  step: number;
  micro: number;
};

export function parseVectors(text: string): VectorScene {
  // Parse once, outside the live DOM. The editable SVG is the source of truth.
  const xml = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (xml.querySelector('parsererror')) throw new Error('Invalid Hero SVG');
  const svg = xml.documentElement;
  const [left, top, width, height] = (svg.getAttribute('viewBox') || '')
    .split(/\s+/)
    .map(Number);
  const step = Number(svg.getAttribute('data-step'));
  const micro = Number(svg.getAttribute('data-micro'));
  if (
    left !== 0 ||
    top !== 0 ||
    ![width, height, step, micro].every((n) => Number.isFinite(n) && n > 0) ||
    micro * 5 * 1.08 >= step
  )
    throw new Error(
      'Hero SVG needs a positive zero-origin viewBox and separated glyphs',
    );
  const nodes = xml.querySelectorAll('#hero-dots use');
  if (!nodes.length) throw new Error('Hero SVG contains no editable dots');
  const points = new Float32Array(nodes.length * 7);
  nodes.forEach((node, index) => {
    const color =
      node.getAttribute('fill') ||
      node.closest('g[fill]')?.getAttribute('fill') ||
      '#eff65a';
    const hex = color.slice(1);
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color))
      throw new Error(`Hero dot ${node.id} needs a hex fill`);
    const rgb = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    const x = Number(node.getAttribute('x'));
    const y = Number(node.getAttribute('y'));
    const glyph = /^#hero-glyph-([0-5])$/.exec(node.getAttribute('href') || '');
    const opacity = Number(node.getAttribute('opacity') ?? 1);
    if (
      !glyph ||
      ![x, y, opacity].every(Number.isFinite) ||
      opacity < 0 ||
      opacity > 1
    )
      throw new Error(`Invalid Hero dot ${node.id}`);
    points.set(
      [
        x,
        y,
        Number(glyph[1]),
        opacity,
        parseInt(rgb.slice(0, 2), 16) / 255,
        parseInt(rgb.slice(2, 4), 16) / 255,
        parseInt(rgb.slice(4, 6), 16) / 255,
      ],
      index * 7,
    );
  });
  return {
    points,
    width,
    height,
    step,
    micro,
  };
}
