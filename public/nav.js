// Tags each page change with a View Transition type so motion.css can give
// it its own transition. Loaded blocking in <head>: pagereveal fires on the
// first render, before deferred scripts such as motion.js have run.
(function () {
  // Each kind of page change gets its own View Transition type (motion.css):
  // switching language, going to /app, going to the pricing page, or going
  // back to the product page.
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    // The Navigation API knows where we came from; the referrer is the
    // fallback when it does not.
    var act = window.navigation && navigation.activation;
    var src = act && act.from && act.from.url || document.referrer;
    if (!src || new URL(src).origin !== location.origin) return;
    var strip = function (p) { return p.replace(/^\/zh(\/|$)/, '/'); };
    var from = new URL(src).pathname;
    var to = location.pathname;
    if (from === to) return;
    var type = strip(from) === strip(to) ? 'lang'
      : /\/app\/$/.test(to) ? 'to-app'
      : /\/pricing\/$/.test(to) ? 'to-buy'
      : 'to-home';
    e.viewTransition.types.add(type);
  });
})();
