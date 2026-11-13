import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cartStateForVariant,
  featuredImageUrl,
  findVariant,
  formatMoney,
  readSelectedOptions,
} from "../assets/product-form.js";

const product = {
  variants: [
    { id: 11, available: true, options: ["Cloud White"], price: 5999 },
    { id: 12, available: false, options: ["Charcoal Black"], price: 5999 },
  ],
};

describe("findVariant", () => {
  it("returns the matching variant", () => {
    const variant = findVariant(product, ["Cloud White"]);
    assert.equal(variant.id, 11);
  });

  it("returns null when the combination does not exist", () => {
    assert.equal(findVariant(product, ["Mist Weave"]), null);
  });
});

describe("cartStateForVariant", () => {
  it("marks a missing variant unavailable", () => {
    assert.deepEqual(cartStateForVariant(null), {
      available: false,
      id: null,
      reason: "no_variant",
    });
  });

  it("does not allow add-to-cart for a sold-out variant", () => {
    const state = cartStateForVariant(product.variants[1]);
    assert.equal(state.available, false);
    assert.equal(state.reason, "sold_out");
    assert.equal(state.id, 12);
  });

  it("allows add-to-cart when the variant is in stock", () => {
    const state = cartStateForVariant(product.variants[0]);
    assert.equal(state.available, true);
    assert.equal(state.reason, "ok");
  });
});

describe("formatMoney", () => {
  it("uses the shop money format without inventing a catalog amount", () => {
    assert.equal(formatMoney(1234, "${{amount}}"), "$12.34");
  });
});

describe("readSelectedOptions", () => {
  it("reads option fields in document order", () => {
    const form = {
      querySelectorAll() {
        return [{ value: "Cloud White" }, { value: "Mist Weave" }];
      },
    };
    assert.deepEqual(readSelectedOptions(form), ["Cloud White", "Mist Weave"]);
  });

  it("reads the pressed swatch card for a variant option group", () => {
    const group = {
      querySelector(selector) {
        if (String(selector).includes("data-swatch")) {
          return { getAttribute: (name) => (name === "data-swatch" ? "Charcoal Black" : null) };
        }
        return null;
      },
      getAttribute() {
        return "Cloud White · Mist Weave";
      },
    };
    const form = {
      querySelectorAll() {
        return [group];
      },
    };
    assert.deepEqual(readSelectedOptions(form), ["Charcoal Black"]);
  });
});

describe("featuredImageUrl", () => {
  it("prefers the variant featured image when Shopify media exists", () => {
    const url = featuredImageUrl(
      { featured_image: { src: "https://cdn.example/white.jpg" } },
      { featured_image: "https://cdn.example/product.jpg" }
    );
    assert.equal(url, "https://cdn.example/white.jpg");
  });

  it("falls through to product media when the variant has none", () => {
    const url = featuredImageUrl(
      { featured_image: null },
      { featured_image: null, images: ["https://cdn.example/product.jpg"] }
    );
    assert.equal(url, "https://cdn.example/product.jpg");
  });

  it("returns null when Shopify media is empty", () => {
    assert.equal(featuredImageUrl({ featured_image: null }, { images: [], media: [] }), null);
  });
});
