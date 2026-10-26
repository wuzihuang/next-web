"""Search-engine markup for the built pages: titles, canonical and hreflang
links, Open Graph URLs, JSON-LD, plus robots.txt and sitemap.xml.

build.py passes every page through tags() and calls write_sitemap() at the end,
so the tags survive any rebuild.
"""
import datetime
import json
import os
import re
from xml.sax.saxutils import escape

SITE = "https://nextbody.ai"
LANGS = {"en": "/", "zh": "/zh/"}
HREFLANG = {"en": "en", "zh": "zh-CN"}
OG_LOCALE = {"en": "en_US", "zh": "zh_CN"}

# Search titles and descriptions for the product page; the other pages keep
# the ones in their templates.
PRODUCT = {
    "en": {
        "title": "NEXTBODY Hoop: Ultra-thin Smart Health Band | NEXTBODY",
        "description": "NEXTBODY Hoop is a screenless smart health band, 8mm thin and 10g light. "
        "Heart rate, sleep staging, training load and a 14-metric Body Scan, read in the NEXTBODY App.",
        "h1": "NEXTBODY Hoop: ultra-thin smart health band",
    },
    "zh": {
        "title": "NEXTBODY Hoop 智能健康手环：极致轻薄，专业健康监测 | NEXTBODY",
        "description": "NEXTBODY Hoop 无屏智能健康手环，薄至 8mm、轻至 10g。心率、睡眠分期、训练负荷与 14 项身体成分扫描，"
        "在 NEXTBODY App 中一屏看全。",
        "h1": "NEXTBODY Hoop 智能健康手环",
    },
}

# Kept in step with pricing.html.
PRICE = {"price": "59.99", "priceCurrency": "USD"}

SR_ONLY = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"


def locate(path):
    """'zh/app/index.html' -> ('zh', 'app/')."""
    page = path[: -len("index.html")]
    if page.startswith("zh/"):
        return "zh", page[3:]
    return "en", page


def url(lang, page):
    return SITE + LANGS[lang] + page


def attr(value):
    return value.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def json_ld(lang, page, description, image):
    org = {
        "@type": "Organization",
        "@id": SITE + "/#org",
        "name": "NEXTBODY",
        "url": SITE + "/",
        "logo": SITE + "/favicon-192.png",
    }
    graph = [
        org,
        {"@type": "WebSite", "@id": SITE + "/#site", "name": "NEXTBODY", "url": SITE + "/",
         "inLanguage": HREFLANG[lang], "publisher": {"@id": SITE + "/#org"}},
    ]
    if page in ("", "pricing/"):
        graph.append({
            "@type": "Product",
            "name": "NEXTBODY Hoop",
            "brand": {"@type": "Brand", "name": "NEXTBODY"},
            "description": description,
            "image": image,
            "url": url(lang, ""),
            "offers": {"@type": "Offer", "url": url(lang, "pricing/"), **PRICE,
                       "availability": "https://schema.org/InStock"},
        })
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)


def tags(path, markup):
    """Add the search markup to one built page (path is relative to public/)."""
    if not path.endswith("index.html") or 'rel="canonical"' in markup:
        return markup
    lang, page = locate(path)
    if page == "":
        meta = PRODUCT[lang]
        markup = re.sub(r"<title>.*?</title>", "<title>" + meta["title"] + "</title>", markup, count=1)
        markup = re.sub(r'<meta name="description" content="[^"]*">',
                        f'<meta name="description" content="{attr(meta["description"])}">', markup, count=1)
        markup = markup.replace(
            '<main id="product" hidden>',
            f'<main id="product" hidden>\n<h1 style="{SR_ONLY}">{meta["h1"]}</h1>', 1)
    description = re.search(r'<meta name="description" content="([^"]*)">', markup)
    description = description.group(1).replace("&quot;", '"').replace("&amp;", "&") if description else ""
    image = re.search(r'<meta property="og:image" content="([^"]*)">', markup)
    image = image.group(1) if image else SITE + "/favicon-192.png"
    head = [f'<link rel="canonical" href="{url(lang, page)}">']
    head += [f'<link rel="alternate" hreflang="{HREFLANG[l]}" href="{url(l, page)}">' for l in LANGS]
    head.append(f'<link rel="alternate" hreflang="x-default" href="{url("en", page)}">')
    head += [
        f'<meta property="og:url" content="{url(lang, page)}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="NEXTBODY">',
        f'<meta property="og:locale" content="{OG_LOCALE[lang]}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<script type="application/ld+json">{json_ld(lang, page, description, image)}</script>',
    ]
    return markup.replace("</head>", "\n".join(head) + "\n</head>", 1)


def write_sitemap(public):
    """robots.txt and sitemap.xml listing every page that exists in both languages."""
    rel = lambda d: "" if d == public else os.path.relpath(d, public).replace(os.sep, "/")
    pages = sorted(
        rel(d) for d, _dirs, files in os.walk(public)
        if "index.html" in files and rel(d).split("/")[0] != "zh"
    )
    today = datetime.date.today().isoformat()
    entries = []
    for p in pages:
        page = p + "/" if p else ""
        if not os.path.exists(os.path.join(public, "zh", page, "index.html")):
            continue
        alts = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{HREFLANG[l]}" href="{escape(url(l, page))}"/>' for l in LANGS)
        alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{escape(url("en", page))}"/>'
        for lang in LANGS:
            entries.append(f"  <url>\n    <loc>{escape(url(lang, page))}</loc>\n    <lastmod>{today}</lastmod>{alts}\n  </url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + "\n".join(entries) + "\n</urlset>\n")
    open(os.path.join(public, "sitemap.xml"), "w").write(xml)
    open(os.path.join(public, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
