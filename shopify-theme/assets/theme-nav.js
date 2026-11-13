(function () {
  window.addEventListener("pagereveal", function (event) {
    if (!event.viewTransition) {
      return;
    }
    const act = window.navigation && window.navigation.activation;
    const src = (act && act.from && act.from.url) || document.referrer;
    if (!src) {
      return;
    }
    try {
      if (new URL(src).origin !== location.origin) {
        return;
      }
    } catch {
      return;
    }
    const from = new URL(src).pathname;
    const to = location.pathname;
    if (from === to) {
      return;
    }
    const strip = function (path) {
      return path.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, "");
    };
    let type = "to-home";
    if (strip(from) === strip(to)) {
      type = "lang";
    } else if (/\/pages\/app\/?$/.test(to)) {
      type = "to-app";
    } else if (/\/collections\//.test(to) || /\/products\//.test(to)) {
      type = "to-buy";
    }
    event.viewTransition.types.add(type);
  });
})();
