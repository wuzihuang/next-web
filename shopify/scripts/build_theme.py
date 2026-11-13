#!/usr/bin/env python3
"""Copy NextBody public assets into the Shopify theme and bake story HTML."""

from __future__ import annotations

import hashlib
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
THEME = ROOT / "shopify" / "theme"
ASSETS = THEME / "assets"
SNIPPETS = THEME / "snippets"
DIST = ROOT / "shopify" / "dist"
PREVIEW = ROOT / "shopify" / "preview"

ASSET_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
MAX_SNIPPET_BYTES = 220_000

LINK_MAP = {
    "/": "{{ routes.root_url }}",
    "/pricing/": "{% if settings.shop_collection != blank %}{{ settings.shop_collection.url }}{% else %}{{ routes.all_products_collection_url }}{% endif %}",
    "/app/": "{% if pages.app.url != blank %}{{ pages.app.url }}{% else %}{{ routes.all_products_collection_url }}?view=app{% endif %}",
    "/blog/": "{% if blogs.news.handle != blank %}{{ blogs.news.url }}{% elsif pages.journal.url != blank %}{{ pages.journal.url }}{% else %}{{ routes.all_products_collection_url }}?view=journal{% endif %}",
    "/blog/nextbody-mcp/": "{% if pages['nextbody-mcp'].url != blank %}{{ pages['nextbody-mcp'].url }}{% else %}{{ routes.all_products_collection_url }}?view=nextbody-mcp{% endif %}",
    "/blog/whoop-alternative/": "{% if pages['whoop-alternative'].url != blank %}{{ pages['whoop-alternative'].url }}{% else %}{{ routes.all_products_collection_url }}?view=whoop-alternative{% endif %}",
    "/blog/oura-alternative/": "{% if pages['oura-alternative'].url != blank %}{{ pages['oura-alternative'].url }}{% else %}{{ routes.all_products_collection_url }}?view=oura-alternative{% endif %}",
    "/compare/screenless-fitness-band/": "{% if pages['screenless-fitness-band'].url != blank %}{{ pages['screenless-fitness-band'].url }}{% else %}{{ routes.all_products_collection_url }}?view=compare{% endif %}",
}


def asset_name(path: Path) -> str:
    name = path.name
    if name.lower() == "hero.css":
        return "hero.css.liquid"
    return name


def liquid_asset_url(name: str) -> str:
    return "{{ '" + name + "' | asset_url }}"


def rewrite_asset_refs(text: str) -> str:
    def url_repl(match: re.Match[str]) -> str:
        raw = match.group(1).strip("'\"")
        name = Path(raw).name
        return "url(" + liquid_asset_url(name) + ")"

    text = re.sub(r"url\((/?(?:a|fonts/[^)]+|landing|hero)/[^)]+)\)", url_repl, text)
    text = re.sub(r"url\((['\"])/fonts/[^'\"]+\1\)", url_repl, text)

    def src_repl(match: re.Match[str]) -> str:
        attr, raw = match.group(1), match.group(2)
        name = Path(raw).name
        return f'{attr}="{liquid_asset_url(name)}"'

    text = re.sub(
        r'(src|href)="(/(?:a|fonts/[^"]+|landing|hero)/[^"]+)"',
        src_repl,
        text,
    )
    return text


def ensure_img_size(html: str) -> str:
    def add_size(match: re.Match[str]) -> str:
        attrs = match.group(1)
        if "width=" not in attrs.lower():
            attrs += ' width="800"'
        if "height=" not in attrs.lower():
            attrs += ' height="600"'
        return f"<img{attrs}>"

    return re.sub(r"<img(\s[^>]*?)>", add_size, html, flags=re.I)


def rewrite_site_links(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        href = match.group(1)
        stripped = re.sub(r"^/zh(?=/|$)", "", href) or "/"
        if not stripped.endswith("/") and stripped.count("/") > 1:
            pass
        if stripped in LINK_MAP:
            return f'href="{LINK_MAP[stripped]}"'
        if stripped.rstrip("/") + "/" in LINK_MAP:
            return f'href="{LINK_MAP[stripped.rstrip("/") + "/"]}"'
        return match.group(0)

    return re.sub(r'href="(/[^"]*)"', repl, text)


def write_snippet(name: str, body: str, title: str) -> None:
    SNIPPETS.mkdir(parents=True, exist_ok=True)
    (SNIPPETS / name).write_text(body.strip() + "\n", encoding="utf-8")


def split_if_needed(name_prefix: str, html: str, title: str) -> list[str]:
    encoded = html.encode("utf-8")
    if len(encoded) <= MAX_SNIPPET_BYTES:
        filename = f"{name_prefix}.liquid"
        write_snippet(filename, html, title)
        return [filename.replace(".liquid", "")]
    parts: list[str] = []
    chunk = []
    size = 0
    tokens = re.split(r"(?=<section\b)", html)
    index = 1
    for token in tokens:
        if not token:
            continue
        piece = token.encode("utf-8")
        if size + len(piece) > MAX_SNIPPET_BYTES and chunk:
            filename = f"{name_prefix}-{index:02d}.liquid"
            write_snippet(filename, "".join(chunk), f"{title} part {index}")
            parts.append(filename.replace(".liquid", ""))
            index += 1
            chunk = [token]
            size = len(piece)
        else:
            chunk.append(token)
            size += len(piece)
    if chunk:
        filename = f"{name_prefix}-{index:02d}.liquid"
        write_snippet(filename, "".join(chunk), f"{title} part {index}")
        parts.append(filename.replace(".liquid", ""))
    return parts


def extract_main(html: str) -> str:
    match = re.search(r"<main\b[^>]*>(.*)</main>", html, re.S | re.I)
    if not match:
        raise SystemExit("could not find <main> in source HTML")
    return match.group(1)


def extract_style(html: str) -> str:
    chunks = re.findall(r"<style>(.*?)</style>", html, re.S | re.I)
    return "\n".join(chunks).strip()


def copy_assets() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    copied: dict[str, Path] = {}

    def copy_file(src: Path, dest_name: str | None = None) -> None:
        name = dest_name or asset_name(src)
        dest = ASSETS / name
        if dest.exists() and src.resolve() != dest.resolve():
            existing = copied.get(name)
            if existing and existing.resolve() != src.resolve():
                raise SystemExit(f"asset name collision: {name} from {src} and {existing}")
        shutil.copy2(src, dest)
        copied[name] = src

    for src in sorted((PUBLIC / "a").iterdir()):
        if src.is_file():
            copy_file(src)
    font = PUBLIC / "fonts" / "inter-tight" / "InterTight-ExtraBold.ttf"
    copy_file(font)
    copy_file(PUBLIC / "landing" / "hero-vector.svg")
    for name in (
        "header.css",
        "motion.css",
        "mobile.css",
        "blog.css",
        "compare.css",
        "nav.js",
        "mobile.js",
        "motion.js",
        "favicon.ico",
        "favicon-32.png",
        "favicon-192.png",
        "apple-touch-icon.png",
    ):
        copy_file(PUBLIC / name)

    hero_css = (PUBLIC / "hero" / "hero.css").read_text(encoding="utf-8")
    hero_css = hero_css.replace(
        "url(/fonts/inter-tight/InterTight-ExtraBold.ttf)",
        "url({{ 'InterTight-ExtraBold.ttf' | asset_url }})",
    )
    hero_css = hero_css.replace(
        "url(/landing/hero-vector.svg)",
        "url({{ 'hero-vector.svg' | asset_url }})",
    )
    (ASSETS / "hero.css.liquid").write_text(hero_css, encoding="utf-8")

    hero_js = (PUBLIC / "hero" / "hero.js").read_text(encoding="utf-8")
    hero_js = hero_js.replace(
        'fetch("/landing/hero-vector.svg"',
        'fetch((window.NB_ASSETS&&window.NB_ASSETS.heroVector)||"/landing/hero-vector.svg"',
    )
    (ASSETS / "hero.js").write_text(hero_js, encoding="utf-8")

    nav_js = (PUBLIC / "nav.js").read_text(encoding="utf-8")
    nav_js = nav_js.replace(
        r"/\/app\/$/.test(to) ? 'to-app'",
        r"/\/(app\/?$|collections\/.+view=app)/.test(to) ? 'to-app'",
    )
    nav_js = nav_js.replace(
        r"/\/pricing\/$/.test(to) ? 'to-buy'",
        r"/\/(pricing\/?$|collections\/|cart)/.test(to) ? 'to-buy'",
    )
    (ASSETS / "nav.js").write_text(nav_js, encoding="utf-8")


def bake_pages() -> None:
    for leftover in SNIPPETS.glob("home-*.liquid"):
        leftover.unlink()
    for leftover in SNIPPETS.glob("page-*.liquid"):
        leftover.unlink()

    homes = {
        "en": PUBLIC / "index.html",
        "zh": PUBLIC / "zh" / "index.html",
    }
    renders = {}
    for locale, path in homes.items():
        html = extract_main(path.read_text(encoding="utf-8"))
        html = rewrite_asset_refs(html)
        html = rewrite_site_links(html)
        html = ensure_img_size(html)
        names = split_if_needed(f"home-{locale}", html, f"NEXTBODY home story ({locale})")
        renders[locale] = names
        render_body = "\n".join("{% render '" + name + "' %}" for name in names)
        write_snippet(
            f"home-story-{locale}.liquid",
            render_body,
            f"NEXTBODY home story index ({locale})",
        )

    page_sources = {
        "app": (PUBLIC / "app" / "index.html", PUBLIC / "zh" / "app" / "index.html"),
        "journal": (PUBLIC / "blog" / "index.html", PUBLIC / "zh" / "blog" / "index.html"),
        "nextbody-mcp": (
            PUBLIC / "blog" / "nextbody-mcp" / "index.html",
            PUBLIC / "zh" / "blog" / "nextbody-mcp" / "index.html",
        ),
        "whoop-alternative": (
            PUBLIC / "blog" / "whoop-alternative" / "index.html",
            PUBLIC / "zh" / "blog" / "whoop-alternative" / "index.html",
        ),
        "oura-alternative": (
            PUBLIC / "blog" / "oura-alternative" / "index.html",
            PUBLIC / "zh" / "blog" / "oura-alternative" / "index.html",
        ),
        "compare": (
            PUBLIC / "compare" / "screenless-fitness-band" / "index.html",
            PUBLIC / "zh" / "compare" / "screenless-fitness-band" / "index.html",
        ),
    }
    compare_fixes = (
        (
            "Checkout is on Amazon, where tax and shipping are shown.",
            "Tax and shipping are shown at checkout on this store.",
        ),
        (
            "结算在亚马逊完成，税费与运费以亚马逊页面为准。",
            "税费与运费在本店结账时显示。",
        ),
        (
            "Buy HOOP · $59.99 on the pricing page",
            "Buy HOOP",
        ),
        (
            "购买 HOOP · 定价页 $59.99",
            "购买 HOOP",
        ),
    )
    for handle, (en_path, zh_path) in page_sources.items():
        for locale, src in (("en", en_path), ("zh", zh_path)):
            html = extract_main(src.read_text(encoding="utf-8"))
            html = rewrite_asset_refs(html)
            html = rewrite_site_links(html)
            html = ensure_img_size(html)
            if handle == "compare":
                for old, new in compare_fixes:
                    html = html.replace(old, new)
            write_snippet(
                f"page-{handle}-{locale}.liquid",
                html,
                f"NEXTBODY {handle} ({locale})",
            )

    app_css = extract_style((ROOT / "app.html").read_text(encoding="utf-8"))
    (ASSETS / "nb-app.css").write_text(app_css + "\n", encoding="utf-8")
    pricing_css = extract_style((ROOT / "pricing.html").read_text(encoding="utf-8"))
    pricing_css = re.sub(r"^  /\*.*?\*/\n", "", pricing_css, count=1, flags=re.S)
    (ASSETS / "nb-buy.css").write_text(pricing_css + "\n", encoding="utf-8")
    not_found_css = extract_style((PUBLIC / "404.html").read_text(encoding="utf-8"))
    (ASSETS / "nb-404.css").write_text(not_found_css + "\n", encoding="utf-8")


def write_zip() -> None:
    DIST.mkdir(parents=True, exist_ok=True)
    zip_path = DIST / "nextbody-yehetao-theme.zip"
    if zip_path.exists():
        zip_path.unlink()
    skip = {".DS_Store"}
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(THEME.rglob("*")):
            if not path.is_file() or path.name in skip:
                continue
            zf.write(path, path.relative_to(THEME).as_posix())
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    (DIST / "nextbody-yehetao-theme.sha256").write_text(
        f"{digest}  nextbody-yehetao-theme.zip\n",
        encoding="utf-8",
    )
    print(f"wrote {zip_path} ({zip_path.stat().st_size} bytes)")


def main() -> None:
    copy_assets()
    bake_pages()
    write_zip()


if __name__ == "__main__":
    main()
