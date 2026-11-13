// Motion for nextbody.ai lives between sections, never inside them (the
// owner asked for as little in-section animation as possible, and no
// stacked-card scrolling). Some sections arrive with their own whole-section
// transition (ENTER), the rest simply scroll in, so no two transitions in a
// row look alike.
// Page-to-page transitions are View Transitions (motion.css), with a
// different one per destination (tagged by nav.js).
// Skipped entirely under reduced motion.
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var product = document.getElementById('product');
  if (product) {
    if (product.hidden) {
      new MutationObserver(function (_, mo) {
        if (product.hidden) return;
        mo.disconnect();
        reveal(product);
      }).observe(product, {attributes: true, attributeFilter: ['hidden']});
    } else {
      reveal(product);
    }
  }
  progressLine();

  // Whole-section transitions. Keyframes only touch the section box (clip,
  // position, scale, brightness), never what is inside it.
  var ENTER = {
    // a window that widens to the full section
    open: [{clipPath: 'inset(6% 10% 0 10%)', transform: 'translateY(64px)'}, {clipPath: 'inset(0 0 0 0)', transform: 'none'}],
    // drawn down from the top edge like a blind
    curtain: [{clipPath: 'inset(0 0 100% 0)'}, {clipPath: 'inset(0 0 0 0)'}],
    // slow zoom out from a cropped close-up
    zoom: [{clipPath: 'inset(8% 8% 8% 8%)', transform: 'scale(1.18)'}, {clipPath: 'inset(0 0 0 0)', transform: 'none'}],
    // wiped in from one side
    fromLeft: [{clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-6%)'}, {clipPath: 'inset(0 0 0 0)', transform: 'none'}],
    fromRight: [{clipPath: 'inset(0 0 0 100%)', transform: 'translateX(6%)'}, {clipPath: 'inset(0 0 0 0)', transform: 'none'}],
    // opens from a centre line outwards
    splitV: [{clipPath: 'inset(0 50% 0 50%)'}, {clipPath: 'inset(0 0 0 0)'}],
    splitH: [{clipPath: 'inset(50% 0 50% 0)'}, {clipPath: 'inset(0 0 0 0)'}],
    // a circle that grows from the middle
    iris: [{clipPath: 'circle(0% at 50% 50%)'}, {clipPath: 'circle(75% at 50% 50%)'}],
    // a slanted edge sweeping across
    diagonal: [{clipPath: 'polygon(0 0, 0 0, -40% 100%, -40% 100%)'}, {clipPath: 'polygon(0 0, 140% 0, 100% 100%, -40% 100%)'}],
    // lights coming up on a dark set
    lights: [{filter: 'brightness(0)', transform: 'scale(0.96)'}, {filter: 'brightness(1)', transform: 'none'}],
    // a plain, large rise
    rise: [{transform: 'translateY(160px)', opacity: 0}, {transform: 'none', opacity: 1}],
  };
  // Per artboard; sections that are not listed have no transition.
  var PLAN = {
    '3Y4-0': 'curtain',   // Classic Design
    '3U4-0': 'zoom',      // Light weave
    '3V9-0': 'fromLeft',  // colourway: Mist Weave
    '3UY-0': 'fromRight', // colourway: Ink Weave
    '3YA-0': 'splitV',    // strap close-ups
    '3T7-0': 'iris',      // IP68
    '3VV-0': 'lights',    // heart-rate sensor
    '3ZE-0': 'rise',      // sleep
    '43S-0': 'diagonal',  // hero
    '457-0': 'lights',    // body scan
    '3U0-0': 'open',      // sport
    '48S-0': 'rise',      // training load
    '4A2-0': 'splitH',    // new software
    '4BC-0': 'rise',      // MCP
  };
  var CLIPPED = /inset|circle|polygon/;

  function reveal(main) {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var name = PLAN[e.target.dataset.artboard];
        // A clip on a section much taller than the screen would play out
        // mostly off screen, so tall ones just rise.
        if (CLIPPED.test(JSON.stringify(ENTER[name])) && e.target.offsetHeight > window.innerHeight * 1.4) name = 'rise';
        var a = e.target.animate(ENTER[name], {
          duration: name === 'lights' ? 1400 : 1150,
          easing: name === 'curtain' || name === 'iris' ? 'cubic-bezier(0.65, 0, 0.35, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)',
        });
        a.finished.then(function () { a.cancel(); }, function () {});
      });
    }, {rootMargin: '0px 0px -15% 0px'});
    Array.prototype.forEach.call(main.querySelectorAll('section.ab, section.mb'), function (s) {
      if (s.offsetParent === null || !PLAN[s.dataset.artboard]) return;
      // Sections already on screen when the product opens stay put.
      if (s.getBoundingClientRect().top < window.innerHeight * 0.85) return;
      io.observe(s);
    });
  }

  function progressLine() {
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
})();
