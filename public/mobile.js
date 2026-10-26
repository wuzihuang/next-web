// Phone layout for the product page. The desktop artboards are 1440px
// compositions; on narrow screens each one is rebuilt here as a single column
// from its own nodes (text, colours and images come straight from the
// artboard, so both languages and later Paper edits carry over).
//
// Paths count element children from the artboard root (">2>1" = first child
// of the root's second child), the same scheme motion.js uses. Sizes in
// `w`/`h`/`crop` are artboard pixels, taken from the 1440px design.
(function () {
  var mq = window.matchMedia('(max-width: 760px)');
  if (!mq.matches) return;

  var SPEC = {
    '3SP-0': [
      {t: 'img', p: '>1>1', w: 1260, h: 630, fit: 'cover'},
      {t: 'rich', p: '>1>3', cls: 'm-brand'},
      {t: 'join', p: '>1>4', cls: 'm-tagline'},
    ],
    '4L4-0': [
      {t: 'box', p: '>1>1', kids: [
        {t: 'rich', p: '>1>1>2>1', cls: 'm-h3'}, {t: 'rich', p: '>1>1>2>2', cls: 'm-p'},
        {t: 'img', p: '>1>1>1', w: 916, h: 458, fit: 'contain'}]},
      {t: 'box', p: '>1>2', kids: [
        {t: 'rich', p: '>1>2>2>1', cls: 'm-h3'}, {t: 'rich', p: '>1>2>2>2', cls: 'm-p'},
        {t: 'img', p: '>1>2>1', w: 400, h: 483, fit: 'contain', max: 220}]},
      {t: 'box', p: '>2>1', kids: [
        {t: 'rich', p: '>2>1>1>1', cls: 'm-h3'}, {t: 'rich', p: '>2>1>1>2', cls: 'm-p'},
        {t: 'art', p: '>2>1>2', w: 386, h: 218}]},
      {t: 'box', p: '>2>2', kids: [
        {t: 'rich', p: '>2>2>1>1', cls: 'm-h3'}, {t: 'rich', p: '>2>2>1>2', cls: 'm-p'},
        {t: 'img', p: '>2>2>2', w: 181, h: 241, fit: 'contain', max: 200}]},
      {t: 'box', p: '>3>1', kids: [
        {t: 'rich', p: '>3>1>2>1', cls: 'm-h3'}, {t: 'rich', p: '>3>1>2>2', cls: 'm-p'},
        {t: 'art', p: '>3>1>1', w: 215, h: 370, max: 230}]},
      {t: 'box', p: '>3>2', kids: [
        {t: 'rich', p: '>3>2>2>1', cls: 'm-h3'}, {t: 'rich', p: '>3>2>2>2', cls: 'm-p'},
        {t: 'img', p: '>3>2>1', w: 450, h: 265, fit: 'cover'}]},
      {t: 'box', p: '>4>1', kids: [
        {t: 'rich', p: '>4>1>3>1', cls: 'm-h3'}, {t: 'rich', p: '>4>1>3>2', cls: 'm-p'},
        {t: 'row', kids: [{t: 'art', p: '>4>1>1', w: 150, h: 310, max: 200}, {t: 'art', p: '>4>1>2', w: 150, h: 310, max: 200}]}]},
      {t: 'box', p: '>4>2', kids: [
        {t: 'rich', p: '>4>2>1>1', cls: 'm-h3'}, {t: 'rich', p: '>4>2>1>2', cls: 'm-p'},
        {t: 'art', p: '>4>2>2', w: 270, h: 30}]},
      {t: 'row', kids: [{t: 'box', p: '>4>3>1', kids: [{t: 'rich', p: '>4>3>1>2', cls: 'm-h3'}]},
        {t: 'box', p: '>4>3>2', kids: [{t: 'rich', p: '>4>3>2>2', cls: 'm-h3'}]}]},
    ],
    '3Y4-0': [
      {t: 'rich', p: '>2', cls: 'm-eyebrow'},
      {t: 'art', p: '>1', w: 1226, h: 268},
      {t: 'img', p: '>5', w: 380, h: 519, fit: 'contain', max: 300},
    ],
    '3U4-0': [
      {t: 'rich', p: '>4>1', cls: 'm-h1'},
      {t: 'rich', p: '>4>2', cls: 'm-p'},
      {t: 'art', p: '>5', w: 300, h: 90},
      {t: 'img', p: '>3', w: 860, h: 1067, fit: 'contain', max: 360},
    ],
    '3WW-0': [
      {t: 'rich', p: '>1>1', cls: 'm-eyebrow'},
      {t: 'rich', p: '>1>2', cls: 'm-h1'},
      {t: 'rich', p: '>1>3', cls: 'm-p'},
      {t: 'art', p: '>2', w: 220, h: 160},
      {t: 'hbars', values: ['>3>6>1>2', '>3>6>2>1', '>3>6>3>1', '>3>6>4>1', '>3>6>5>1'],
        labels: ['>3>8>1', '>3>8>2', '>3>8>3', '>3>8>4', '>3>8>5'], unit: '>3>1'},
      {t: 'rich', p: '>4', cls: 'm-small'},
    ],
    '3V9-0': colourway(),
    '3UN-0': colourway(),
    '3UY-0': colourway(),
    '3VK-0': colourway(),
    '3YA-0': [
      {t: 'rich', p: '>1>1', cls: 'm-h2'}, {t: 'rich', p: '>1>2', cls: 'm-p'},
      strap('>2>1'), strap('>2>2'),
      {t: 'rich', p: '>3>1', cls: 'm-h2'}, {t: 'rich', p: '>3>2', cls: 'm-p'},
      strap('>4>1'), strap('>4>2'),
    ],
    '3T7-0': [
      {t: 'rich', p: '>4', cls: 'm-h1'},
      {t: 'rich', p: '>5', cls: 'm-p'},
      {t: 'crop', crop: [250, 300, 940, 680]},
    ],
    '3T2-0': [
      {t: 'rich', p: '>1>2', cls: 'm-eyebrow'},
      {t: 'crop', crop: [180, 0, 1080, 804]},
    ],
    '3VV-0': [
      {t: 'rich', p: '>2>1', cls: 'm-h1'},
      {t: 'rich', p: '>2>2', cls: 'm-p'},
      {t: 'rich', p: '>3', cls: 'm-stat'},
      {t: 'img', p: '>4', w: 762, h: 920, fit: 'contain', max: 380},
    ],
    '3ZE-0': [
      {t: 'img', p: '>1', w: 1440, h: 760, fit: 'cover'},
      {t: 'box', dark: true, kids: [
        {t: 'rich', p: '>1>2>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>1>2>2', cls: 'm-h1'}, {t: 'rich', p: '>1>2>3', cls: 'm-p'}]},
      {t: 'rich', p: '>2>1>1>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>2>1>1>2', cls: 'm-h2'}, {t: 'rich', p: '>2>1>2', cls: 'm-p'},
      {t: 'art', p: '>2>2>1', w: 520, h: 458},
      {t: 'art', p: '>2>2>2', w: 596, h: 458},
      {t: 'rich', p: '>3>2>1>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>3>2>1>2', cls: 'm-h2'}, {t: 'rich', p: '>3>2>1>3', cls: 'm-p'},
      {t: 'art', p: '>3>1', w: 560, h: 680, max: 330},
      {t: 'art', p: '>3>2>2', w: 520, h: 234},
      {t: 'rich', p: '>4>1>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>4>1>2', cls: 'm-h2'}, {t: 'rich', p: '>4>1>3', cls: 'm-p'},
      {t: 'grid', kids: [{t: 'rich', p: '>4>3', cls: 'm-stat'}, {t: 'rich', p: '>4>5', cls: 'm-stat'},
        {t: 'rich', p: '>4>4', cls: 'm-stat'}, {t: 'rich', p: '>4>6', cls: 'm-stat'}]},
      {t: 'art', p: '>4>2', w: 400, h: 841, max: 360},
    ],
    '43S-0': [
      {t: 'rich', p: '>2>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>2>2', cls: 'm-h1'}, {t: 'rich', p: '>2>3', cls: 'm-p'},
      {t: 'chips', p: '>2>4'},
      {t: 'art', p: '>2>5', w: 330, h: 94},
      {t: 'img', p: '>1', w: 610, h: 821, fit: 'contain', max: 420},
    ],
    '457-0': [
      {t: 'rich', p: '>1>1', cls: 'm-h2 m-center'},
      {t: 'rich', p: '>1>2>1>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>1>2>1>2', cls: 'm-h3'}, {t: 'rich', p: '>1>2>1>3', cls: 'm-p'},
      {t: 'art', p: '>1>2>1>4', w: 470, h: 70},
      {t: 'img', p: '>1>2>2', w: 423, h: 506, fit: 'contain', max: 380},
      {t: 'rich', p: '>2>2>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>2>2>2', cls: 'm-h2'}, {t: 'rich', p: '>2>2>3', cls: 'm-p'},
      {t: 'art', p: '>2>2>4', w: 580, h: 214},
      {t: 'art', p: '>2>1', w: 560, h: 670, max: 360},
      {t: 'rich', p: '>2>2>5', cls: 'm-small'},
    ],
    '49F-0': [
      {t: 'rich', p: '>1>2', cls: 'm-h1'},
      {t: 'rich', p: '>1>3', cls: 'm-p'},
      {t: 'art', p: '>1>4', w: 242, h: 232},
      {t: 'img', p: '>1>1', w: 1224, h: 884, fit: 'contain'},
    ],
    '3U0-0': [
      {t: 'rich', p: '>2', cls: 'm-eyebrow'},
      {t: 'crop', crop: [220, 0, 1000, 720]},
    ],
    '3Q7-0': [
      {t: 'rich', p: '>1>1', cls: 'm-h2 m-center'},
      {t: 'rich', p: '>1>2', cls: 'm-p m-center'},
      {t: 'art', p: '>3>2', w: 276, h: 749, max: 300},
      {t: 'art', p: '>3>1', w: 456, h: 220},
      {t: 'art', p: '>3>3', w: 456, h: 220},
    ],
    '48S-0': [
      {t: 'img', p: '>1', w: 1440, h: 460, fit: 'cover'},
      {t: 'rich', p: '>2>1', cls: 'm-h1'}, {t: 'rich', p: '>2>2', cls: 'm-p'},
      {t: 'rich', p: '>4', cls: 'm-p'},
      {t: 'art', p: '>5', w: 380, h: 90},
      {t: 'art', p: '>3', w: 360, h: 757, max: 380},
    ],
    '4A2-0': [
      {t: 'crop', crop: [136, 60, 1168, 500]},
      {t: 'rich', p: '>5>1', cls: 'm-eyebrow m-center'}, {t: 'rich', p: '>5>2', cls: 'm-h1 m-center'}, {t: 'rich', p: '>5>3', cls: 'm-p m-center'},
    ],
    '4AB-0': [
      {t: 'rich', p: '>6>1', cls: 'm-eyebrow'}, {t: 'rich', p: '>6>2', cls: 'm-h1'}, {t: 'rich', p: '>6>3', cls: 'm-p'},
      {t: 'crop', crop: [490, 130, 940, 730]},
    ],
    '4BC-0': [
      {t: 'rich', p: '>1>1', cls: 'm-eyebrow m-center'}, {t: 'rich', p: '>1>2', cls: 'm-h1 m-center'}, {t: 'rich', p: '>1>3', cls: 'm-p m-center'},
      {t: 'chips', p: '>2', keepIcons: true},
      {t: 'art', p: '>3', w: 440, h: 40},
      {t: 'crop', crop: [330, 570, 780, 670]},
      {t: 'rich', p: '>14>1', cls: 'm-h3 m-center'}, {t: 'rich', p: '>14>2', cls: 'm-p m-center'},
      {t: 'crop', crop: [40, 1440, 1360, 600]},
      {t: 'rich', p: '>9>1', cls: 'm-block'}, {t: 'rich', p: '>9>2', cls: 'm-block'},
    ],
    '4ME-0': [
      {t: 'rich', p: '>1', cls: 'm-h1 m-center'}, {t: 'rich', p: '>2', cls: 'm-p m-center'},
      {t: 'faq', p: '>3'},
      {t: 'rich', p: '>4', cls: 'm-notes'},
    ],
  };

  function colourway() {
    return [
      {t: 'rich', p: '>1', cls: 'm-h2 m-center'},
      {t: 'img', p: '>2>1', w: 590, h: 562, fit: 'cover'},
      {t: 'box', p: '>2>2', kids: [
        {t: 'rich', p: '>2>2>1', cls: 'm-brand-sm'},
        {t: 'img', p: '>2>2>2', w: 98, h: 268, fit: 'contain', max: 200},
        {t: 'rich', p: '>2>2>3', cls: 'm-h3 m-center'},
        {t: 'rich', p: '>2>2>4', cls: 'm-p m-center'}]},
    ];
  }

  function strap(p) {
    return {t: 'group', kids: [
      {t: 'img', p: p + '>1', w: 665, h: 419, fit: 'cover'},
      {t: 'rich', p: p + '>2>1', cls: 'm-h3'},
      {t: 'rich', p: p + '>2>2', cls: 'm-p'},
    ]};
  }

  function at(root, path) {
    var el = root;
    var parts = (path || '').split('>').filter(Boolean);
    for (var i = 0; i < parts.length && el; i++) el = el.children[+parts[i] - 1];
    return el || null;
  }

  function div(cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    return d;
  }

  // Text with its own colours and line structure, desktop sizing removed.
  // Children of a flex row stay on one line; anything else gets its own line.
  function rich(el, cls) {
    var c = el.cloneNode(true);
    var all = [c].concat(Array.prototype.slice.call(c.querySelectorAll('*')));
    var plan = all.map(function (n, i) {
      if (n.tagName === 'BR') return null;
      var p = i > 0 ? n.parentElement : null;
      var row = p && p.style.display === 'flex' && p.style.flexDirection !== 'column';
      return {
        row: row,
        gap: row ? parseFloat(p.style.gap) || 0 : 0,
        color: n.style.color,
        size: parseFloat(n.style.fontSize) || 0,
        weight: n.style.fontWeight,
        src: n.style.backgroundImage,
        // A one- or two-digit number much smaller than the text before it is a
        // footnote marker; a big standalone number is a stat figure.
        sup: !n.children.length && /^\s*\d{1,2}\s*$/.test(n.textContent) && !!n.previousElementSibling &&
          (parseFloat(n.style.fontSize) || 99) * 2 <= (parseFloat(n.previousElementSibling.style.fontSize) || 0),
        num: !n.children.length && (parseFloat(n.style.fontSize) || 0) >= 40 && /^\s*[+\-–\d.,%]+\s*$/.test(n.textContent),
      };
    });
    all.forEach(function (n, i) {
      var pl = plan[i];
      if (!pl) return;
      n.removeAttribute('style');
      if (pl.color) n.style.color = pl.color;
      if (pl.weight && +pl.weight >= 600) n.style.fontWeight = pl.weight;
      if (pl.src && pl.src !== 'none') {
        n.className = 'm-icon';
        n.style.backgroundImage = pl.src;
        return;
      }
      if (i === 0) return;
      n.style.display = pl.row ? 'inline' : 'block';
      if (pl.row && n.nextElementSibling && (pl.gap || /[A-Za-z]$/.test(n.textContent.trim()))) {
        n.style.marginRight = pl.gap ? Math.min(pl.gap * 0.5, 10) + 'px' : '0.28em';
      }
      if (pl.sup) n.className = 'm-sup';
      if (pl.num) n.className = 'm-num';
    });
    c.className = 'm-rich ' + (cls || '');
    return c;
  }

  // An intact desktop subtree, scaled to fit the column.
  function art(el, w, h, max) {
    var col = width();
    var z = Math.min(1, col / w);
    if (max) z = Math.min(z, max / h);
    var box = div('m-art');
    box.style.width = w * z + 'px';
    box.style.height = h * z + 'px';
    var c = el.cloneNode(true);
    c.style.position = 'relative';
    c.style.left = c.style.top = c.style.right = c.style.bottom = 'auto';
    c.style.margin = '0';
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.style.zoom = z;
    box.appendChild(c);
    return box;
  }

  // A window onto the whole artboard (for overlapping compositions).
  function crop(root, rect) {
    var col = width();
    var z = col / rect[2];
    var box = div('m-crop');
    box.style.height = rect[3] * z + 'px';
    var c = root.cloneNode(true);
    c.style.position = 'absolute';
    c.style.left = -rect[0] + 'px';
    c.style.top = -rect[1] + 'px';
    c.style.zoom = z;
    box.appendChild(c);
    return box;
  }

  function img(el, b) {
    var col = width();
    var h = col * b.h / b.w;
    if (b.max && h > b.max) h = b.max;
    var d = div('m-img');
    d.style.backgroundImage = el.style.backgroundImage;
    d.style.backgroundSize = b.fit === 'cover' ? 'cover' : 'contain';
    d.style.backgroundPosition = el.style.backgroundPosition || '50%';
    d.style.height = Math.round(h) + 'px';
    if (el.style.maskImage) d.style.webkitMaskImage = d.style.maskImage = el.style.maskImage;
    return d;
  }

  function width() {
    return Math.min(window.innerWidth, 760) - 40;
  }

  function texts(el) {
    return Array.prototype.slice.call(el.querySelectorAll('*')).concat([el]).filter(function (n) {
      return !n.children.length && n.textContent.trim();
    }).map(function (n) { return n.textContent.trim(); });
  }

  function build(section, root, b) {
    var el = b.p !== undefined ? at(root, b.p) : null;
    if (b.p !== undefined && !el) return null;
    switch (b.t) {
      case 'rich': return rich(el, b.cls);
      case 'img': return img(el, b);
      case 'art': return art(el, b.w, b.h, b.max);
      case 'crop': return crop(root, b.crop);
      case 'join': {
        var d = div('m-rich ' + b.cls);
        d.textContent = texts(el).join('  ·  ');
        return d;
      }
      case 'chips': {
        var wrap = div('m-chips');
        Array.prototype.forEach.call(el.children, function (chip) {
          var c = div('m-chip');
          var icon = chip.querySelector('[style*="background-image"]');
          if (icon && b.keepIcons) {
            var i = div('m-icon');
            i.style.backgroundImage = icon.style.backgroundImage;
            c.appendChild(i);
          }
          var dot = Array.prototype.find.call(chip.children, function (k) { return !k.textContent.trim() && k.style.backgroundColor; });
          if (dot) {
            var s = div('m-dot');
            s.style.background = dot.style.backgroundColor;
            c.appendChild(s);
          }
          c.appendChild(document.createTextNode(texts(chip).join(' ')));
          if (chip.style.backgroundColor) c.style.background = chip.style.backgroundColor;
          var tc = chip.querySelector('[style*="color"]');
          if (tc && tc.style.color) c.style.color = tc.style.color;
          wrap.appendChild(c);
        });
        return wrap;
      }
      case 'hbars': {
        var vals = b.values.map(function (p) { var n = at(root, p); return n ? parseFloat(n.textContent) : 0; });
        var labs = b.labels.map(function (p) { var n = at(root, p); return n ? n.textContent.trim() : ''; });
        var top = Math.max.apply(null, vals);
        var chart = div('m-bars');
        var unit = at(root, b.unit);
        if (unit) chart.appendChild(rich(unit, 'm-small'));
        vals.forEach(function (v, i) {
          var row = div('m-bar' + (i === 0 ? ' is-us' : ''));
          var lab = div('m-bar-label'); lab.textContent = labs[i];
          var track = div('m-bar-track');
          var fill = div('m-bar-fill'); fill.style.width = (v / top) * 100 + '%';
          var val = div('m-bar-val'); val.textContent = v;
          track.appendChild(fill);
          row.appendChild(lab); row.appendChild(track); row.appendChild(val);
          chart.appendChild(row);
        });
        return chart;
      }
      case 'faq': {
        var list = div('m-faq');
        Array.prototype.forEach.call(el.children, function (card) {
          var item = document.createElement('details');
          item.className = 'm-faq-item';
          var q = document.createElement('summary');
          q.textContent = texts(card.children[0] || card).filter(function (t) { return t !== 'Q'; }).join(' ');
          var a = div('m-p');
          a.textContent = texts(card.children[1] || card).filter(function (t) { return t !== 'A'; }).join(' ');
          item.appendChild(q); item.appendChild(a);
          list.appendChild(item);
        });
        return list;
      }
      case 'box': case 'group': case 'row': case 'grid': {
        var box = div(b.t === 'box' ? 'm-box' + (b.dark ? ' m-dark' : '') : 'm-' + b.t);
        if (el) {
          if (el.style.backgroundColor) box.style.backgroundColor = el.style.backgroundColor;
          if (el.style.backgroundImage && /gradient/.test(el.style.backgroundImage)) box.style.backgroundImage = el.style.backgroundImage;
          if (isDark(el.style.backgroundColor)) box.classList.add('m-dark');
        }
        (b.kids || []).forEach(function (k) {
          var n = build(section, root, k);
          if (n) box.appendChild(n);
        });
        return box;
      }
    }
    return null;
  }

  function isDark(color) {
    var m = (color || '').match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return false;
    return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2] < 110;
  }

  function sectionBg(root) {
    var bg = root.style.backgroundColor;
    if (!bg && root.style.backgroundImage) {
      var m = root.style.backgroundImage.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/i);
      bg = m ? m[0] : '';
    }
    return bg || '#ffffff';
  }

  document.querySelectorAll('section.ab').forEach(function (section) {
    var spec = SPEC[section.dataset.artboard];
    var root = section.querySelector('.in > *');
    if (!spec || !root) return;
    var m = document.createElement('section');
    m.className = 'mb';
    m.dataset.artboard = section.dataset.artboard;
    if (section.id) {
      m.id = section.id;
      section.removeAttribute('id');
    }
    var bg = sectionBg(root);
    m.style.background = bg;
    var probe = div();
    probe.style.color = bg;
    document.body.appendChild(probe);
    var dark = isDark(getComputedStyle(probe).color);
    probe.remove();
    if (dark || section.dataset.artboard === '457-0' || section.dataset.artboard === '4A2-0' || section.dataset.artboard === '4AB-0') m.classList.add('m-dark');
    spec.forEach(function (b) {
      try {
        var n = build(m, root, b);
        if (n) m.appendChild(n);
      } catch (e) {
        // A missing node only drops that block; the section still renders.
      }
    });
    section.after(m);
  });
  document.documentElement.classList.add('m-ready');

  mq.addEventListener('change', function () { location.reload(); });
})();
