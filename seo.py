"""Search-engine markup for the built pages: titles, canonical and hreflang
links, Open Graph URLs, JSON-LD, plus robots.txt and sitemap.xml.

build.py passes every page through tags() and calls write_sitemap() at the end,
so the tags survive any rebuild. Homepage JSON-LD also includes FAQPage.
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

# Visible homepage FAQ. Chinese strings are the keys in i18n/en.json so the
# English JSON-LD stays in lockstep with the published artboard copy.
FAQ = [
    (
        "HOOP 是医疗器械吗？",
        "不是。HOOP 手环与 NEXTBODY App 均非医疗器械，不用于诊断、治疗、治愈或预防任何疾病。"
        "心率、血氧、HRV、皮肤温度、睡眠、身体成分、准备度、训练负荷等数据与提示仅供日常健康管理参考，"
        "不作为诊疗依据。如有身体不适，请及时就医并遵从医生建议。",
    ),
    (
        "身体扫描（BIA）测出来的体脂准吗？",
        "身体扫描通过生物电阻抗测得阻抗值，再结合你在 App 中填写的身高、体重、年龄与性别推算身体成分，"
        "结果为估算值，可能与体脂秤、DEXA 等方法存在差异。测量时电流在双臂与上身之间形成回路，"
        "下半身成分为推算所得。饮水、进食、运动、出汗与测量时段都会影响结果，"
        "建议每次在相同条件下测量（如晨起空腹、排尿后、运动前），更适合观察长期趋势。",
    ),
    (
        "哪些人不能使用身体扫描？",
        "体内植入心脏起搏器、植入式心律转复除颤器等电子医疗设备的人群请勿使用身体扫描。"
        "孕妇、体内有金属植入物者，以及接触部位皮肤有破损或炎症时不建议使用，结果也可能不准确。",
    ),
    (
        "身体扫描里的体重和基础代谢是手环测的吗？",
        "不是。手环不能称重，身体扫描使用你在 App 中录入的最近一次体重，脂肪量与去脂体重由该体重和体脂率计算得出，"
        "因此请在扫描前更新体重。身体扫描给出的基础代谢为设备估算参考值；App 计算每日热量目标时，"
        "使用基于身高、体重、年龄与性别的公式估算静息代谢，两者可能不同。",
    ),
    (
        "睡眠分数是怎么算的？",
        "睡眠分数满分 100，由七项睡眠因素按 HOOP 自有规则加权得出：总睡眠时长 40、快速眼动 15、深睡 15、"
        "睡眠效率 10、睡眠安稳度 10、入睡潜伏期 5、入睡时机 5，缺少数据的项目不计分，其余项目重新归一。"
        "入睡潜伏期目前不参与计算。这套规则参考了 Oura 公开的睡眠因素，但不是 Oura 的算法，也不是临床量表。"
        "心率、HRV、血氧与呼吸率为辅助数据，不计入睡眠分数。",
    ),
    (
        "为什么有的晚上没有快速眼动（REM）数据？",
        "是否记录到快速眼动取决于当晚手环生成的睡眠记录类型。某一晚没有 REM 数据，表示当晚未进行该项测量，"
        "不代表你没有 REM 睡眠；这一晚的睡眠分数会按其余项目重新归一。",
    ),
    (
        "夜间血氧低、HRV 低，是不是身体出了问题？",
        "夜间血氧仅在记录到的睡眠时段自动测量，提供当晚的平均值、最低值与曲线，不用于诊断或分级睡眠呼吸暂停。"
        "夜间 HRV 为睡眠期间的 RMSSD，可作为疲劳与恢复状态的参考。睡眠呼吸率同样只在睡眠时段记录，"
        "本产品没有日间呼吸监测。佩戴过松、夜间体动、手臂受压、环境温度过低等都可能影响读数；"
        "如数据长期异常或伴有不适，请咨询医生。",
    ),
    (
        "准备度和训练负荷的建议可以直接照着练吗？",
        "动态训练准备度（0–100）以昨晚的睡眠为起点，对比你近期的夜间 HRV 与静息心率个人基线；"
        "训练负荷（0–21）每 5 分钟结算一次心率区间与活动量。个人基线需要连续佩戴逐步建立，前两周会更多参考大众水平。"
        "二者均为算法估算，建议仅供参考，不能替代教练或医生的专业指导；"
        "运动中如出现胸闷、头晕、心悸等不适，请立即停止并就医。",
    ),
    (
        "页面上的心率准确度 98.2% 是什么意思？",
        "该数值为特定测试场景与条件下得出的结果。实际使用中，佩戴松紧与位置、运动强度、手腕毛发、纹身、肤色、"
        "皮肤湿度与环境温度等因素都可能影响心率读数，准确度可能有所不同。"
        "剧烈或不规则的手腕动作（如力量训练、球类运动）时读数波动可能较大。",
    ),
    (
        "HOOP 可以戴着游泳、洗澡吗？",
        "HOOP 达到 IP68 防尘防水等级，日常洗手、雨天、出汗及泳池等浅水运动时可以佩戴。"
        "不适用于潜水、跳水、热水淋浴、温泉、桑拿、高速水流等场景；在海水或泳池中使用后请用清水冲洗并擦干。"
        "请勿在水中或皮肤潮湿时进行身体扫描。尼龙表带浸水后需要较长时间晾干，长期潮湿可能引起皮肤不适。"
        "防水性能并非永久有效，可能随使用时间下降。",
    ),
    (
        "充一次电真的能用 5 天吗？",
        "5 天续航为特定测试条件下的结果。实际续航会因监测设置、运动时长、身体扫描与主动测量次数、"
        "与手机同步的频率、环境温度等不同而有所差异，电池容量也会随使用时间逐渐衰减。",
    ),
    (
        "10g、8mm 是怎么算的？和其他产品的对比可信吗？",
        "8mm 与 10g 为机身数据，不含表带；由于测量位置、方法与工具不同，结果可能存在差异，请以实物为准。"
        "重量对比图中各产品均为不含表带的实测值，其他产品的重量可能因型号、版本与批次不同而有所差异，"
        "对比仅用于说明重量差别。",
    ),
    (
        "饮食记录的热量和营养素准确吗？",
        "餐食的热量、蛋白质、碳水与脂肪基于食物种类与份量描述估算，不是称重或实验室测定结果，"
        "可能与实际摄入存在差异。每日热量与营养目标为一般性建议，不构成营养处方；"
        "孕期、哺乳期、患有慢性病或有特殊饮食需求的人群请遵医嘱。",
    ),
    (
        "把数据接入 ChatGPT、Claude 等 AI（MCP）安全吗？",
        "接入需要你本人登录并授权，AI 助手只能读取你自己账号下的数据。记录餐食默认关闭，"
        "开启后 AI 会在保存前与你确认食物、份量与时间。数据一旦发送给第三方 AI 服务，"
        "将按照该服务的隐私政策处理，请自行评估后使用。AI 助手给出的分析与建议仅供参考，"
        "不构成医疗、营养或训练处方。",
    ),
    (
        "HOOP 支持哪些手机？",
        "NEXTBODY App 支持 iOS 17 及以上版本的 iPhone，以及 Android 9 及以上版本的 Android 手机。"
        "使用前请将手环固件与 App 更新至最新版本，部分功能以实际 App 为准。",
    ),
    (
        "页面里的配色和界面跟实物一样吗？",
        "表带颜色、纹理可能因拍摄、灯光与显示设备不同而存在差异，请以实物为准。"
        "页面中的手机界面为 NEXTBODY App 实际界面截图，所示数据为演示数据；"
        "人物与场景图片仅供示意，功能与界面可能随版本更新而变化。",
    ),
]


def en_copy():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "i18n", "en.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def faq_page(lang):
    table = en_copy()
    entities = []
    for question, answer in FAQ:
        name = table[question] if lang == "en" else question
        text = table[answer] if lang == "en" else answer
        entities.append({
            "@type": "Question",
            "name": name,
            "acceptedAnswer": {"@type": "Answer", "text": text},
        })
    return {"@type": "FAQPage", "mainEntity": entities}


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
        # Product.url matches the page that carries the block so homepage and
        # /pricing/ each self-canonicalise. Offer.url stays the buy page.
        graph.append({
            "@type": "Product",
            "name": "NEXTBODY Hoop",
            "brand": {"@type": "Brand", "name": "NEXTBODY"},
            "description": description,
            "image": image,
            "url": url(lang, page),
            "offers": {"@type": "Offer", "url": url(lang, "pricing/"), **PRICE,
                       "availability": "https://schema.org/InStock"},
        })
    if page == "":
        graph.append(faq_page(lang))
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
