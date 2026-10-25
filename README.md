# product-site

Static NEXTBODY Hoop product page for `https://nextbody.ai`, generated from the Paper file "NEXT产品站", page FINAL (p-4-0).

- `jsx/<artboard>.jsx` — Paper `get_jsx` output per artboard; `order.tsv` lists artboards in canvas (top-to-bottom) order.
- `build.py` converts them to `public/index.html` (template: `template.html`). Each 1440px artboard is scaled to the window width.
- `public/a/` — artboard images, re-encoded as WebP (SVGs as-is).

Deploy: `npx wrangler pages deploy public --project-name nextbody-site --branch main`

## Hero, header and /app (2026-10-25)

- `hero/` — Vite bundle of the dither hero from the NextBody-Website handoff (c9c91344, `shopify-web/app/components/landing/`), with the router removed: the EXPLORE button scrolls to `#band`. `cd hero && pnpm install && pnpm build` writes `public/hero/hero.{js,css}`. Runtime assets: `public/landing/hero-vector.svg`, `public/fonts/inter-tight/`.
- `header.html` — sticky header shared by both pages: logo and GET APP → `/app`. On `/` the product page (`main#product`) stays hidden until Explore reveals it; direct links like `/#band` show it at once.
- `app.html` — the `/app` download page (badges are "即将上线" until store links exist). `build.py` writes it to `public/app/index.html`.

## Layout and image quality (2026-10-25)

- Product column: `template.html` sets `--s` (scale, never above 1) and `--gutter` (side space, 20–80px, more on wide screens); each artboard is a rounded card rendered with CSS `zoom`.
- `public/a/<id>-hd.webp`: full-size originals at WebP quality 92. Six were upscaled: the sleep, runner and dumbbell-athlete photos were re-rendered at 2K with Nano Banana Pro edit in Paper (runner/athlete on flat #0047FF, then chroma-keyed back to transparency; Paper artboard "TMP · 人物图高清重出"); the hand-with-phone, heart-sensor and IP68 band images went through Real-ESRGAN x4plus, scaled to 2x. Woven-fabric images keep their originals (ESRGAN made the weave look plastic).

## Languages and motion (2026-10-25)

- English (default) at `/` and `/app/`, Chinese at `/zh/` and `/zh/app/`; the header switch links the matching page. Old `/en/...` links 301 to `/...` (`public/_redirects`).
- `i18n/en.json`: product-page text, Chinese text node → English. A key `"<artboard>|<text>"` overrides the shared line for one artboard where the box is narrower. Leading spaces inside flex rows need ` `.
- `i18n/pages_en.json`: substring pairs (longest first) for `template.html` and `app.html` (meta, /app copy, alt text).
- `public/motion.css` / `public/motion.js`: cross-page View Transitions (old page sinks and blurs, new page wipes up; header stays), one or two large scroll reveals per section (main visual / headline; user asked for fewer small animations, so no icon pops, staggers or count-ups), and the lime reading-progress line. All off under reduced motion.

## Phone layout and section motion (2026-10-25)

- `public/mobile.js` + `public/mobile.css`: below 760px each artboard is rebuilt as a single column from its own nodes (paths into the artboard, same scheme as `motion.js`; sizes in the spec are 1440px-design pixels). Text keeps its colours and line structure (`rich`), complex visuals are scaled clones (`art`) or windows onto the artboard (`crop`), the weight chart becomes horizontal bars and the FAQ a tap-to-open list. Both languages and later Paper edits flow through; if an artboard's structure changes, update its entry in `SPEC`.
- `public/motion.js`: per-section choreography (`PLAN`), count-ups, background-word parallax, and a sideways page-turn view transition when switching language.
