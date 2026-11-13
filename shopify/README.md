# NEXTBODY Shopify theme (YEHETAO / yehetao.com)

Unpublished Online Store 2.0 Liquid theme that ports the official NextBody site from this repo onto the existing YEHETAO Shopify store (`ga5u0n-qv`, USD, trial). It does **not** replace `public/` or the Cloudflare Pages deploy.

This folder is the only Shopify surface in this repository. Do not upload, publish, or connect it to the live store from this change set.

## What is in here

| Path | Role |
| --- | --- |
| `theme/` | Installable Shopify theme (layout, sections, snippets, locales, assets) |
| `scripts/build_theme.py` | Copies `public/` art, fonts, hero/CSS/JS; bakes en/zh story HTML into snippets; writes the zip |
| `dist/nextbody-yehetao-theme.zip` | Theme zip for Admin → Themes → Upload |
| `preview/` | Static HTML for empty-cart / unavailable-variant checks without touching the store |
| `preview/screenshots/` | Desktop and mobile captures of those previews |

The static marketing site (`public/`, `wrangler.toml`, `build.py`) is unchanged.

## Design and checkout rules

- Home, App, Notes, compare, 404 and HOOP colour cards keep the NextBody layout, type, lime (`#eff65a`), and artboard assets from `public/`.
- BUY / Add to cart uses Liquid `{% form 'product' %}` and `{% form 'cart' %}`. Checkout is native Shopify (`name="checkout"` / `/cart`).
- Prices, availability and variant IDs come only from Shopify product data. The theme never hardcodes `$59.99` or `$99`.
- If the catalog is empty (current YEHETAO state: 0 products), colour cards still render from official photos, the price line is a pending message, and buttons stay **Coming soon**.
- Unavailable / sold-out variants render a disabled control. Empty cart has its own state and a continue-shopping link.

## Source copy vs other storefronts

| Source | Price shown |
| --- | --- |
| This repo (`pricing.html`, `i18n/pricing.json`, `seo.py`) | **$59.99 USD** on Amazon placeholder links |
| `wuzihuang/Next` Hydrogen README (`shopify-web`) | Requires **$99 USD** on handle `hoop` (read-only; not edited) |
| YEHETAO Admin (this connector) | **No products** |

The Shopify theme follows live Admin data, not either hardcoded figure. When products are created, set the theme Catalog pickers (or handle `hoop` / `nextbody-hoop`) and SKUs `hoop-white` / `hoop-black`, or variant titles White/白色/Cloud White and Black/黑色/Charcoal Black.

Amazon homepage links from the static site are not used here.

## Local build

```bash
cd shopify
pnpm install
pnpm run build
pnpm run lint
```

`pnpm run lint` from the repo root rebuilds generated snippets then runs `shopify theme check --path theme`. Latest run: **82 files inspected, no offenses**.

## Merchant steps (parent / Admin — not done by this PR)

1. Keep this theme **unpublished**. Upload the zip or `shopify theme push --unpublished --path shopify/theme`.
2. Trial store: [choose a paid plan](https://admin.shopify.com/store/ga5u0n-qv/settings/plan) before selling. Checkout, payments, and some Online Store features stay limited on trial.
3. Create real HOOP products/variants (parent will send details). Publish them to the **Online Store** channel. Do not invent inventory or shipping promises in the theme.
4. Theme editor → Theme settings → Catalog: assign the HOOP product(s) and optional shop collection.
5. Optional pages with handles `app`, `journal`, `nextbody-mcp`, `whoop-alternative`, `oura-alternative`, `screenless-fitness-band`, assigned to the matching templates. Until those pages exist, header App/Notes fall back to `/collections/all?view=app` (and `journal`, `compare`, …).
6. Settings → Languages: publish **Chinese (zh-CN)** for the 中文 control. Today the shop locale list is English only; the toggle stays visible but disabled until zh is published.
7. Payments, shipping, taxes, domains, and legal pages stay with the parent. `yehetao.com` is already the store domain; do not change DNS from this repo.

## Preview without publishing

Shopify Admin → Themes → the uploaded unpublished theme → Preview. Recommended checks:

- Home (hero → Explore → `#band`), Buy grid, cart empty, product with unavailable variant, mobile <760px.
- After products exist: add Cloud White and Charcoal Black, cart quantities, native checkout (test mode only).

`shopify/preview/` is a store-free stand-in for empty cart and unavailable buttons.

## Deployment blockers (do not bypass in this PR)

- Plan is **trial** — selling and some storefront features need an upgrade.
- Catalog is empty — purchase CTAs cannot complete until products exist and are published.
- Chinese is not a published shop locale.
- Payments, shipping rates, and markets are unset from this work.
- Do not publish the theme, place orders, mutate products, or edit DNS here.
