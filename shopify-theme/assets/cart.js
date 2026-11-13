async function addToCart(form) {
  const endpoint = (window.NB_ROUTES && window.NB_ROUTES.cart
    ? window.NB_ROUTES.cart.replace(/\/cart\/?$/, "")
    : "") + "/cart/add.js";
  const body = new FormData(form);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Accept: "application/json" },
    body,
  });
  if (!response.ok) {
    throw new Error("cart_add_failed");
  }
  return response.json();
}

async function handleProductSubmit(event) {
  const form = event.currentTarget;
  const button = form.querySelector("[data-add]");
  if (button && button.disabled) {
    event.preventDefault();
    return;
  }
  if (!window.fetch) {
    return;
  }
  event.preventDefault();
  try {
    await addToCart(form);
    const status = form.querySelector("[data-product-status]");
    if (status) {
      status.textContent = form.getAttribute("data-copy-added") || "Added to cart";
    }
    const countLinks = document.querySelectorAll('a[href*="/cart"]');
    countLinks.forEach((link) => {
      if (link.classList.contains("nb-view-cart")) {
        return;
      }
      const label = link.getAttribute("data-cart-label") || link.textContent.replace(/\s*\(\d+\)\s*$/, "");
      link.textContent = label;
    });
  } catch {
    form.submit();
  }
}

export async function bootCartForms() {
  document.querySelectorAll("[data-product-form]").forEach((form) => {
    form.addEventListener("submit", handleProductSubmit);
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bootCartForms();
    });
  } else {
    bootCartForms();
  }
}
