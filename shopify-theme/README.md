# YEHETAO Online Store theme (unpublished export)

Isolated Shopify Online Store 2.0 Liquid theme generated from this repo’s
static NextBody product site (`public/`). Store trademark is **YEHETAO**.
The wearable model remains **NextBody Hoop**. It does **not** replace the
Cloudflare Pages deployment. Do not publish it, change DNS, or place orders
from this package — those steps stay with the store owner.

## Brand vs model

- Site-level wordmark, footer, password eyebrow, meta title prefix, and
  copyright use **YEHETAO**.
- Product/model copy stays **NextBody Hoop** / `NEXTBODY HOOP`. The
  **NEXTBODY App** software name is unchanged.
- This is not a blind replace of NextBody. Artboards copied from `public/`
  still describe the hoop and app as they do on the product site.
- Live Shopify product metadata (already corrected, not written by this
  theme): title `YEHETAO NextBody Hoop`, vendor `YEHETAO`, handle
  `yehetao-hoop`, official product photos on the product and its colour
  variants.

## What this theme does

- Keeps the existing landing artboards, hero, app/notes/compare pages, and
  bilingual copy from `public/` and `i18n/`.
- Lists **real Shopify products** only. Featured products are a theme-editor
  product list defaulting to `yehetao-hoop`; collection fallback is
  `frontpage`; header BUY targets `yehetao-hoop`. Prices, availability and
  variant IDs come from Shopify Liquid. Nothing is hardcoded in commerce UI.
- Renders Shopify product/variant media and a thumbnail gallery when
  `product.media` exists. It does not upload or duplicate product photos.
- Product page is a premium split gallery (vertical thumbs + large stage)
  with a sticky purchase card. Colour options are swatch cards bound to
  live variants; they update variant id, price, and featured image. Add to
  cart uses `{% form 'product' %}`. Spec copy is non-medical (8mm / 10g /
  IP68 / 5-day test-condition battery). Merchant “Date first listed” appears
  only when that phrase is in `product.description`.
- Cart uses `{% form 'cart' %}`. Unavailable variants disable submit.
- Ships `locales/en.default.json` (default) and `locales/zh.json`. The
  language control uses `{% form 'localization' %}` and only lists locales
  the shop has published.

## What it does not do

- It does not invent products, SKUs, prices, or stock, and it does not
  upload images into Shopify product media.
- It does not copy Amazon checkout, `$59.99`, or the separate Hydrogen
  README `$99` amount into commerce Liquid.
- It does not mutate the live MAIN theme (`147573276756`). The Shopify
  connector refuses writes to MAIN. Parent must push this package as a
  **new unpublished theme**, preserving Catalog settings.

## Build

From the repository root (after `pnpm install`):

```bash
pnpm run build
```

This writes a complete theme to `shopify-theme/.build/theme`, a full ZIP to
`dist/nextbody-online-store-theme.zip`, and an incremental overlay to
`dist/yehetao-theme-update-files.zip` plus `dist/CHANGED_FILES.txt`.
Artboard HTML and images are copied from `public/` at build time so the
static Cloudflare site stays untouched.

## Unpublished preview (store owner / parent)

Theme `147573276756` is already MAIN, storefront password is off, and the
shop is on the Basic plan. Do **not** `theme push` onto that id. Push this
build as a new unpublished theme:

```bash
shopify theme push --unpublished --path shopify-theme/.build/theme
```

Keep Catalog settings on the new theme:

- `catalog_products`: `yehetao-hoop`
- `catalog_collection`: `frontpage`
- `buy_product`: `yehetao-hoop`

Those values are in `config/settings_data.json`. Use the preview link
Shopify prints. Do **not** run `theme publish`, do not replace MAIN, and
do not change `yehetao.com`.

## Checks

```bash
pnpm run lint
pnpm run test
pnpm run theme-check
```

Theme check runs against the built tree. Cart and unavailable-variant
behavior is covered by `shopify-theme/scripts/product-form.test.mjs` plus
structural tests that require native product/cart forms, YEHETAO branding,
NextBody Hoop model copy, Shopify media rendering, and no hardcoded
commerce prices.
