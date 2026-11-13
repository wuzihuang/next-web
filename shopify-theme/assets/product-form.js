export function findVariant(product, selectedOptions) {
  if (!product || !Array.isArray(product.variants)) {
    return null;
  }
  return (
    product.variants.find((variant) =>
      (variant.options || []).every((value, index) => value === selectedOptions[index])
    ) || null
  );
}

export function cartStateForVariant(variant) {
  if (!variant) {
    return { available: false, id: null, reason: "no_variant" };
  }
  if (!variant.available) {
    return { available: false, id: variant.id, reason: "sold_out" };
  }
  return { available: true, id: variant.id, reason: "ok" };
}

function pressedSwatch(field) {
  if (!field || typeof field.querySelector !== "function") {
    return null;
  }
  return (
    field.querySelector("[data-swatch].is-on") ||
    field.querySelector("[data-swatch][aria-checked='true']")
  );
}

export function readSelectedOptions(form) {
  return Array.from(form.querySelectorAll("[data-option-index]")).map((field) => {
    const pressed = pressedSwatch(field);
    if (pressed) {
      return pressed.getAttribute("data-swatch") || "";
    }
    if (typeof field.getAttribute === "function") {
      const selected = field.getAttribute("data-selected-value");
      if (selected) {
        return selected;
      }
    }
    return field.value || "";
  });
}

export function formatMoney(cents, format) {
  const amount = (Number(cents) / 100).toFixed(2);
  const pattern = format || "${{amount}}";
  return pattern
    .replace("{{amount}}", amount)
    .replace("{{amount_no_decimals}}", String(Math.round(Number(cents) / 100)));
}

function statusCopy(reason, root) {
  const sold = root.getAttribute("data-copy-sold-out") || "Sold out";
  const missing = root.getAttribute("data-copy-no-variant") || "This combination is not available.";
  if (reason === "sold_out") {
    return sold;
  }
  if (reason === "no_variant") {
    return missing;
  }
  return "";
}

function imageSrc(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value.src === "string") {
    return value.src;
  }
  if (value.preview_image) {
    return imageSrc(value.preview_image);
  }
  return null;
}

function fileName(url) {
  return String(url || "")
    .split("?")[0]
    .split("/")
    .pop();
}

export function featuredImageUrl(variant, product) {
  if (variant) {
    const fromVariant = imageSrc(variant.featured_image) || imageSrc(variant.featured_media);
    if (fromVariant) {
      return fromVariant;
    }
  }
  if (!product) {
    return null;
  }
  const fromProduct = imageSrc(product.featured_image) || imageSrc(product.featured_media);
  if (fromProduct) {
    return fromProduct;
  }
  if (Array.isArray(product.images)) {
    for (const image of product.images) {
      const src = imageSrc(image);
      if (src) {
        return src;
      }
    }
  }
  if (Array.isArray(product.media)) {
    for (const item of product.media) {
      if (!item) {
        continue;
      }
      if (item.media_type && item.media_type !== "image") {
        continue;
      }
      const src = imageSrc(item.preview_image) || imageSrc(item);
      if (src) {
        return src;
      }
    }
  }
  return null;
}

function featuredImageId(variant) {
  if (!variant) {
    return null;
  }
  if (variant.featured_image && variant.featured_image.id != null) {
    return String(variant.featured_image.id);
  }
  if (variant.featured_media && variant.featured_media.id != null) {
    return String(variant.featured_media.id);
  }
  return null;
}

function markThumbs(root, live, variant) {
  const featuredId = featuredImageId(variant);
  const liveName = fileName(live);
  root.querySelectorAll("[data-product-thumb]").forEach((thumb) => {
    const idMatch = featuredId && thumb.getAttribute("data-media-id") === featuredId;
    const src = thumb.getAttribute("data-src") || "";
    const srcMatch = Boolean(live && (src === live || fileName(src) === liveName));
    thumb.classList.toggle("is-on", Boolean(idMatch || srcMatch));
  });
}

function applyProductImage(root, variant, product) {
  const img = root.querySelector("[data-product-image]");
  const live = featuredImageUrl(variant, product);
  if (img && live) {
    img.src = live;
  }
  markThumbs(root, live, variant);
}

function syncSwatches(form, variant) {
  if (!variant || !Array.isArray(variant.options)) {
    return;
  }
  form.querySelectorAll("[data-option-index]").forEach((group, index) => {
    const wanted = variant.options[index];
    if (!wanted) {
      return;
    }
    group.setAttribute("data-selected-value", wanted);
    group.querySelectorAll("[data-swatch]").forEach((button) => {
      const on = button.getAttribute("data-swatch") === wanted;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-checked", on ? "true" : "false");
    });
  });
}

function applyVariant(root, variant, form, product) {
  const state = cartStateForVariant(variant);
  const idInput = form.querySelector("[data-variant-id]");
  const status = form.querySelector("[data-product-status]");
  const button = form.querySelector("[data-add]");
  const price = root.querySelector("[data-product-price]");
  applyProductImage(root, variant, product);
  syncSwatches(form, variant);
  if (idInput && state.id) {
    idInput.value = String(state.id);
  }
  if (price && variant && typeof variant.price === "number") {
    const money = formatMoney(variant.price, window.NB_MONEY_FORMAT);
    const currency = document.createElement("small");
    price.textContent = money + " ";
    currency.textContent = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || "";
    if (currency.textContent) {
      price.appendChild(currency);
    }
  }
  if (status) {
    status.textContent = statusCopy(state.reason, form);
  }
  if (button) {
    button.disabled = !state.available;
    const addLabel = form.getAttribute("data-copy-add") || "Add to cart";
    const unavailable = form.getAttribute("data-copy-unavailable") || "Unavailable";
    button.textContent = state.available ? addLabel : unavailable;
  }
}

function selectSwatch(group, button) {
  const value = button.getAttribute("data-swatch") || "";
  group.setAttribute("data-selected-value", value);
  group.querySelectorAll("[data-swatch]").forEach((el) => {
    const on = el === button;
    el.classList.toggle("is-on", on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  });
}

function bindQuantity(form) {
  const input = form.querySelector("[name='quantity']");
  if (!input) {
    return;
  }
  form.querySelectorAll("[data-qty]").forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.getAttribute("data-qty") || 0);
      const next = Math.max(1, Number(input.value || 1) + delta);
      input.value = String(next);
    });
  });
}

function bindProductForm(root) {
  const form = root.querySelector("[data-product-form]");
  const jsonNode = root.querySelector("[data-product-json]");
  if (!form || !jsonNode) {
    return;
  }
  let product;
  try {
    product = JSON.parse(jsonNode.textContent || "{}");
  } catch {
    return;
  }
  const onChange = () => {
    const variant = findVariant(product, readSelectedOptions(form));
    applyVariant(root, variant, form, product);
  };
  form.querySelectorAll("[data-option-index]").forEach((field) => {
    field.addEventListener("change", onChange);
  });
  form.querySelectorAll("[data-swatch]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest("[data-option-index]");
      if (group) {
        selectSwatch(group, button);
      }
      onChange();
    });
  });
  bindQuantity(form);
  root.querySelectorAll("[data-product-thumb]").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const img = root.querySelector("[data-product-image]");
      const src = thumb.getAttribute("data-src");
      if (img && src) {
        img.src = src;
      }
      root.querySelectorAll("[data-product-thumb]").forEach((other) => {
        other.classList.toggle("is-on", other === thumb);
      });
    });
  });
}

export async function bootProductForms() {
  document.querySelectorAll("[data-product-section]").forEach((root) => {
    bindProductForm(root);
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bootProductForms();
    });
  } else {
    bootProductForms();
  }
}
