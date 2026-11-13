#!/usr/bin/env python3
"""Build an unpublished Shopify Online Store theme from this repo's static site.

Copies public/ images and CSS into a flat assets/ folder, splits homepage
artboards into snippets (Shopify's 256KB file cap), rewrites local URLs, and
strips hardcoded commerce prices from copied marketing pages. The Cloudflare
public/ tree is never modified.
"""
from __future__ import annotations

import os
import re
import shutil
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THEME_SRC = os.path.join(ROOT, "shopify-theme")
PUBLIC = os.path.join(ROOT, "public")
BUILD = os.path.join(THEME_SRC, ".build", "theme")
DIST = os.path.join(ROOT, "dist")
ZIP_PATH = os.path.join(DIST, "nextbody-online-store-theme.zip")
SNIPPET_LIMIT = 256 * 1024

ARTBOARD_RE = re.compile(
    r'(<section[^>]*data-artboard="([^"]+)"[^>]*>.*?</section>)',
    re.S,
)
STYLE_RE = re.compile(r"<style>(.*?)</style>", re.S)
MAIN_RE = re.compile(r"<main\b[^>]*>(.*)</main>", re.S)
JSONLD_RE = re.compile(r'<script type="application/ld\+json">.*?</script>', re.S)

PAGE_SOURCES = [
    ("page-app", "app/index.html", "zh/app/index.html"),
    ("page-notes", "blog/index.html", "zh/blog/index.html"),
    ("page-note-mcp", "blog/nextbody-mcp/index.html", "zh/blog/nextbody-mcp/index.html"),
    ("page-note-whoop", "blog/whoop-alternative/index.html", "zh/blog/whoop-alternative/index.html"),
    ("page-note-oura", "blog/oura-alternative/index.html", "zh/blog/oura-alternative/index.html"),
    ("page-compare", "compare/screenless-fitness-band/index.html", "zh/compare/screenless-fitness-band/index.html"),
]

PRICE_REPLACEMENTS = [
    ("$59.99 USD hardware price on the pricing page", "The live Shopify catalog price"),
    ("published $59.99 hardware price", "live Shopify catalog price"),
    ("Buy HOOP · $59.99 on the pricing page", "Buy HOOP in the catalog"),
    ("lists Cloud White and Charcoal Black at $59.99", "lists Cloud White and Charcoal Black at the live Shopify catalog price"),
    ("publishes a $59.99 hardware price on /pricing/", "publishes the live catalog price on the shop catalog"),
    ("The published hardware price is $59.99 on the pricing page.", "Price is the live Shopify catalog amount; this page does not invent one."),
    ("定价页硬件价 $59.99 美元", "Shopify 目录中的实时价格"),
    ("定价页公布的硬件价是 $59.99", "价格以 Shopify 目录为准，本页不编造金额"),
    ("购买 HOOP · 定价页 $59.99", "在目录中购买 HOOP"),
    ("云白与炭黑均为 $59.99", "云白与炭黑价格以商店目录为准"),
    ("公布 $59.99 的硬件价", "在商店目录公布实时价格"),
    ("硬件价 $59.99", "Shopify 目录价"),
    ("$59.99", "the live catalog price"),
]


def write_text(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)


def copy_tree(src: str, dest: str) -> None:
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.copytree(
        src,
        dest,
        ignore=shutil.ignore_patterns(".build", ".gitignore", "README.md", "scripts", "node_modules"),
    )


def flatten_copy(src_dir: str, dest_dir: str) -> None:
    if not os.path.isdir(src_dir):
        return
    os.makedirs(dest_dir, exist_ok=True)
    for name in os.listdir(src_dir):
        path = os.path.join(src_dir, name)
        if os.path.isfile(path):
            shutil.copy2(path, os.path.join(dest_dir, name))


KNOWN_ASSETS: set[str] = set()


def liquid_asset(name: str) -> str:
    return "{{ '" + name + "' | asset_url }}"


def rewrite_local_paths(text: str) -> str:
    def asset_url(match: re.Match[str]) -> str:
        name = os.path.basename(match.group(1))
        if name not in KNOWN_ASSETS:
            return match.group(0)
        return "url(" + liquid_asset(name) + ")"

    text = re.sub(r"url\(/a/([^)]+)\)", asset_url, text)
    text = re.sub(r"url\(/landing/([^)]+)\)", asset_url, text)
    text = re.sub(r"url\(/fonts/[^)]+/([^)]+)\)", asset_url, text)

    def src_href(match: re.Match[str]) -> str:
        name = os.path.basename(match.group(2))
        if name not in KNOWN_ASSETS:
            return match.group(0)
        return match.group(1) + '="' + liquid_asset(name) + '"'

    text = re.sub(r'(src)="/(?:a/)([^"]+)"', src_href, text)
    return text


def add_img_dimensions(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        tag = match.group(0)
        if "width=" in tag and "height=" in tag:
            return tag
        insert = ' width="1206" height="2622"'
        if tag.endswith("/>"):
            return tag[:-2] + insert + " />"
        return tag[:-1] + insert + ">"

    return re.sub(r"<img\b[^>]*>", repl, html, flags=re.I)


def rewrite_site_links(html: str) -> str:
    replacements = [
        ('href="/zh/pricing/"', 'href="{{ routes.all_products_collection_url }}"'),
        ('href="/pricing/"', 'href="{{ routes.all_products_collection_url }}"'),
        ('href="/zh/app/"', 'href="/pages/app"'),
        ('href="/app/"', 'href="/pages/app"'),
        ('href="/zh/blog/nextbody-mcp/"', 'href="/pages/nextbody-mcp"'),
        ('href="/blog/nextbody-mcp/"', 'href="/pages/nextbody-mcp"'),
        ('href="/zh/blog/whoop-alternative/"', 'href="/pages/whoop-alternative"'),
        ('href="/blog/whoop-alternative/"', 'href="/pages/whoop-alternative"'),
        ('href="/zh/blog/oura-alternative/"', 'href="/pages/oura-alternative"'),
        ('href="/blog/oura-alternative/"', 'href="/pages/oura-alternative"'),
        ('href="/zh/blog/"', 'href="/pages/notes"'),
        ('href="/blog/"', 'href="/pages/notes"'),
        ('href="/zh/compare/screenless-fitness-band/"', 'href="/pages/screenless-fitness-band"'),
        ('href="/compare/screenless-fitness-band/"', 'href="/pages/screenless-fitness-band"'),
        ('href="/zh/#', 'href="{{ routes.root_url }}#'),
        ('href="/#', 'href="{{ routes.root_url }}#'),
        ('href="/zh/"', 'href="{{ routes.root_url }}"'),
        ('href="/"', 'href="{{ routes.root_url }}"'),
    ]
    for old, new in replacements:
        html = html.replace(old, new)
    return html


def strip_hardcoded_prices(html: str) -> str:
    html = JSONLD_RE.sub("", html)
    for old, new in PRICE_REPLACEMENTS:
        html = html.replace(old, new)
    html = re.sub(r'"price"\s*:\s*"59\.99"', "", html)
    return html


def snippet_name(locale: str, artboard: str) -> str:
    return "artboard-" + locale + "-" + artboard.lower()


def split_artboards(html: str, locale: str, dest_snippets: str) -> str:
    renders = []
    for block, artboard in ARTBOARD_RE.findall(html):
        body = rewrite_local_paths(block)
        name = snippet_name(locale, artboard)
        path = os.path.join(dest_snippets, name + ".liquid")
        write_text(path, body + "\n")
        size = os.path.getsize(path)
        if size > SNIPPET_LIMIT:
            raise SystemExit(f"{name} is {size} bytes; Shopify snippet cap is {SNIPPET_LIMIT}")
        renders.append("{% render '" + name + "' %}")
    return "\n".join(renders) + "\n"


def extract_page(src_rel: str, dest_name: str, dest_snippets: str) -> None:
    raw = open(os.path.join(PUBLIC, src_rel), encoding="utf-8").read()
    raw = strip_hardcoded_prices(raw)
    styles = "\n".join(STYLE_RE.findall(raw))
    main = MAIN_RE.search(raw)
    inner = main.group(1) if main else raw
    inner = add_img_dimensions(rewrite_site_links(rewrite_local_paths(inner)))
    styles = rewrite_local_paths(styles)
    styles = re.sub(r"\bhtml,\s*body\b", ".nb-page", styles)
    styles = re.sub(r"\bbody\b", ".nb-page", styles)
    wrapped = '<div class="nb-page">\n'
    if styles.strip():
        wrapped += "<style>\n" + styles.strip() + "\n</style>\n"
    wrapped += inner.strip() + "\n</div>\n"
    write_text(os.path.join(dest_snippets, dest_name + ".liquid"), wrapped)


def patch_hero_js(path: str) -> None:
    source = open(path, encoding="utf-8").read()
    source = source.replace(
        'fetch("/landing/hero-vector.svg"',
        'fetch((window.NB_ASSETS&&window.NB_ASSETS.heroVector)||"/landing/hero-vector.svg"',
    )
    open(path, "w", encoding="utf-8").write(source)


def rewrite_css_liquid(path: str) -> None:
    css = open(path, encoding="utf-8").read()
    css = rewrite_local_paths(css)
    liquid_path = path + ".liquid" if not path.endswith(".liquid") else path
    if not path.endswith(".liquid"):
        os.remove(path)
    write_text(liquid_path, css)


def zip_theme(src: str, zip_path: str) -> None:
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for dirpath, _, filenames in os.walk(src):
            for name in filenames:
                full = os.path.join(dirpath, name)
                rel = os.path.relpath(full, src)
                archive.write(full, rel)


def main() -> None:
    copy_tree(THEME_SRC, BUILD)
    assets = os.path.join(BUILD, "assets")
    snippets = os.path.join(BUILD, "snippets")
    os.makedirs(assets, exist_ok=True)
    os.makedirs(snippets, exist_ok=True)

    flatten_copy(os.path.join(PUBLIC, "a"), assets)
    flatten_copy(os.path.join(PUBLIC, "landing"), assets)
    flatten_copy(os.path.join(PUBLIC, "fonts", "inter-tight"), assets)
    for name in (
        "favicon.ico",
        "favicon-32.png",
        "favicon-192.png",
        "apple-touch-icon.png",
        "header.css",
        "motion.css",
        "mobile.css",
        "blog.css",
        "compare.css",
        "motion.js",
        "mobile.js",
    ):
        src = os.path.join(PUBLIC, name)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(assets, name))
    shutil.copy2(os.path.join(PUBLIC, "hero", "hero.css"), os.path.join(assets, "hero.css"))
    shutil.copy2(os.path.join(PUBLIC, "hero", "hero.js"), os.path.join(assets, "hero.js"))
    KNOWN_ASSETS.update(name for name in os.listdir(assets) if os.path.isfile(os.path.join(assets, name)))
    patch_hero_js(os.path.join(assets, "hero.js"))
    rewrite_css_liquid(os.path.join(assets, "hero.css"))
    for css_name in ("header.css", "motion.css", "mobile.css", "blog.css", "compare.css"):
        rewrite_css_liquid(os.path.join(assets, css_name))

    en_html = open(os.path.join(PUBLIC, "index.html"), encoding="utf-8").read()
    zh_html = open(os.path.join(PUBLIC, "zh", "index.html"), encoding="utf-8").read()
    write_text(os.path.join(snippets, "artboards-en.liquid"), split_artboards(en_html, "en", snippets))
    write_text(os.path.join(snippets, "artboards-zh.liquid"), split_artboards(zh_html, "zh", snippets))

    for dest, en_rel, zh_rel in PAGE_SOURCES:
        extract_page(en_rel, dest + "-en", snippets)
        extract_page(zh_rel, dest + "-zh", snippets)

    zip_theme(BUILD, ZIP_PATH)
    write_update_bundle()
    write_previews()
    print("Wrote", BUILD)
    print("Wrote", ZIP_PATH)


UPDATE_FILES = (
    "config/settings_data.json",
    "config/settings_schema.json",
    "locales/en.default.json",
    "locales/zh.json",
    "sections/header.liquid",
    "sections/footer.liquid",
    "sections/main-product.liquid",
    "sections/main-password.liquid",
    "sections/main-cart.liquid",
    "snippets/product-card.liquid",
    "snippets/product-image.liquid",
    "assets/product-form.js",
    "assets/theme.css",
)

UPDATE_ZIP = os.path.join(DIST, "yehetao-theme-update-files.zip")
CHANGED_LIST = os.path.join(DIST, "CHANGED_FILES.txt")


def write_update_bundle() -> None:
    update_dir = os.path.join(DIST, "theme-update")
    if os.path.exists(update_dir):
        shutil.rmtree(update_dir)
    lines = [
        "# Changed deployable theme files for a NEW unpublished theme (parent push).",
        "# Do not write to MAIN theme 147573276756. Connector refuses live MAIN writes.",
        "# Preserve Theme settings: catalog_products=['yehetao-hoop'], catalog_collection=frontpage, buy_product=yehetao-hoop",
        "# Do not upload product media; live yehetao-hoop already has official photos.",
        "",
    ]
    for rel in UPDATE_FILES:
        src = os.path.join(BUILD, rel)
        dest = os.path.join(update_dir, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src, dest)
        lines.append(rel)
    write_text(CHANGED_LIST, "\n".join(lines) + "\n")
    shutil.copy2(CHANGED_LIST, os.path.join(update_dir, "CHANGED_FILES.txt"))
    with zipfile.ZipFile(UPDATE_ZIP, "w", zipfile.ZIP_DEFLATED) as archive:
        for rel in UPDATE_FILES:
            archive.write(os.path.join(update_dir, rel), rel)
        archive.write(CHANGED_LIST, "CHANGED_FILES.txt")
    print("Wrote", UPDATE_ZIP)


def write_previews() -> None:
    preview_dir = os.path.join(DIST, "previews")
    os.makedirs(preview_dir, exist_ok=True)
    media_dir = os.path.join(preview_dir, "media")
    os.makedirs(media_dir, exist_ok=True)
    for name in (
        "4BAJ2SX1RGW5N67V6X2SFTGEE2-hd.webp",
        "0EQXR8JCK3RKEXD9RRT4DAPK65-hd.webp",
        "0NBKQTWEC0AE16VN67CS8NG2ST-hd.webp",
    ):
        shutil.copy2(os.path.join(PUBLIC, "a", name), os.path.join(media_dir, name))
    css_href = "../../shopify-theme/assets/theme.css"
    header_css = "../../public/header.css"
    hero_css = "../../public/hero/hero.css"
    chrome = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Doto:wght@600;800&family=Inter+Tight:wght@500;600;700;800&family=Jost:wght@400;500&family=Noto+Sans+SC:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="{hero}"><link rel="stylesheet" href="{header}"><link rel="stylesheet" href="{css}">
<style>
.nb-fixture-banner{{background:#eff65a;color:#070709;font:600 12px/1.4 Jost,sans-serif;letter-spacing:.08em;padding:8px 16px;text-align:center;text-transform:uppercase}}
.nb-top.lp{{background:#000;color:#fff}}
.lp-nav{{align-items:center;display:flex;justify-content:space-between;padding:16px clamp(20px,5vw,80px)}}
.lp-wordmark{{align-items:center;display:flex;gap:8px;text-decoration:none}}
.lp-wordmark-name{{color:#fff;font-family:"Inter Tight",system-ui,sans-serif;font-size:18px;font-weight:700;letter-spacing:.16em;line-height:22px}}
.lp-pip{{background:#eff65a;height:6px;width:6px}}
.lp-nav-end{{align-items:center;display:flex;gap:16px}}
.nb-link{{color:#fff;font-size:13px;letter-spacing:.12em;text-decoration:none}}
.lp-pill.nb-buy{{background:#eff65a;border-radius:999px;color:#070709;padding:10px 18px;text-decoration:none}}
</style>
</head><body class="{body}">
<p class="nb-fixture-banner">Labeled fixture — not a live Shopify deployment</p>
<div class="nb-top lp" data-locale="en"><header class="lp-nav">
<a class="lp-wordmark" href="#"><span class="lp-wordmark-name">YEHETAO</span><span class="lp-pip" aria-hidden="true"></span></a>
<div class="lp-nav-end nb-end"><a class="nb-link" href="#">GET APP</a><a class="lp-pill nb-buy" href="#">BUY</a></div>
</header></div>
{main}
</body></html>"""
    empty = """<section class="nb-catalog wrap"><header class="nb-catalog-head"><p class="eyebrow">NEXTBODY HOOP</p>
<h1>Choose your HOOP</h1>
<p class="lede">Colourways, sensors and copy match the product site. Price and availability are the values Shopify has for each variant.</p></header>
<div class="nb-empty" role="status"><h2>No products are listed yet</h2>
<p>This store has no products published to the Online Store. When the owner publishes products, they appear here with Shopify prices, variants and stock. This page does not invent SKUs or amounts.</p></div>
<div class="facts"><div class="fact"><b>IP68</b><span>Water resistant</span></div>
<div class="fact"><b>5 days</b><span>Battery life</span></div>
<div class="fact"><b>24h</b><span>All-day health monitoring</span></div></div>
<p class="note">Tax and shipping are calculated in Shopify checkout. Five-day battery life comes from specific test conditions; real battery life varies with use.</p>
</section>"""
    unavailable = """<section class="nb-product wrap"><div class="nb-product-grid">
<div class="nb-product-media"><img class="nb-product-image" src="media/0EQXR8JCK3RKEXD9RRT4DAPK65-hd.webp" alt="NextBody Hoop Charcoal Black" width="1200" height="900"></div>
<div class="nb-product-info"><p class="eyebrow">PREVIEW FIXTURE</p>
<h1>Unavailable variant</h1>
<p class="nb-product-price">— <small>USD</small></p>
<form class="nb-product-form" data-product-form="true">
<p class="nb-product-status" role="status">Sold out</p>
<button class="buy" type="submit" data-add disabled>Unavailable</button>
</form>
<p class="note">Preview of disabled add-to-cart when variant.available is false. Not a live YEHETAO product.</p>
</div></div></section>"""
    cart = """<section class="nb-cart wrap"><h1>Cart</h1>
<p class="lede">Your cart is empty.</p>
<a class="buy" href="#">Continue shopping</a>
<p class="note">Shopify checkout calculates tax, shipping and the payable total. This theme does not invent those amounts.</p>
</section>"""
    product = """<section class="nb-product wrap" data-product-section>
<div class="nb-product-grid">
<div class="nb-product-media">
<img class="nb-product-image" data-product-image src="media/4BAJ2SX1RGW5N67V6X2SFTGEE2-hd.webp" alt="YEHETAO NextBody Hoop — Cloud White · Mist Weave" width="1200" height="900">
<ul class="nb-product-thumbs">
<li><button type="button" class="nb-product-thumb"><img src="media/4BAJ2SX1RGW5N67V6X2SFTGEE2-hd.webp" alt="" width="240" height="180"></button></li>
<li><button type="button" class="nb-product-thumb"><img src="media/0EQXR8JCK3RKEXD9RRT4DAPK65-hd.webp" alt="" width="240" height="180"></button></li>
<li><button type="button" class="nb-product-thumb"><img src="media/0NBKQTWEC0AE16VN67CS8NG2ST-hd.webp" alt="" width="240" height="180"></button></li>
</ul>
</div>
<div class="nb-product-info">
<p class="eyebrow">YEHETAO</p>
<h1>YEHETAO NextBody Hoop</h1>
<p class="nb-product-price">$59.99 <small>USD</small></p>
<div class="nb-product-desc">
<p>Ultra-thin, ultra-light Pro fitness and health tracking. Activity and sleep tracking. Two colours. The same sensors and AI.</p>
</div>
<form class="nb-product-form">
<div class="nb-option"><label>Choose Colour</label>
<select><option selected>Cloud White · Mist Weave</option><option>Charcoal Black</option></select>
</div>
<div class="nb-qty"><label>Quantity</label><input type="number" value="1" min="1"></div>
<button class="buy" type="button">Add to cart</button>
<a class="nb-view-cart" href="#">View cart</a>
</form>
<p class="note">Labeled fixture using current yehetao-hoop sample data (vendor YEHETAO, handle yehetao-hoop, title YEHETAO NextBody Hoop). Not a live Shopify deployment. Live photos come from product metadata; this page only illustrates brand/model/image layout.</p>
</div></div></section>"""
    catalog = """<section class="nb-catalog wrap"><header class="nb-catalog-head"><p class="eyebrow">NEXTBODY HOOP</p>
<h1>Choose your HOOP</h1>
<p class="lede">Store brand YEHETAO. Wearable model NextBody Hoop. Prices come from Shopify when live.</p></header>
<div class="skus">
<article class="sku"><a class="shot" href="#"><img class="nb-product-image" src="media/4BAJ2SX1RGW5N67V6X2SFTGEE2-hd.webp" alt="NextBody Hoop Cloud White" width="1200" height="900"></a>
<div class="info"><div><h2 class="name">YEHETAO NextBody Hoop</h2><p class="price">From $59.99 <small>USD</small></p><p class="strap">Cloud White · Mist Weave</p></div><a class="buy" href="#">View</a></div></article>
<article class="sku dark"><a class="shot" href="#"><img class="nb-product-image" src="media/0EQXR8JCK3RKEXD9RRT4DAPK65-hd.webp" alt="NextBody Hoop Charcoal Black" width="1200" height="900"></a>
<div class="info"><div><h2 class="name">YEHETAO NextBody Hoop</h2><p class="price">From $59.99 <small>USD</small></p><p class="strap">Charcoal Black</p></div><a class="buy" href="#">View</a></div></article>
</div>
<p class="note">Labeled fixture. Authentic same-product photos from the product site. Not a live Shopify deployment.</p>
</section>"""
    for name, title, body, main in (
        ("empty-catalog.html", "Empty catalog", "template-collection", empty),
        ("unavailable-variant.html", "Unavailable variant", "template-product", unavailable),
        ("empty-cart.html", "Cart", "template-cart", cart),
        ("yehetao-product-fixture.html", "YEHETAO NextBody Hoop", "template-product", product),
        ("yehetao-catalog-fixture.html", "YEHETAO catalog", "template-collection", catalog),
    ):
        write_text(
            os.path.join(preview_dir, name),
            chrome.format(title=title, hero=hero_css, header=header_css, css=css_href, body=body, main=main),
        )


if __name__ == "__main__":
    main()
