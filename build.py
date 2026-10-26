#!/usr/bin/env python3
"""Build public/index.html from Paper get_jsx dumps (jsx/<artboard>.jsx) listed in order.tsv."""
import html
import json
import os
import re
import sys

import seo

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else ROOT
ASSET_RE = re.compile(r"https://app\.paper\.design/file-assets/[A-Z0-9]+/([A-Z0-9]+)\.(png|jpg|svg)")
# Header links land on these artboards.
ANCHORS = {"3SP-0": "band", "3T2-0": "science"}
UNITLESS = {"fontWeight", "lineHeight", "opacity", "zIndex", "flexGrow", "flexShrink", "flex", "order"}
VOID_SVG = {"br", "path", "circle", "rect", "line", "stop", "ellipse", "polygon", "polyline", "use"}

FONT_FALLBACKS = [
    ('"PingFang SC", system-ui', '"PingFang SC", "Noto Sans SC", system-ui'),
    ('"SF Pro Display", system-ui', '"SF Pro Display", "Inter", "Noto Sans SC", system-ui'),
    ('"Jost", system-ui', '"Jost", "Noto Sans SC", system-ui'),
]


def kebab(name):
    # WebkitFontSmoothing -> -webkit-font-smoothing, fontSize -> font-size
    return re.sub(r"[A-Z]", lambda m: "-" + m.group(0).lower(), name)


def parse_style(obj):
    """obj is the text between the outer {{ }} of style={{ ... }}."""
    out, i, n = [], 0, len(obj)
    while i < n:
        m = re.compile(r"\s*([A-Za-z]+)\s*:\s*").match(obj, i)
        if not m:
            break
        key, i = m.group(1), m.end()
        if obj[i] == "'":
            j, buf = i + 1, []
            while obj[j] != "'":
                if obj[j] == "\\":
                    j += 1
                buf.append(obj[j])
                j += 1
            val, i = "".join(buf), j + 1
        else:
            m2 = re.compile(r"[^,]+").match(obj, i)
            val, i = m2.group(0).strip(), m2.end()
            if key not in UNITLESS and re.fullmatch(r"-?[0-9.]+", val) and float(val) != 0:
                val += "px"  # React appends px to numeric lengths
        m3 = re.compile(r"\s*,?").match(obj, i)
        i = m3.end()
        prop = kebab(key)
        for a, b in FONT_FALLBACKS:
            val = val.replace(a, b)
        out.append(f"{prop}: {val}")
        if prop in ("mask-image", "mask-size", "mask-position", "mask-repeat", "background-clip"):
            out.append(f"-webkit-{prop}: {val}")
    return "; ".join(out)


def jsx_text(text):
    if "\n" not in text:
        return text
    lines = text.split("\n")
    kept = []
    for i, line in enumerate(lines):
        if i > 0:
            line = line.lstrip(" \t")
        if i < len(lines) - 1:
            line = line.rstrip(" \t")
        if line:
            kept.append(line)
    return " ".join(kept)


def convert(jsx):
    jsx = jsx.strip()
    if jsx.startswith("(") and jsx.endswith(")"):
        jsx = jsx[1:-1]

    def style_sub(m):
        return 'style="' + html.escape(parse_style(m.group(1)), quote=True) + '"'

    jsx = re.sub(r"style=\{\{(.*?)\}\}(?=[\s/>])", style_sub, jsx, flags=re.S)
    jsx = re.sub(r" (stroke[A-Z]\w*)=", lambda m: " " + kebab(m.group(1)) + "=", jsx)
    # Paper text nodes use white-space: pre, so the JSX source indentation must go (JSX whitespace rules).
    jsx = re.sub(r">([^<]*)<", lambda m: ">" + jsx_text(m.group(1)) + "<", jsx)

    def selfclose(m):
        tag, attrs = m.group(1), m.group(2)
        return m.group(0) if tag in VOID_SVG else f"<{tag}{attrs}></{tag}>"

    jsx = re.sub(r"<([a-zA-Z]+)((?:\s[^<>]*?)?)\s*/>", selfclose, jsx)
    jsx = re.sub(r"<br\s*/>", "<br>", jsx)

    def asset(m):
        if m.group(2) == "svg":
            return f"/a/{m.group(1)}.svg"
        # -hd: full-size quality-92 re-encode; new name so year-long caches refresh.
        return f"/a/{m.group(1)}-hd.webp"

    return ASSET_RE.sub(asset, jsx)


# Each page exists in English at /... (the default) and in Chinese at /zh/...
LANGS = {
    "en": {"prefix": "/", "lang": "en"},
    "zh": {"prefix": "/zh/", "lang": "zh-CN"},
}


def load_i18n():
    texts = json.load(open(os.path.join(ROOT, "i18n", "en.json")))
    pairs = json.load(open(os.path.join(ROOT, "i18n", "pages_en.json")))
    return texts, pairs


def translate_text(markup, table, artboard):
    """Swap whole text nodes, keeping the whitespace around them. An
    "<artboard>|<text>" entry overrides the shared one where space is tight."""
    def sub(m):
        raw = m.group(1)
        key = raw.strip()
        en = table.get(f"{artboard}|{key}", table.get(key))
        if en is None:
            return m.group(0)
        lead = raw[: len(raw) - len(raw.lstrip())]
        trail = raw[len(raw.rstrip()):]
        return ">" + lead + html.escape(en, quote=False) + trail + "<"
    return re.sub(r">([^<>]+)<", sub, markup)


def translate_pairs(markup, pairs):
    for zh, en in pairs:  # longest first, so short words never split a sentence
        markup = markup.replace(zh, en)
    return markup


def header_for(lang, page):
    """page is "" for the product page, "app/" or "pricing/"."""
    other = "en" if lang == "zh" else "zh"
    current = ' aria-current="page"'
    return open(os.path.join(ROOT, "header.html")).read().format(
        lang=lang,
        home=LANGS[lang]["prefix"],
        app=LANGS[lang]["prefix"] + "app/",
        pricing=LANGS[lang]["prefix"] + "pricing/",
        app_label="下载 App" if lang == "zh" else "GET APP",
        buy_label="购买" if lang == "zh" else "BUY",
        app_current=current if page == "app/" else "",
        buy_current=current if page == "pricing/" else "",
        other_href=LANGS[other]["prefix"] + page,
        other_label="中文" if other == "zh" else "EN",
        other_hreflang="zh-CN" if other == "zh" else "en",
        other_title="切换到中文" if other == "zh" else "Switch to English",
    )


def write(path, markup):
    markup = seo.tags(path, markup)
    full = os.path.join(ROOT, "public", path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w").write(markup)


def main():
    texts, pairs = load_i18n()
    rows = [l.split("\t") for l in open(os.path.join(SRC, "order.tsv")).read().strip().split("\n")]
    sections = {"zh": [], "en": []}
    for aid, _x, _y, w, h, name in rows:
        body = convert(open(os.path.join(SRC, "jsx", f"{aid}.jsx")).read())
        # get_jsx drops the leading space of the hero's " Hoop" text node.
        body = body.replace('margin-left: -2px">Hoop<', 'margin-left: -2px">&nbsp;Hoop<')
        # The root of each artboard gets its artboard size back.
        body = body.replace('style="', f'style="width: {w}px; height: {h}px; ', 1)
        anchor = f' id="{ANCHORS[aid]}"' if aid in ANCHORS else ""
        section = (
            f'<section{anchor} class="ab" style="--w:{w};--h:{h}" data-artboard="{aid}">'
            f'<div class="in">{body}</div></section>'
        )
        sections["zh"].append(section)
        sections["en"].append(translate_text(section, texts, aid))
    tpl = open(os.path.join(ROOT, "template.html")).read()
    app = open(os.path.join(ROOT, "app.html")).read()
    for lang in LANGS:
        product = "\n".join(sections[lang])
        page = tpl if lang == "zh" else translate_pairs(tpl, pairs)
        prefix = LANGS[lang]["prefix"].lstrip("/")
        write(prefix + "index.html", page.replace("<!--HEADER-->", header_for(lang, "")).replace("<!--SECTIONS-->", product))
        app_page = app if lang == "zh" else translate_pairs(app, pairs)
        write(prefix + "app/index.html", app_page.replace("<!--HEADER-->", header_for(lang, "app/")))
        price_page = open(os.path.join(ROOT, "pricing.html")).read()
        for key, value in json.load(open(os.path.join(ROOT, "i18n", "pricing.json"))).items():
            price_page = price_page.replace("{{" + key + "}}", html.escape(value[lang]))
        write(prefix + "pricing/index.html", price_page.replace("<!--HEADER-->", header_for(lang, "pricing/")))
    seo.write_sitemap(os.path.join(ROOT, "public"))


if __name__ == "__main__":
    main()
