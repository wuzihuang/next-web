# NEXTBODY Online Store theme (unpublished export)

Isolated Shopify Online Store 2.0 Liquid theme generated from this repo’s
static NEXTBODY site (`public/`). It does **not** replace the Cloudflare
Pages deployment. Do not publish it, change DNS, or place orders from this
package — those steps stay with the store owner.

## What this theme does

- Keeps the existing landing artboards, hero, app/notes/compare pages, and
  bilingual copy from `public/` and `i18n/`.
- Lists **real Shopify products** only. Featured products are a theme-editor
  product list; if that list is empty it falls back to a chosen collection,
  then to the Online Store catalog. Prices, availability and variant IDs come
  from Shopify Liquid (`product` / `variant` / `cart`). Nothing is hardcoded.
- Uses native `{% form 'product' %}` and `{% form 'cart' %}` so add-to-cart
  and checkout go through Shopify. Unavailable variants disable submit.
- Ships `locales/en.default.json` (default) and `locales/zh.json`. The
  language control uses `{% form 'localization' %}` and only lists locales
  the shop has published.

## What it does not do

- It does not invent products, SKUs, prices, or stock. YEHETAO currently has
  an empty catalog; the buy page shows an empty state until products are
  published to the Online Store channel.
- It does not copy Amazon checkout, `$59.99`, or the separate Hydrogen
  README `$99` amount into commerce UI.
- It does not upload itself. Preview with an unpublished theme push.

## Build

From the repository root (after `pnpm install`):

```bash
pnpm run build
```

This writes a complete theme to `shopify-theme/.build/theme` and a ZIP to
`dist/nextbody-online-store-theme.zip`. Artboard HTML and images are copied
from `public/` at build time so the static Cloudflare site stays untouched.

## Unpublished preview (store owner)

With Shopify CLI logged into the YEHETAO shop (`ga5u0n-qv`):

```bash
shopify theme push --unpublished --path shopify-theme/.build/theme
```

Use the preview link Shopify prints. Do **not** run `theme publish`, do not
replace the live Horizon theme, and do not change `yehetao.com`.

Before the buy flow can complete, the owner still needs to:

1. Upgrade the trial plan if selling is required.
2. Create HOOP (or other) products with real variants, prices and inventory.
3. Publish those products to Online Store publication
   `gid://shopify/Publication/185056526420`.
4. Optionally assign them in **Theme settings → Catalog** (product list).
5. Add a published Chinese locale if the `/zh` artboards should appear for
   customers. The theme already contains `zh.json`.
6. Create Online Store pages with these handles and templates if those
   routes should resolve: `app` (`page.app`), `notes` (`page.notes`),
   `nextbody-mcp` (`page.note`), `whoop-alternative` (`page.note`),
   `oura-alternative` (`page.note`), `screenless-fitness-band`
   (`page.compare`).

## Checks

```bash
pnpm run lint
pnpm run test
pnpm run theme-check
```

Theme check runs against the built tree. Cart and unavailable-variant
behavior is covered by `shopify-theme/scripts/product-form.test.mjs` plus
structural tests that require native product/cart forms and forbid hardcoded
commerce prices.
