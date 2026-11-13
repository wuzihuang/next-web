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

export function readSelectedOptions(form) {
  return Array.from(form.querySelectorAll("[data-option-index]")).map(
    (field) => field.value
  );
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

function applyVariant(root, variant, form) {
  const state = cartStateForVariant(variant);
  const idInput = form.querySelector("[data-variant-id]");
  const status = form.querySelector("[data-product-status]");
  const button = form.querySelector("[data-add]");
  const price = root.querySelector("[data-product-price]");
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
    applyVariant(root, variant, form);
  };
  form.querySelectorAll("[data-option-index]").forEach((field) => {
    field.addEventListener("change", onChange);
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
