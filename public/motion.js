// Section choreography for nextbody.ai. Each product section gets one or two
// large entrances (built from the FX library below), held at their start pose
// until they scroll into view, and the big background words drift with the
// scroll. Skipped entirely under reduced motion.
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  tagLanguageSwitch();
  if (reduced || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  document.documentElement.classList.add('js-motion');

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var BACK = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  // Keyframes are written as if the element had no transform/opacity of its
  // own; play() appends the element's real values so final states are exact.
  var FX = {
    rise: [{opacity: 0, transform: 'translateY(60px)'}, {}],
    riseBig: [{opacity: 0, transform: 'translateY(140px)'}, {}],
    fade: [{opacity: 0}, {}],
    fromLeft: [{opacity: 0, transform: 'translateX(-160px)'}, {}],
    fromRight: [{opacity: 0, transform: 'translateX(160px)'}, {}],
    focus: [{opacity: 0, filter: 'blur(28px)', transform: 'scale(1.14)'}, {filter: 'blur(0px)'}],
    track: [{opacity: 0, letterSpacing: '0.6em', filter: 'blur(8px)'}, {filter: 'blur(0px)'}],
    sprint: [{opacity: 0, transform: 'translateX(-320px) skewX(14deg)', filter: 'blur(14px)'}, {filter: 'blur(0px)'}],
    surge: [{opacity: 0, transform: 'translateY(160px) scale(0.9)'}, {}],
    swing: [{opacity: 0, transform: 'translateX(240px) rotate(12deg) scale(0.92)'}, {}],
    plug: [{opacity: 0, transform: 'translateX(-280px)'}, {}],
    raise: [{opacity: 0, transform: 'translateY(260px) rotate(-12deg)'}, {}],
    drop: [
      {opacity: 0, transform: 'translateY(-220px) rotate(-10deg)'},
      {offset: 0.7, opacity: 1, transform: 'translateY(16px) rotate(1.5deg)'},
      {},
    ],
    pop: [{opacity: 0, transform: 'scale(0.2)'}, {offset: 0.65, opacity: 1, transform: 'scale(1.15)'}, {}],
    flipUp: [{opacity: 0, transform: 'perspective(1200px) rotateX(-32deg) translateY(110px)'}, {}],
    tilt3d: [{opacity: 0, transform: 'perspective(1400px) rotateY(-48deg) translateX(220px) scale(0.86)'}, {}],
    fanL: [{opacity: 0, transform: 'translateX(320px) rotate(10deg) scale(0.86)'}, {}],
    fanR: [{opacity: 0, transform: 'translateX(-300px) rotate(-10deg) scale(0.86)'}, {}],
    growY: [{transform: 'scaleY(0)', transformOrigin: '50% 100%'}, {transformOrigin: '50% 100%'}],
    growX: [{transform: 'scaleX(0)', transformOrigin: '0 50%'}, {transformOrigin: '0 50%'}],
    wipeL: [{clipPath: 'inset(0 100% 0 0)'}, {clipPath: 'inset(0 0% 0 0)'}],
    wipeR: [{clipPath: 'inset(0 0 0 100%)'}, {clipPath: 'inset(0 0 0 0%)'}],
    wipeT: [{clipPath: 'inset(0 0 100% 0)'}, {clipPath: 'inset(0 0 0% 0)'}],
    wipeB: [{clipPath: 'inset(100% 0 0 0)'}, {clipPath: 'inset(0% 0 0 0)'}],
    iris: [{clipPath: 'circle(0% at 50% 58%)'}, {clipPath: 'circle(85% at 50% 58%)'}],
    zoomTile: [{clipPath: 'inset(14% 14% 14% 14%)', transform: 'scale(1.22)', opacity: 0}, {clipPath: 'inset(0% 0% 0% 0%)'}],
    kenWipe: [{clipPath: 'inset(0 0 100% 0)', transform: 'scale(1.25)'}, {clipPath: 'inset(0 0 0% 0)'}],
    dusk: [{filter: 'brightness(0) saturate(0)', transform: 'scale(1.1)'}, {filter: 'brightness(1) saturate(1)'}],
    ignite: [{opacity: 0, transform: 'scale(0.5)', filter: 'brightness(3) blur(16px)'}, {filter: 'brightness(1) blur(0px)'}],
    ripple: [{opacity: 0, transform: 'scale(0.15)'}, {}],
  };

  // Paths count element children from the artboard root: ">2>1" is the first
  // child of the root's second child. They are the same in both languages.
  // One or two large moves per section (main visual, headline block); small
  // items like icons, chips, labels and numbers just appear with their section.
  var PLAN = {
    '3SP-0': [
      {p: '>1>1', fx: 'focus', dur: 1900},
      {p: ['>1>3>1', '>1>3>2'], fx: 'track', delay: 450, stagger: 140, dur: 1500},
    ],
    '4L4-0': [
      {p: ['>1', '>2', '>3', '>4'], fx: 'flipUp', stagger: 140, dur: 1300},
    ],
    '3Y4-0': [
      {p: '>1', fx: 'track', dur: 1800, parallax: -140},
      {p: '>5', fx: 'drop', delay: 250, dur: 1500},
    ],
    '3U4-0': [
      {p: '>3', fx: 'swing', dur: 1700},
      {p: '>4', fx: 'fromLeft', delay: 200},
    ],
    '3WW-0': [
      {p: '>1', fx: 'fromLeft'},
      {p: ['>3>6>1>3', '>3>6>2>2', '>3>6>3>2', '>3>6>4>2', '>3>6>5>2'], fx: 'growY', delay: 300, stagger: 150, dur: 1300, ease: BACK},
    ],
    '3V9-0': colourway('wipeL'),
    '3UN-0': colourway('wipeR'),
    '3UY-0': colourway('wipeT'),
    '3VK-0': colourway('wipeB'),
    '3YA-0': [
      {p: ['>2>1>1', '>2>2>1'], fx: 'zoomTile', stagger: 180, dur: 1500},
      {p: ['>4>1>1', '>4>2>1'], fx: 'zoomTile', stagger: 180, dur: 1500},
    ],
    '3T7-0': [
      {p: '', fx: 'iris', dur: 1700},
      {p: '>18', fx: 'drop', delay: 650, dur: 1400},
    ],
    '3T2-0': [
      {p: '>1>1', fx: 'track', dur: 1600, parallax: 180},
      {p: '>1>3', fx: 'sprint', delay: 150, dur: 1500},
    ],
    '3VV-0': [
      {p: '>4', fx: 'tilt3d', dur: 1800},
      {p: '>2>1', fx: 'fromLeft', delay: 200},
    ],
    '3ZE-0': [
      {p: '>1', fx: 'dusk', dur: 2400},
      {p: ['>2>2>1', '>2>2>2'], fx: 'flipUp', delay: 150, stagger: 180, dur: 1300},
      {p: '>3>1', fx: 'raise', dur: 1500},
    ],
    '43S-0': [
      {p: '>1', fx: 'raise', dur: 1600},
      {p: '>2', fx: 'rise', delay: 250},
    ],
    '457-0': [
      {p: '>1>2>2', fx: 'scan', dur: 2200},
      {p: '>2>1', fx: 'raise', dur: 1500},
    ],
    '49F-0': [
      {p: '>1>1', fx: 'plug', dur: 1700},
    ],
    '3U0-0': [
      {p: '>1', fx: 'track', dur: 1600, parallax: -180},
      {p: '>3', fx: 'surge', delay: 100, dur: 1600},
    ],
    '3Q7-0': [
      {p: '>3>2', fx: 'surge', delay: 200, dur: 1500},
    ],
    '48S-0': [
      {p: '>1', fx: 'kenWipe', dur: 2200},
      {p: '>3', fx: 'raise', delay: 400, dur: 1500},
    ],
    '4A2-0': [
      {p: ['>2', '>3', '>4'], fx: 'ignite', delay: 150, stagger: 220, dur: 2000},
    ],
    '4AB-0': [
      {p: '>4', fx: 'surge', delay: 150, dur: 1400},
      {p: '>2', fx: 'fanL', delay: 450, dur: 1500},
      {p: '>3', fx: 'fanR', delay: 450, dur: 1500},
    ],
    '4BC-0': [
      {p: '>12', fx: 'pop', delay: 200, dur: 1100, ease: BACK},
      {p: ['>4', '>5', '>6', '>7', '>8'], fx: 'surge', stagger: 110, dur: 1400},
    ],
    '4ME-0': [
      {p: ['>1', '>2'], fx: 'rise', stagger: 120},
    ],
  };

  function colourway(wipe) {
    return [
      {p: '>2>1', fx: wipe, dur: 1400},
      {p: '>2>2>2', fx: 'drop', delay: 400, dur: 1400},
    ];
  }

  function at(root, path) {
    var el = root;
    var parts = path.split('>').filter(Boolean);
    for (var i = 0; i < parts.length && el; i++) el = el.children[+parts[i] - 1];
    return el || null;
  }

  function list(root, step) {
    if (step.kids) {
      var parent = at(root, step.kids);
      return parent ? Array.prototype.slice.call(parent.children) : [];
    }
    if (step.leaves) {
      var out = [];
      step.leaves.forEach(function (p) {
        var g = at(root, p);
        if (g) out = out.concat(Array.prototype.slice.call(g.querySelectorAll('*')).filter(function (e) {
          return !e.children.length;
        }));
      });
      return out;
    }
    var paths = Array.isArray(step.p) ? step.p : [step.p];
    return paths.map(function (p) {
      return at(root, p);
    }).filter(Boolean);
  }

  // Merge the element's own transform/opacity/letter-spacing into the frames.
  function frames(el, fx, i, section) {
    var cs = getComputedStyle(el);
    var base = cs.transform === 'none' ? '' : ' ' + cs.transform;
    var baseFilter = cs.filter === 'none' ? '' : ' ' + cs.filter;
    var src = FX[fx];
    if (fx === 'orbit') src = orbitFrames(el, section);
    if (fx === 'alt') src = (i % 2 ? FX.fromRight : FX.fromLeft);
    return src.map(function (f, k) {
      var out = {};
      for (var key in f) out[key] = f[key];
      var last = k === src.length - 1;
      if (out.transform) out.transform = out.transform + base;
      else if (last || out.offset === undefined) out.transform = base.trim() || 'none';
      // Same for filters: some artboard layers carry their own blur.
      if (out.filter) out.filter = last ? cs.filter : out.filter + baseFilter;
      if (last) {
        out.opacity = cs.opacity;
        if (fx === 'track') out.letterSpacing = cs.letterSpacing;
      }
      return out;
    });
  }

  // Orbit icons fly out from the NEXTBODY app icon in the middle.
  function orbitFrames(el, section) {
    var hub = at(section.querySelector('.in > *'), '>12') || section;
    var a = el.getBoundingClientRect(), b = hub.getBoundingClientRect();
    var z = parseFloat(getComputedStyle(section.querySelector('.in')).zoom) || 1;
    var dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / z;
    var dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / z;
    return [{opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.2)'}, {}];
  }

  // Final keyframes equal each element's natural style, so once an animation
  // ends it is cancelled: the element leaves its compositing layer and renders
  // exactly as the static page does.
  function settle(a) {
    a.finished.then(function () { a.cancel(); }, function () {});
    return a;
  }

  var groups = new Map();
  function arm(trigger, run) {
    if (!groups.has(trigger)) groups.set(trigger, []);
    groups.get(trigger).push(run);
  }

  var parallax = [];

  function setupSections() {
  document.querySelectorAll('section.ab').forEach(function (section) {
    var plan = PLAN[section.dataset.artboard];
    var root = section.querySelector('.in > *');
    if (!plan || !root) return section.classList.add('fx-fallback');
    plan.forEach(function (step) {
      if (step.count) {
        var els = step.count.map(function (p) { return at(root, p); }).filter(Boolean);
        var trig = els[0] && els[0].parentElement;
        if (trig) arm(trig, function () { els.forEach(function (e) { countUp(e, step.delay || 0); }); });
        return;
      }
      var els = list(root, step);
      if (!els.length) return;
      if (step.p === '') els = [root];
      var trigger = step.trigger ? at(root, step.trigger) : step.p === '' ? section : els[0].parentElement || section;
      if (step.fromCenter) {
        var mid = section.getBoundingClientRect();
        var cx = mid.left + mid.width / 2;
        els.sort(function (a, b) {
          return Math.abs(a.getBoundingClientRect().left - cx) - Math.abs(b.getBoundingClientRect().left - cx);
        });
      }
      var anims = els.map(function (el, i) {
        if (step.fx === 'scan') return scan(el, step);
        var row = step.perRow ? Math.floor(i / step.perRow) : i;
        var a = el.animate(frames(el, step.fx, i, section), {
          duration: step.dur || 1100,
          delay: (step.delay || 0) + row * (step.stagger || 0),
          easing: step.ease || EASE,
          fill: 'both',
        });
        a.pause();
        return settle(a);
      });
      arm(trigger || section, function () {
        anims.forEach(function (a) { a.play(); });
      });
      if (step.parallax) els.forEach(function (el) { parallax.push({el: el, section: section, amount: step.parallax}); });
    });
  });
  }

  // Body scan: the figure is revealed top-down behind a glowing lime line.
  function scan(el, step) {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var line = document.createElement('div');
    line.className = 'fx-scanline';
    el.appendChild(line);
    var dur = step.dur || 2000;
    var reveal = el.animate([{clipPath: 'inset(0 0 100% 0)'}, {clipPath: 'inset(0 0 0% 0)'}], {duration: dur, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both'});
    var sweep = line.animate(
      [{top: '0%', opacity: 1}, {offset: 0.92, top: '100%', opacity: 1}, {top: '100%', opacity: 0}],
      {duration: dur, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both'},
    );
    reveal.pause();
    sweep.pause();
    settle(reveal);
    sweep.finished.then(function () { line.remove(); }, function () {});
    return {play: function () { reveal.play(); sweep.play(); }};
  }

  function countUp(el, delay) {
    var leaves = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*'))).filter(function (e) {
      return !e.children.length && /^\s*[\d.,]+\s*%?\s*$/.test(e.textContent);
    });
    leaves.forEach(function (leaf) {
      var text = leaf.textContent.trim();
      var m = text.match(/^([\d.,]+)(%?)$/);
      var target = parseFloat(m[1].replace(/,/g, ''));
      var decimals = (m[1].split('.')[1] || '').length;
      var comma = m[1].indexOf(',') >= 0;
      var start = null;
      var dur = 1600;
      setTimeout(function () {
        requestAnimationFrame(function tick(t) {
          if (start === null) start = t;
          var k = Math.min(1, (t - start) / dur);
          var v = target * (1 - Math.pow(2, -10 * k));
          if (k === 1) v = target;
          var s = v.toFixed(decimals);
          if (comma) s = Number(s).toLocaleString('en-US', {minimumFractionDigits: decimals});
          leaf.textContent = s + m[2];
          if (k < 1) requestAnimationFrame(tick);
        });
      }, delay);
    });
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        (groups.get(entry.target) || []).forEach(function (run) { run(); });
        groups.delete(entry.target);
        io.unobserve(entry.target);
      });
    },
    {rootMargin: '0px 0px -12% 0px'},
  );
  // The product page starts hidden behind the hero; layout (orbit offsets,
  // centre-out order) is only measurable once Explore reveals it.
  var product = document.getElementById('product');
  function start() {
    setupSections();
    groups.forEach(function (_, el) { io.observe(el); });
    startParallax();
  }
  if (product && product.hidden) {
    new MutationObserver(function (_, mo) {
      if (product.hidden) return;
      mo.disconnect();
      start();
    }).observe(product, {attributes: true, attributeFilter: ['hidden']});
  } else {
    start();
  }

  // App page and anything without a plan: varied fallbacks by element type.
  appPage();

  function appPage() {
    var setups = [
      ['.hero h1', 'track', 0, 0, 1500],
      ['.trio .phone.mid', 'surge', 300, 0, 1500],
      ['.trio .phone.side:first-child', 'fanL', 600, 0, 1500],
      ['.trio .phone.side:last-child', 'fanR', 600, 0, 1500],
      ['.cta h2', 'focus', 0, 0, 1500],
    ];
    setups.forEach(function (s) {
      var els = document.querySelectorAll(s[0]);
      els.forEach(function (el, i) {
        var a = settle(el.animate(frames(el, s[1], i), {duration: s[4] || 1100, delay: s[2] + i * s[3], easing: EASE, fill: 'both'}));
        a.pause();
        arm(el, function () { a.play(); });
        io.observe(el);
      });
    });
    // Feature rows alternate: phone tilts in from its side, copy slides the other way.
    document.querySelectorAll('.features .row, main > .wrap > .row').forEach(function (row, i) {
      var flip = row.classList.contains('flip');
      var phone = row.querySelector('.phone');
      var text = row.querySelector('.text');
      [[phone, flip ? 'fanR' : 'tilt3d', 0, 1600], [text, flip ? 'fromRight' : 'fromLeft', 200, 1200]].forEach(function (s) {
        if (!s[0]) return;
        var a = settle(s[0].animate(frames(s[0], s[1], i), {duration: s[3], delay: s[2], easing: EASE, fill: 'both'}));
        a.pause();
        arm(row, function () { a.play(); });
      });
      io.observe(row);
    });
  }

  // Background words drift sideways with the scroll for depth.
  function startParallax() {
    if (!parallax.length) return;
    var queued = false;
    function drift() {
      queued = false;
      var vh = window.innerHeight;
      parallax.forEach(function (p) {
        var r = p.section.getBoundingClientRect();
        var t = (vh - r.top) / (vh + r.height);
        if (t < -0.2 || t > 1.2) return;
        p.el.style.translate = ((t - 0.5) * p.amount).toFixed(1) + 'px 0';
      });
    }
    window.addEventListener('scroll', function () {
      if (!queued) requestAnimationFrame(drift);
      queued = true;
    }, {passive: true});
    drift();
  }

  progressLine();

  function progressLine() {
    var product = document.getElementById('product');
    var top = document.querySelector('.nb-top');
    if (!product || !top) return;
    var bar = document.createElement('div');
    bar.className = 'nb-progress';
    top.appendChild(bar);
    var queued = false;
    function update() {
      queued = false;
      if (product.hidden) return bar.style.setProperty('--progress', 0);
      var rect = product.getBoundingClientRect();
      var span = rect.height - window.innerHeight;
      var done = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 1;
      bar.style.setProperty('--progress', done.toFixed(4));
    }
    window.addEventListener('scroll', function () {
      if (!queued) requestAnimationFrame(update);
      queued = true;
    }, {passive: true});
    window.addEventListener('resize', update);
  }

  // Switching language gets its own page-turn transition (see motion.css).
  function tagLanguageSwitch() {
    window.addEventListener('pagereveal', function (e) {
      if (!e.viewTransition || !window.navigation || !navigation.activation || !navigation.activation.from) return;
      var from = new URL(navigation.activation.from.url).pathname;
      var to = new URL(navigation.activation.entry.url).pathname;
      var strip = function (p) { return p.replace(/^\/zh(\/|$)/, '/'); };
      if (from !== to && strip(from) === strip(to)) e.viewTransition.types.add('lang');
    });
  }
})();
