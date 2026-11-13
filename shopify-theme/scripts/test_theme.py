#!/usr/bin/env python3
"""Structural checks for the YEHETAO Shopify theme export."""
from __future__ import annotations

import os
import py_compile
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THEME_SRC = os.path.join(ROOT, "shopify-theme")
BUILD = os.path.join(THEME_SRC, ".build", "theme")
SCRIPTS = os.path.join(THEME_SRC, "scripts")
SNIPPET_LIMIT = 256 * 1024

COMMERCE_GLOBS = (
    "sections/buy-catalog.liquid",
    "sections/main-product.liquid",
    "sections/main-cart.liquid",
    "snippets/product-card.liquid",
    "snippets/product-image.liquid",
    "assets/product-form.js",
    "assets/cart.js",
)


def read(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def fail(message: str) -> None:
    raise SystemExit("FAIL: " + message)


def lint_python() -> None:
    for name in os.listdir(SCRIPTS):
        if name.endswith(".py"):
            py_compile.compile(os.path.join(SCRIPTS, name), doraise=True)
    print("python lint ok")


def check_source() -> None:
    product = read(os.path.join(THEME_SRC, "sections", "main-product.liquid"))
    cart = read(os.path.join(THEME_SRC, "sections", "main-cart.liquid"))
    catalog = read(os.path.join(THEME_SRC, "sections", "buy-catalog.liquid"))
    schema = read(os.path.join(THEME_SRC, "config", "settings_schema.json"))
    if "{% form 'product'" not in product and '{% form "product"' not in product:
        fail("product section must use native product form")
    if "{% form 'cart'" not in cart and '{% form "cart"' not in cart:
        fail("cart section must use native cart form")
    if "settings.catalog_products" not in catalog:
        fail("catalog must read the configurable product list")
    if '"id": "catalog_products"' not in schema:
        fail("theme settings must expose catalog_products")
    if "variant.price | money" not in product and "current_variant.price | money" not in product:
        fail("product price must come from Shopify money")
    header = read(os.path.join(THEME_SRC, "sections", "header.liquid"))
    footer = read(os.path.join(THEME_SRC, "sections", "footer.liquid"))
    password = read(os.path.join(THEME_SRC, "sections", "main-password.liquid"))
    card = read(os.path.join(THEME_SRC, "snippets", "product-card.liquid"))
    image = read(os.path.join(THEME_SRC, "snippets", "product-image.liquid"))
    settings = read(os.path.join(THEME_SRC, "config", "settings_data.json"))
    en_locale = read(os.path.join(THEME_SRC, "locales", "en.default.json"))
    public_index = read(os.path.join(ROOT, "public", "index.html"))
    if "{{ 'general.brand' | t }}" not in header:
        fail("header wordmark must use general.brand")
    if "lp-wordmark-name\">NEXTBODY" in header:
        fail("header must not hardcode NEXTBODY as the store wordmark")
    if "{{ 'general.brand' | t }}" not in footer:
        fail("footer brand must use general.brand")
    if "{{ 'general.brand' | t }}" not in password:
        fail("password eyebrow must use general.brand")
    if '"brand": "YEHETAO"' not in en_locale:
        fail("English locale must set brand YEHETAO")
    if "NextBody Hoop" not in en_locale:
        fail("English locale must keep model NextBody Hoop")
    if "NEXTBODY App" not in en_locale:
        fail("English locale must keep NEXTBODY App as the software name")
    if "NEXTBODY HOOP" not in en_locale:
        fail("catalog eyebrow must keep the NextBody Hoop model line")
    if '"yehetao-hoop"' not in settings:
        fail("settings_data must preserve yehetao-hoop")
    if '"catalog_collection": "frontpage"' not in settings:
        fail("settings_data must preserve catalog_collection frontpage")
    if '"buy_product": "yehetao-hoop"' not in settings:
        fail("settings_data must preserve buy_product yehetao-hoop")
    if "render 'product-image'" not in product:
        fail("product section must render product-image")
    if "product.media" not in product:
        fail("product section must render Shopify media gallery")
    if "render 'product-image'" not in card:
        fail("product card must render product-image")
    if "image_url" not in image:
        fail("product-image must use Shopify image_url when media exists")
    if "asset_url" in image:
        fail("product-image must not substitute bundled assets for live product media")
    if "lp-wordmark-name" in public_index and "NEXTBODY" not in public_index:
        fail("static Cloudflare site must keep its NEXTBODY wordmark")
    if "class=\"lp-wordmark-name\">NEXTBODY" not in public_index and ">NEXTBODY</span>" not in public_index:
        # Static landing still brands as NEXTBODY; either spelling in the artboard HTML is fine.
        if "NEXTBODY" not in public_index:
            fail("static Cloudflare site must remain unmodified")
    for rel in COMMERCE_GLOBS:
        text = read(os.path.join(THEME_SRC, rel))
        if "$59.99" in text or "59.99" in text:
            fail(rel + " must not hardcode 59.99")
        if "amazon.com" in text.lower():
            fail(rel + " must not send checkout to Amazon")
    print("source checks ok")


def check_build() -> None:
    if not os.path.isdir(BUILD):
        fail("build theme missing; run pnpm run build")
    snippets = os.path.join(BUILD, "snippets")
    en = read(os.path.join(snippets, "artboards-en.liquid"))
    zh = read(os.path.join(snippets, "artboards-zh.liquid"))
    if "artboard-en-457-0" not in en:
        fail("English artboards must include Body Scan 457-0")
    if "artboard-zh-457-0" not in zh:
        fail("Chinese artboards must include Body Scan 457-0")
    for name in os.listdir(snippets):
        path = os.path.join(snippets, name)
        size = os.path.getsize(path)
        if size > SNIPPET_LIMIT:
            fail(f"{name} is {size} bytes (Shopify cap {SNIPPET_LIMIT})")
    built_catalog = read(os.path.join(BUILD, "sections", "buy-catalog.liquid"))
    if "nb-empty" not in built_catalog:
        fail("catalog empty state missing")
    hero_js = read(os.path.join(BUILD, "assets", "hero.js"))
    if "window.NB_ASSETS&&window.NB_ASSETS.heroVector" not in hero_js:
        fail("hero.js must read the Shopify asset URL")
    compare = read(os.path.join(snippets, "page-compare-en.liquid"))
    if "$59.99" in compare or "59.99" in compare:
        fail("compare page still contains hardcoded 59.99")
    if "the live catalog price" not in compare and "live Shopify catalog" not in compare:
        fail("compare page should point at live catalog price, not a number")
    whoop = read(os.path.join(snippets, "page-note-whoop-en.liquid"))
    if "$59.99" in whoop:
        fail("whoop note still contains hardcoded $59.99")
    assets = os.path.join(BUILD, "assets")
    if not os.path.isfile(os.path.join(assets, "hero-vector.svg")):
        fail("hero-vector.svg missing from assets")
    if not os.path.isfile(os.path.join(assets, "4BAJ2SX1RGW5N67V6X2SFTGEE2-hd.webp")):
        fail("catalog photography missing from assets")
    zip_path = os.path.join(ROOT, "dist", "nextbody-online-store-theme.zip")
    if not os.path.isfile(zip_path):
        fail("theme zip missing")
    update_zip = os.path.join(ROOT, "dist", "yehetao-theme-update-files.zip")
    if not os.path.isfile(update_zip):
        fail("incremental theme update zip missing")
    changed = read(os.path.join(ROOT, "dist", "CHANGED_FILES.txt"))
    if "snippets/product-image.liquid" not in changed:
        fail("CHANGED_FILES.txt must list product-image.liquid")
    built_header = read(os.path.join(BUILD, "sections", "header.liquid"))
    if "{{ 'general.brand' | t }}" not in built_header:
        fail("built header wordmark must use general.brand")
    print("build checks ok")


def main() -> None:
    if "--lint" in sys.argv:
        lint_python()
        return
    lint_python()
    check_source()
    check_build()


if __name__ == "__main__":
    main()
